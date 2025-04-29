from sqlalchemy.orm import Session
from app.models import user as user_model
from app.schemas import user as user_schema

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

