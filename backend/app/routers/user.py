# backend/app/routers/user.py - dependencies.py의 get_current_user 사용
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.crud.user import (
    create_user as create_user_crud,
    get_user,
    get_users,
    update_user as update_user_crud,
    delete_user as delete_user_crud
)
# ✅ dependencies.py에서 가져오기 (security.py 대신)
from app.dependencies import get_current_user, get_current_teacher

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# 회원가입은 공개
@router.post("/", response_model=UserRead)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user_crud(db=db, user=user)

# ✅ /users/me 엔드포인트 - dependencies.py의 get_current_user 사용
@router.get("/me", response_model=UserRead)
def read_users_me(current_user = Depends(get_current_user)):
    """현재 로그인한 사용자의 정보를 반환합니다."""
    print(f"✅ /users/me - 인증된 사용자: {current_user.username} (id: {current_user.id})")
    return current_user

# 유저 전체 조회 (교사 권한 필요)
@router.get("/", response_model=list[UserRead])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher)  # dependencies.py에서 가져온 함수
):
    return get_users(db, skip=skip, limit=limit)

# 특정 유저 조회
@router.get("/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # dependencies.py에서 가져온 함수
):
    # 교사이거나 자신의 정보만 조회 가능
    if not current_user.is_teacher and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this user")
    
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# 사용자 정보 업데이트
@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # dependencies.py에서 가져온 함수
):
    # 교사이거나 자신의 정보만 수정 가능
    if not current_user.is_teacher and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this user")
    
    db_user = update_user_crud(db, user_id, user_update)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# 사용자 삭제 (교사만 가능)
@router.delete("/{user_id}", response_model=UserRead)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher)  # dependencies.py에서 가져온 함수
):
    db_user = delete_user_crud(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user