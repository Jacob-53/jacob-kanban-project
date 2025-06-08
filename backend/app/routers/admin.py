# app/routers/admin.py - 관리자 전용 API 엔드포인트
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import (
    get_current_admin, 
    get_current_super_admin,
    check_user_management_permission,
    check_class_management_permission
)
from app.schemas.user import UserRead, UserAdmin, UserUpdate
from app.schemas.classes import ClassRead, ClassCreate, ClassWithStudentCount
from app.crud.user import (
    get_users, get_user, update_user, delete_user,
    get_users_by_class, get_users_by_role, get_teachers
)
from app.crud.classes import (
    get_classes, get_class, create_class, update_class, delete_class
)
from app.models.user import User
from app.models.classes import Class

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)]  # 모든 엔드포인트에 관리자 권한 필요
)

# ✅ 1. 사용자-반 배정 관리 API들

@router.get("/users", response_model=List[UserAdmin])
def get_all_users_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    role: Optional[str] = Query(None, regex="^(admin|teacher|student)$"),
    class_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    관리자용 사용자 목록 조회 (상세 정보 포함)
    - role: 특정 역할 필터링
    - class_id: 특정 반 필터링
    """
    if class_id:
        users = get_users_by_class(db, class_id, skip, limit)
    elif role:
        users = get_users_by_role(db, role, skip, limit)
    else:
        users = get_users(db, skip, limit)
    
    # 관리자용 상세 정보 포함하여 반환
    result = []
    for user in users:
        class_name = None
        if user.class_id:
            user_class = get_class(db, user.class_id)
            class_name = user_class.name if user_class else None
        
        result.append(UserAdmin(
            id=user.id,
            username=user.username,
            email=user.email,
            is_teacher=user.is_teacher,
            role=user.role,
            class_id=user.class_id,
            class_name=class_name,
            created_at=str(user.created_at) if hasattr(user, 'created_at') else None
        ))
    
    return result

@router.put("/users/{user_id}/assign-class", response_model=UserRead)
def assign_user_to_class(
    user_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """사용자를 특정 반에 배정"""
    # 사용자 존재 확인
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 반 존재 확인
    target_class = get_class(db, class_id)
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # 사용자 반 배정
    user_update = UserUpdate(class_id=class_id)
    updated_user = update_user(db, user_id, user_update)
    
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to assign user to class")
    
    return UserRead(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        is_teacher=updated_user.is_teacher,
        role=updated_user.role,
        class_id=updated_user.class_id,
        class_name=target_class.name
    )

@router.put("/users/{user_id}/remove-class", response_model=UserRead)
def remove_user_from_class(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """사용자를 반에서 제거"""
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_update = UserUpdate(class_id=None)
    updated_user = update_user(db, user_id, user_update)
    
    return UserRead(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        is_teacher=updated_user.is_teacher,
        role=updated_user.role,
        class_id=None,
        class_name=None
    )

@router.put("/users/{user_id}/role", response_model=UserRead)
def change_user_role(
    user_id: int,
    new_role: str = Query(..., regex="^(admin|teacher|student)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_super_admin)  # 슈퍼 관리자만 가능
):
    """사용자 역할 변경 (슈퍼 관리자만 가능)"""
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 역할에 따른 is_teacher 플래그 자동 조정
    is_teacher = new_role == "teacher"
    
    user_update = UserUpdate(role=new_role, is_teacher=is_teacher)
    updated_user = update_user(db, user_id, user_update)
    
    class_name = None
    if updated_user.class_id:
        user_class = get_class(db, updated_user.class_id)
        class_name = user_class.name if user_class else None
    
    return UserRead(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        is_teacher=updated_user.is_teacher,
        role=updated_user.role,
        class_id=updated_user.class_id,
        class_name=class_name
    )

# ✅ 2. 교사 승인 관리 API들

@router.get("/teachers/pending", response_model=List[UserAdmin])
def get_pending_teachers(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """승인 대기 중인 교사 목록 조회"""
    # is_teacher=True이지만 role이 student인 사용자들 (승인 대기 상태)
    pending_teachers = db.query(User).filter(
        User.is_teacher == True,
        User.role == "student"
    ).all()
    
    result = []
    for user in pending_teachers:
        class_name = None
        if user.class_id:
            user_class = get_class(db, user.class_id)
            class_name = user_class.name if user_class else None
        
        result.append(UserAdmin(
            id=user.id,
            username=user.username,
            email=user.email,
            is_teacher=user.is_teacher,
            role=user.role,
            class_id=user.class_id,
            class_name=class_name
        ))
    
    return result

@router.post("/teachers/{user_id}/approve", response_model=UserRead)
def approve_teacher(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """교사 승인"""
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_teacher:
        raise HTTPException(status_code=400, detail="User is not registered as teacher")
    
    user_update = UserUpdate(role="teacher")
    updated_user = update_user(db, user_id, user_update)
    
    class_name = None
    if updated_user.class_id:
        user_class = get_class(db, updated_user.class_id)
        class_name = user_class.name if user_class else None
    
    return UserRead(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        is_teacher=updated_user.is_teacher,
        role=updated_user.role,
        class_id=updated_user.class_id,
        class_name=class_name
    )

@router.post("/teachers/{user_id}/reject", response_model=UserRead)
def reject_teacher(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """교사 승인 거부 (일반 학생으로 전환)"""
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_update = UserUpdate(is_teacher=False, role="student")
    updated_user = update_user(db, user_id, user_update)
    
    class_name = None
    if updated_user.class_id:
        user_class = get_class(db, updated_user.class_id)
        class_name = user_class.name if user_class else None
    
    return UserRead(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        is_teacher=updated_user.is_teacher,
        role=updated_user.role,
        class_id=updated_user.class_id,
        class_name=class_name
    )

@router.get("/teachers", response_model=List[UserAdmin])
def get_all_teachers(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """모든 교사 목록 조회"""
    teachers = get_teachers(db)
    
    result = []
    for teacher in teachers:
        class_name = None
        if teacher.class_id:
            teacher_class = get_class(db, teacher.class_id)
            class_name = teacher_class.name if teacher_class else None
        
        result.append(UserAdmin(
            id=teacher.id,
            username=teacher.username,
            email=teacher.email,
            is_teacher=teacher.is_teacher,
            role=teacher.role,
            class_id=teacher.class_id,
            class_name=class_name
        ))
    
    return result

# ✅ 3. 반 관리 API들

@router.get("/classes", response_model=List[ClassWithStudentCount])
def get_all_classes_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """관리자용 반 목록 조회 (학생 수 포함)"""
    classes = get_classes(db)
    
    result = []
    for cls in classes:
        # 해당 반의 학생 수 계산
        student_count = db.query(User).filter(
            User.class_id == cls.id,
            User.role == "student"
        ).count()
        
        result.append(ClassWithStudentCount(
            id=cls.id,
            name=cls.name,
            created_at=cls.created_at,
            updated_at=cls.updated_at,
            student_count=student_count
        ))
    
    return result

@router.post("/classes", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class_admin(
    class_data: ClassCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """새로운 반 생성"""
    try:
        new_class = create_class(db, class_data)
        return new_class
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Class name already exists")
        raise HTTPException(status_code=500, detail="Failed to create class")

@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class_admin(
    class_id: int,
    force: bool = Query(False, description="Force delete even if class has students"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """반 삭제"""
    target_class = get_class(db, class_id)
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # 해당 반에 학생이 있는지 확인
    student_count = db.query(User).filter(User.class_id == class_id).count()
    
    if student_count > 0 and not force:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete class with {student_count} students. Use force=true to delete anyway."
        )
    
    # 강제 삭제인 경우 학생들의 class_id를 NULL로 설정
    if force and student_count > 0:
        db.query(User).filter(User.class_id == class_id).update({User.class_id: None})
    
    delete_class(db, class_id)

# ✅ 4. 시스템 관리 API들

@router.get("/stats/overview")
def get_system_overview(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """시스템 전체 통계 개요"""
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_teachers = db.query(User).filter(User.role == "teacher").count()
    total_admins = db.query(User).filter(User.role == "admin").count()
    total_classes = db.query(Class).count()
    
    pending_teachers = db.query(User).filter(
        User.is_teacher == True,
        User.role == "student"
    ).count()
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_admins": total_admins,
        "total_classes": total_classes,
        "pending_teacher_approvals": pending_teachers,
        "users_without_class": db.query(User).filter(User.class_id.is_(None)).count()
    }

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_super_admin)  # 슈퍼 관리자만 가능
):
    """사용자 삭제 (슈퍼 관리자만 가능)"""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    delete_user(db, user_id)