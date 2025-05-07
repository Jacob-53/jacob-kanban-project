from sqlalchemy.orm import Session
from app import models, schemas
from app.models import user as user_model
from app.schemas import user as user_schema
from app.utils import security
from app.utils.security import get_password_hash
from sqlalchemy.orm import Session
from app.models import User as UserModel

def get_user_by_username(db: Session, username: str) -> UserModel | None:
    """
    DB에서 username으로 User를 조회해 반환합니다.
    로그인 검증 시 사용됩니다.
    """
    return db.query(UserModel).filter(UserModel.username == username).first()

def create_user(db: Session, user: user_schema.UserCreate):
    db_user = user_model.User(username=user.username, is_teacher=user.is_teacher)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(user_model.User).filter(user_model.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(user_model.User).offset(skip).limit(limit).all()

# ✅ 업데이트 유저
def update_user(db: Session, user_id: int, user_update: user_schema.UserUpdate):
    db_user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if db_user is None:
        return None
    db_user.username = user_update.username
    db_user.is_teacher = user_update.is_teacher
    db.commit()
    db.refresh(db_user)
    return db_user

# ✅  삭제 유저
def delete_user(db: Session, user_id: int):
    db_user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if db_user is None:
        return None
    db.delete(db_user)
    db.commit()
    return db_user

# 유저생성시 비밀번호 해시 적용
def create_user(db: Session, user: user_schema.UserCreate):
    """
    새로운 유저를 DB에 저장합니다.
    비밀번호는 해싱하여 저장합니다.
    """
    hashed_pw = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        is_teacher=user.is_teacher,
        hashed_password=hashed_pw
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
