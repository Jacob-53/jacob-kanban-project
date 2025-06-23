# app/routers/task.py - WebSocket 실시간 브로드캐스트 추가
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.task import TaskSchema, TaskCreate, TaskUpdate, ClassTaskCreate
from app.schemas.stage import StageMove  # 단계 이동용 스키마 추가
from app.models.user import User
from app.models.task import Task
from app.crud.task import (
    create_task as create_task_crud,
    get_task,
    get_tasks,
    update_task as update_task_crud,
    delete_task as delete_task_crud,
)
from app.dependencies import get_current_user, get_current_teacher
from app.utils.websocket_manager import manager  # ✅ WebSocket 매니저 추가
from datetime import datetime

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)

# ✅ 개별 태스크 생성 (WebSocket 브로드캐스트 추가)
@router.post("/", response_model=TaskSchema)
async def create_task(  # async 추가
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """개별 학생에게 Task를 배정합니다."""
    
    if current_user.is_teacher:
        # 교사인 경우: user_id가 필수
        if not task.user_id:
            raise HTTPException(status_code=400, detail="user_id is required for teachers")
            
        # 배정하려는 학생이 같은 반인지 확인
        target_user = db.query(User).filter(User.id == task.user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # 같은 반 학생인지 확인
        if target_user.class_id != current_user.class_id:
            raise HTTPException(
                status_code=403, 
                detail="Can only assign tasks to students in your class"
            )
        
        # Task의 class_id를 자동으로 설정
        task.class_id = current_user.class_id
        
    else:
        # 학생인 경우: 자신의 user_id로 자동 설정
        task.user_id = current_user.id
        
        # 학생이 만드는 Task는 자신의 반으로 설정
        task.class_id = current_user.class_id
    
    # 태스크 생성
    created_task = create_task_crud(db=db, task=task)
    
    # ✅ WebSocket 브로드캐스트: 태스크 생성 알림
    try:
        # 태스크 소유자에게 알림
        await manager.send_personal_message({
            "type": "task_created",
            "task_id": created_task.id,
            "task": {
                "id": created_task.id,
                "title": created_task.title,
                "stage": created_task.stage,
                "user_id": created_task.user_id,
                "class_id": created_task.class_id,
                "is_class_task": created_task.is_class_task
            }
        }, str(created_task.user_id))
        
        # 교사들에게 알림 (반 전체 모니터링용)
        await manager.broadcast_to_teachers({
            "type": "task_created",
            "task_id": created_task.id,
            "user_id": created_task.user_id,
            "class_id": created_task.class_id,
            "title": created_task.title
        })
        
        print(f"✅ 태스크 생성 WebSocket 브로드캐스트 완료: {created_task.id}")
    except Exception as e:
        print(f"❌ 태스크 생성 WebSocket 브로드캐스트 실패: {e}")
        # WebSocket 실패해도 태스크 생성은 성공으로 처리
    
    return created_task

# ✅ 새로 추가: 태스크 단계 이동 API (핵심!)
@router.put("/{task_id}/stage", response_model=dict)
async def move_task_stage(  # async 추가
    task_id: int,
    stage_move: StageMove,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """태스크의 단계를 이동합니다."""
    
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인: 교사는 자신의 반 태스크, 학생은 자신의 태스크만
    if current_user.is_teacher:
        if task.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Not allowed to move this task")
    else:
        if task.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed to move this task")
    
    # 유효한 단계인지 확인
    from app.models.task import TaskStage
    valid_stages = [stage.value for stage in TaskStage]
    if stage_move.stage not in valid_stages:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid stage. Valid stages: {valid_stages}"
        )
    
    # 이전 단계 저장
    previous_stage = task.stage
    
    # 단계 이동 수행
    task.stage = stage_move.stage
    task.current_stage_started_at = datetime.utcnow()
    
    # 완료 단계인 경우
    if stage_move.stage == TaskStage.DONE:
        task.completed_at = datetime.utcnow()
    
    # 데이터베이스 저장
    db.commit()
    db.refresh(task)
    
    # ✅ WebSocket 브로드캐스트: 태스크 단계 변경 알림 (핵심!)
    try:
        # 모든 관련자에게 실시간 브로드캐스트
        broadcast_data = {
            "type": "task_stage_changed",
            "task_id": task.id,
            "user_id": task.user_id,
            "class_id": task.class_id,
            "previous_stage": previous_stage,
            "new_stage": task.stage,
            "changed_by": current_user.id,
            "changed_by_name": current_user.username,
            "comment": stage_move.comment,
            "timestamp": datetime.utcnow().isoformat(),
            "task": {
                "id": task.id,
                "title": task.title,
                "stage": task.stage,
                "user_id": task.user_id,
                "current_stage_started_at": task.current_stage_started_at.isoformat() if task.current_stage_started_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None
            }
        }
        
        # 1. 태스크 소유자에게 알림
        await manager.send_personal_message(broadcast_data, str(task.user_id))
        
        # 2. 교사들에게 알림 (반 전체 모니터링용)
        await manager.broadcast_to_teachers(broadcast_data)
        
        # 3. 같은 반 모든 학생들에게 알림 (실시간 칸반 보드 동기화)
        if task.class_id:
            # 같은 반 모든 사용자 조회
            class_users = db.query(User).filter(User.class_id == task.class_id).all()
            
            for user in class_users:
                if user.id != current_user.id:  # 본인 제외
                    await manager.send_personal_message(broadcast_data, str(user.id))
        
        print(f"✅ 태스크 단계 이동 WebSocket 브로드캐스트 완료: {task.id} ({previous_stage} → {task.stage})")
        
    except Exception as e:
        print(f"❌ 태스크 단계 이동 WebSocket 브로드캐스트 실패: {e}")
        # WebSocket 실패해도 단계 이동은 성공으로 처리
    
    # 응답 반환
    return {
        "message": f"Task stage moved to {task.stage}",
        "task_id": task.id,
        "previous_stage": previous_stage,
        "new_stage": task.stage,
        "changed_by": current_user.username,
        "comment": stage_move.comment
    }

# ✅ 새로 추가: 반 전체에 Task 배정 (교사만 가능, WebSocket 브로드캐스트 추가)
@router.post("/class-task", response_model=List[TaskSchema])
async def create_class_task(  # async 추가
    class_task: ClassTaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher),  # 교사만 가능
):
    """반 전체 학생들에게 동일한 Task를 배정합니다."""
    
    # 교사가 해당 반의 담당인지 확인
    if current_user.class_id != class_task.class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only assign tasks to your own class"
        )
    
    # 해당 반의 모든 학생 조회
    students = db.query(User).filter(
        User.class_id == class_task.class_id,
        User.is_teacher == False
    ).all()
    
    if not students:
        raise HTTPException(
            status_code=404, 
            detail="No students found in this class"
        )
    
    # 각 학생에게 Task 생성
    created_tasks = []
    for student in students:
        task_data = TaskCreate(
            title=class_task.title,
            description=class_task.description,
            stage=class_task.stage,
            expected_time=class_task.expected_time,
            user_id=student.id,
            class_id=class_task.class_id,
            is_class_task=True  # 반 과제임을 표시
        )
        created_task = create_task_crud(db=db, task=task_data)
        created_tasks.append(created_task)
    
    # ✅ WebSocket 브로드캐스트: 반 전체 과제 생성 알림
    try:
        # 각 학생에게 개별 알림
        for task in created_tasks:
            await manager.send_personal_message({
                "type": "class_task_assigned",
                "task_id": task.id,
                "class_id": task.class_id,
                "title": task.title,
                "assigned_by": current_user.username,
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "stage": task.stage,
                    "user_id": task.user_id,
                    "is_class_task": True
                }
            }, str(task.user_id))
        
        # 교사들에게 반 과제 생성 알림
        await manager.broadcast_to_teachers({
            "type": "class_task_created",
            "class_id": class_task.class_id,
            "title": class_task.title,
            "created_by": current_user.username,
            "student_count": len(created_tasks)
        })
        
        print(f"✅ 반 전체 과제 생성 WebSocket 브로드캐스트 완료: {len(created_tasks)}개")
        
    except Exception as e:
        print(f"❌ 반 전체 과제 생성 WebSocket 브로드캐스트 실패: {e}")
    
    return created_tasks

# ✅ 태스크 목록 조회 (기존 권한 체크 유지)
@router.get("/", response_model=List[TaskSchema])
def read_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """사용자별로 볼 수 있는 Task 목록을 조회합니다."""
    
    if current_user.is_teacher:
        # 교사: 자신이 담당하는 반의 Task만 조회
        if current_user.class_id:
            tasks = db.query(Task).filter(
                Task.class_id == current_user.class_id
            ).offset(skip).limit(limit).all()
        else:
            # 반이 배정되지 않은 교사는 빈 목록
            tasks = []
    else:
        # 학생: 자신의 Task만 조회
        tasks = db.query(Task).filter(
            Task.user_id == current_user.id
        ).offset(skip).limit(limit).all()
    
    return tasks

# ✅ 새로 추가: 특정 반의 Task 목록 조회
@router.get("/class/{class_id}", response_model=List[TaskSchema])
def read_class_tasks(
    class_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """특정 반의 모든 Task를 조회합니다."""
    
    # 권한 체크: 교사는 자신의 반만, 학생은 자신의 반만
    if current_user.class_id != class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only view tasks from your own class"
        )
    
    tasks = db.query(Task).filter(Task.class_id == class_id).all()
    
    # 학생인 경우 자신의 Task만 필터링
    if not current_user.is_teacher:
        tasks = [t for t in tasks if t.user_id == current_user.id]
    
    return tasks

# ✅ 특정 태스크 조회 (기존 권한 체크 유지)
@router.get("/{task_id}", response_model=TaskSchema)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 교사는 자신의 반 Task, 학생은 자신의 Task만
    if current_user.is_teacher:
        if task.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        if task.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed")
    
    return task

# ✅ 태스크 업데이트 (WebSocket 브로드캐스트 추가)
@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(  # async 추가
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 체크: 교사는 자신의 반 Task, 학생은 자신의 Task만
    if current_user.is_teacher:
        if existing.class_id != current_user.class_id:
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        if existing.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed")
    
    # 태스크 업데이트
    updated_task = update_task_crud(db, task_id, task)
    
    # ✅ WebSocket 브로드캐스트: 태스크 업데이트 알림
    try:
        await manager.send_task_update(
            task_id=updated_task.id,
            user_id=str(updated_task.user_id),
            update_type="task_updated",
            data={
                "task": {
                    "id": updated_task.id,
                    "title": updated_task.title,
                    "description": updated_task.description,
                    "stage": updated_task.stage,
                    "expected_time": updated_task.expected_time
                },
                "updated_by": current_user.username
            }
        )
        print(f"✅ 태스크 업데이트 WebSocket 브로드캐스트 완료: {updated_task.id}")
    except Exception as e:
        print(f"❌ 태스크 업데이트 WebSocket 브로드캐스트 실패: {e}")
    
    return updated_task

# ✅ 태스크 삭제 (WebSocket 브로드캐스트 추가)
@router.delete("/{task_id}", response_model=TaskSchema)
async def delete_task(  # async 추가
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher),  # 교사만 가능
):
    existing = get_task(db, task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 자신의 반 Task만 삭제 가능
    if existing.class_id != current_user.class_id:
        raise HTTPException(
            status_code=403, 
            detail="Can only delete tasks from your own class"
        )
    
    # 삭제 전 정보 저장
    deleted_task_info = {
        "id": existing.id,
        "title": existing.title,
        "user_id": existing.user_id,
        "class_id": existing.class_id
    }
    
    # 태스크 삭제
    deleted_task = delete_task_crud(db, task_id)
    
    # ✅ WebSocket 브로드캐스트: 태스크 삭제 알림
    try:
        # 태스크 소유자에게 알림
        await manager.send_personal_message({
            "type": "task_deleted",
            "task_id": deleted_task_info["id"],
            "title": deleted_task_info["title"],
            "deleted_by": current_user.username
        }, str(deleted_task_info["user_id"]))
        
        # 같은 반 교사들에게 알림
        await manager.broadcast_to_teachers({
            "type": "task_deleted",
            "task_id": deleted_task_info["id"],
            "title": deleted_task_info["title"],
            "class_id": deleted_task_info["class_id"],
            "deleted_by": current_user.username
        })
        
        print(f"✅ 태스크 삭제 WebSocket 브로드캐스트 완료: {deleted_task_info['id']}")
    except Exception as e:
        print(f"❌ 태스크 삭제 WebSocket 브로드캐스트 실패: {e}")
    
    return deleted_task