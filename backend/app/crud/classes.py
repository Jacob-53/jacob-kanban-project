# app/crud/classes.py
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.classes import Class
from app.schemas.classes import ClassCreate

def get_class(db: Session, class_id: int) -> Optional[Class]:
    """특정 반을 ID로 조회합니다."""
    return db.query(Class).filter(Class.id == class_id).first()

def get_class_by_name(db: Session, name: str) -> Optional[Class]:
    """반 이름으로 조회합니다."""
    return db.query(Class).filter(Class.name == name).first()

def get_classes(db: Session, skip: int = 0, limit: int = 100) -> List[Class]:
    """모든 반을 조회합니다."""
    return db.query(Class).offset(skip).limit(limit).all()

def create_class(db: Session, class_data: ClassCreate) -> Class:
    """새로운 반을 생성합니다."""
    db_class = Class(name=class_data.name)
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_class(db: Session, class_id: int, class_data: ClassCreate) -> Optional[Class]:
    """반 정보를 업데이트합니다."""
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return None
    
    db_class.name = class_data.name
    db.commit()
    db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int) -> Optional[Class]:
    """반을 삭제합니다."""
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return None
    
    db.delete(db_class)
    db.commit()
    return db_class