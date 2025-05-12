# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User
from app.schemas.token import Token
# 수정: 올바른 경로에서 security 모듈 임포트
from app.utils.security import create_access_token, verify_password, EXPIRE_MINUTES

# 수정: 라우터에 prefix 추가 (main.py와 일치하도록)
router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

# 로그인 API: 토큰 발급
@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    print("▶ [DEBUG] form_data.username:", form_data.username)
    # 비밀번호 로그는 보안상 제거하는 것이 좋습니다
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 수정: 실제 비밀번호 검증 추가 (선택적)
    # if not verify_password(form_data.password, user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    
    # 토큰 만료 시간 설정
    expires_delta = timedelta(minutes=EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=expires_delta
    )
    print(f"▶ [DEBUG] Generated token for {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}