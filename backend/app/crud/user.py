from sqlalchemy.orm import Session
from app.models import User  # 직접 User 모델 임포트
from app.schemas import user as user_schema
from app.utils.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> User | None:
    """
    DB에서 username으로 User를 조회해 반환합니다.
    로그인 검증 시 사용됩니다.
    """
    return db.query(User).filter(User.username == username).first()

def get_user(db: Session, user_id: int):
    """특정 사용자를 ID로 조회합니다."""
    return db.query(User).filter(User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    """모든 사용자를 조회합니다."""
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: user_schema.UserCreate):
    """
    새로운 유저를 DB에 저장합니다.
    비밀번호는 해싱하여 저장합니다.
    """
    hashed_pw = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        is_teacher=user.is_teacher,
        hashed_password=hashed_pw
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: user_schema.UserUpdate):
    """사용자 정보를 업데이트합니다."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        return None
    db_user.username = user_update.username
    db_user.is_teacher = user_update.is_teacher
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    """사용자를 삭제합니다."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        return None
    db.delete(db_user)
    db.commit()
    return db_user