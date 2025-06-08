# backend/app/crud/user.py
from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """
    DB에서 username으로 User를 조회해 반환합니다.
    로그인 검증 시 사용됩니다.
    """
    return db.query(User).filter(User.username == username).first()

def get_user(db: Session, user_id: int) -> Optional[User]:
    """특정 사용자를 ID로 조회합니다."""
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """모든 사용자를 조회합니다."""
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    """
    새로운 유저를 DB에 저장합니다.
    비밀번호는 해싱하여 저장하고, email 및 class_id 필드를 포함합니다.
    """
    hashed_pw = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pw,
        is_teacher=user.is_teacher,
        class_id=user.class_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    """
    사용자 정보를 업데이트합니다.
    username, email, is_teacher, class_id 등을 갱신합니다.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    db_user.username = user_update.username
    db_user.is_teacher = user_update.is_teacher
    # Optional 필드 업데이트
    if hasattr(user_update, 'email') and user_update.email is not None:
        db_user.email = user_update.email
    if hasattr(user_update, 'class_id') and user_update.class_id is not None:
        db_user.class_id = user_update.class_id
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> Optional[User]:
    """사용자를 삭제합니다."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user
