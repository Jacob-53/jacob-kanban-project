from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import ClassCreate, ClassRead
from app.schemas.user import UserRead
from app.models import Class, User
from app.dependencies import get_current_teacher

router = APIRouter(
    prefix="/classes",
    tags=["classes"],
    dependencies=[Depends(get_current_teacher)]
)

@router.get("/", response_model=List[ClassRead])
def list_classes(db: Session = Depends(get_db)):
    """모든 반 목록 조회"""
    return db.query(Class).all()

@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db)
):
    """새로운 반 생성"""
    cls = Class(name=payload.name)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls

@router.get("/{class_id}", response_model=ClassRead)
def get_class(
    class_id: int,
    db: Session = Depends(get_db)
):
    """단일 반 조회"""
    cls = db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return cls

@router.put("/{class_id}", response_model=ClassRead)
def update_class(
    class_id: int,
    payload: ClassCreate,
    db: Session = Depends(get_db)
):
    """반 정보 수정"""
    cls = db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    cls.name = payload.name
    db.commit()
    db.refresh(cls)
    return cls

@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db)
):
    """반 삭제"""
    cls = db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    db.delete(cls)
    db.commit()
    return

@router.get("/{class_id}/users", response_model=List[UserRead])
def get_users_by_class(
    class_id: int,
    db: Session = Depends(get_db)
):
    """특정 반 학생 목록 조회"""
    return db.query(User).filter(User.class_id == class_id).all()
