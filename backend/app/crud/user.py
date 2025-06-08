# app/crud/user.py - 완전 버전
from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.user import User
from app.models.classes import Class
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """DB에서 username으로 User를 조회해 반환합니다."""
    return db.query(User).filter(User.username == username).first()

def get_user(db: Session, user_id: int) -> Optional[User]:
    """특정 사용자를 ID로 조회합니다."""
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """모든 사용자를 조회합니다."""
    return db.query(User).offset(skip).limit(limit).all()

def get_users_by_class(db: Session, class_id: int, skip: int = 0, limit: int = 100) -> List[User]:
    """특정 클래스의 사용자들을 조회합니다."""
    return db.query(User).filter(User.class_id == class_id).offset(skip).limit(limit).all()

def get_users_by_role(db: Session, role: str, skip: int = 0, limit: int = 100) -> List[User]:
    """특정 역할의 사용자들을 조회합니다."""
    return db.query(User).filter(User.role == role).offset(skip).limit(limit).all()

def get_teachers(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """모든 교사를 조회합니다."""
    return db.query(User).filter(User.is_teacher == True).offset(skip).limit(limit).all()

def get_students_by_class(db: Session, class_id: int, skip: int = 0, limit: int = 100) -> List[User]:
    """특정 반의 학생들만 조회합니다."""
    return db.query(User).filter(
        User.class_id == class_id,
        User.role == "student"
    ).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    """새로운 유저를 DB에 저장합니다."""
    hashed_pw = get_password_hash(user.password)
    
    # class_name 처리: class_name이 있으면 해당 반을 찾거나 생성
    class_id = None
    if user.class_name:
        # 기존 반 찾기
        existing_class = db.query(Class).filter(Class.name == user.class_name).first()
        if existing_class:
            class_id = existing_class.id
        else:
            # 새 반 생성
            new_class = Class(name=user.class_name)
            db.add(new_class)
            db.commit()
            db.refresh(new_class)
            class_id = new_class.id
    
    print(f"🔍 Creating user with role: {user.role} (type: {type(user.role)})")
    
    # User 생성
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pw,
        is_teacher=user.is_teacher,
        role=user.role,  # 이미 문자열이므로 그대로 사용
        class_id=class_id
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"✅ User created successfully: {db_user.username} (id={db_user.id}, role={db_user.role})")
        return db_user
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        raise

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    """사용자 정보를 업데이트합니다."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    
    # 업데이트할 필드들 처리
    update_data = user_update.model_dump(exclude_unset=True)  # Pydantic v2
    
    # 비밀번호 처리
    if 'password' in update_data:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
    
    # 필드 업데이트
    for field, value in update_data.items():
        if hasattr(db_user, field):
            setattr(db_user, field, value)
    
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