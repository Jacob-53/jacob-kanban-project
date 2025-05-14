from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import User as UserSchema, UserCreate
from app.crud.user import (
    create_user as create_user_crud,
    get_user,
    get_users,
)
from app.utils.security import get_current_user  # ← 추가

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# 👉 회원가입은 공개
@router.post("/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user_crud(db=db, user=user)

# 👉 유저 전체 조회(관리자/교사 권한이 필요하다면 여기에 추가 검사)
@router.get("/", response_model=list[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    return get_users(db, skip=skip, limit=limit)

# 👉 내 정보 조회
@router.get("/me", response_model=UserSchema)
def read_users_me(current_user = Depends(get_current_user)):
    return current_user

# 👉 특정 유저 조회
@router.get("/{user_id}", response_model=UserSchema)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # ← 인증 강제
):
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user