# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.token import Token
from app.utils.security import create_access_token, verify_password, EXPIRE_MINUTES

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    사용자 로그인 후 Access Token 발급.
    sub 클레임에 user.id를 담아, 이후 권한 검증에서 정수로 변환 가능하도록 변경했습니다.
    """
    print("▶ [DEBUG] form_data.username:", form_data.username)
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 비밀번호 검증이 필요하다면 아래 주석을 해제하세요.
    # if not verify_password(form_data.password, user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )

    expires_delta = timedelta(minutes=EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},      # user.id를 문자열로 sub에 담습니다.
        expires_delta=expires_delta
    )
    print(f"▶ [DEBUG] Generated token for user.id={user.id}")
    return {"access_token": access_token, "token_type": "bearer"}
