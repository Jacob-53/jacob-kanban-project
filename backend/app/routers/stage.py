# app/routers/stage.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.dependencies import get_current_user
from app.models.task import TaskStage
from app.schemas.stage import (
    StageMove, 
    StageConfigCreate, 
    StageConfigUpdate, 
    StageConfigSchema,
    TaskHistorySchema
)
from app.crud.stage import (
    move_task_stage,
    create_stage_config,
    get_stage_configs,
    update_stage_config,
    delete_stage_config,
    get_task_histories
)
from app.crud.task import get_task

router = APIRouter(
    prefix="/tasks",
    tags=["stages"],
)

# 1. 태스크 단계 이동 API
@router.put("/{task_id}/stage", response_model=dict)
def update_task_stage(
    task_id: int,
    stage_move: StageMove,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    태스크의 단계를 이동합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사이거나 자신의 태스크만 수정 가능)
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to move this task")
    
    # stage 값이 유효한지 확인
    if not any(stage_move.stage == stage.value for stage in TaskStage):
        raise HTTPException(status_code=400, detail=f"Invalid stage value. Valid values: {[stage.value for stage in TaskStage]}")
    
    # 단계 이동 실행
    result = move_task_stage(db, task_id, current_user.id, stage_move.stage, stage_move.comment)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to move task stage")
    
    return {
        "message": f"Task stage moved to {stage_move.stage}",
        "task_id": task_id,
        "new_stage": stage_move.stage,
        "previous_stage": result["history"].previous_stage,
        "time_spent": result["history"].time_spent
    }

# 2. 단계 설정 추가 API
@router.post("/{task_id}/stage-configs", response_model=StageConfigSchema)
def add_stage_config(
    task_id: int,
    config: StageConfigCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    태스크에 단계 설정을 추가합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사만 설정 가능)
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can configure stages")
    
    # task_id가 일치하는지 확인
    if config.task_id != task_id:
        config.task_id = task_id
    
    # 단계 설정 생성
    return create_stage_config(db, config)

# 3. 단계 설정 목록 조회 API
@router.get("/{task_id}/stage-configs", response_model=List[StageConfigSchema])
def read_stage_configs(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    태스크의 단계 설정 목록을 조회합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사이거나 자신의 태스크만 조회 가능)
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this task")
    
    return get_stage_configs(db, task_id)

# 4. 단계 설정 업데이트 API
@router.put("/{task_id}/stage-configs/{config_id}", response_model=StageConfigSchema)
def update_stage_config_endpoint(
    task_id: int,
    config_id: int,
    config: StageConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    단계 설정을 업데이트합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사만 수정 가능)
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can update stage configs")
    
    # 단계 설정 업데이트
    updated_config = update_stage_config(db, config_id, config)
    if not updated_config:
        raise HTTPException(status_code=404, detail="Stage config not found")
    
    return updated_config

# 5. 단계 설정 삭제 API
@router.delete("/{task_id}/stage-configs/{config_id}", response_model=StageConfigSchema)
def delete_stage_config_endpoint(
    task_id: int,
    config_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    단계 설정을 삭제합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사만 삭제 가능)
    if not current_user.is_teacher:
        raise HTTPException(status_code=403, detail="Only teachers can delete stage configs")
    
    # 단계 설정 삭제
    deleted_config = delete_stage_config(db, config_id)
    if not deleted_config:
        raise HTTPException(status_code=404, detail="Stage config not found")
    
    return deleted_config

# 6. 단계 이력 조회 API
@router.get("/{task_id}/histories", response_model=List[TaskHistorySchema])
def read_task_histories(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    태스크의 단계 이동 이력을 조회합니다.
    """
    # 태스크 존재 확인
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 권한 확인 (교사이거나 자신의 태스크만 조회 가능)
    if not current_user.is_teacher and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this task history")
    
    return get_task_histories(db, task_id)