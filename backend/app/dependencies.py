# backend/app/dependencies.py
from pathlib import Path
from dotenv import load_dotenv
import os

# 프로젝트 루트의 .env 파일을 직접 로드하여 환경 변수 확보
env_path = Path(__file__).parents[2] / ".env"
load_dotenv(env_path)

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from jose import JWTError, jwt

# OAuth2 Bearer 토큰 스키마
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# 환경 변수에서 JWT 설정 로드
# .env에 따라 다양한 이름으로 정의될 수 있는 시크릿 키를 모두 허용합니다.
SECRET_KEY = (
    os.getenv("JWT_SECRET_KEY") or
    os.getenv("JWT_SECRET") or
    os.getenv("SECRET_KEY")
)
if not SECRET_KEY:
    raise RuntimeError(
        "환경 변수에 JWT_SECRET_KEY, JWT_SECRET, SECRET_KEY 중 하나가 설정되어야 합니다."
    )
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 디버그: 환경 변수와 토큰 확인
    print(f"DEBUG SECRET_KEY starts with: {SECRET_KEY[:5]!r}")
    print(f"DEBUG ALGORITHM: {ALGORITHM!r}")
    print(f"DEBUG Received token: {token}")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG Decoded payload: {payload}")
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG JWTError: {e}")
        raise credentials_exception

    # sub가 숫자 문자열이면 ID로 조회, 아니면 username으로 조회
    try:
        user_id = int(sub)
        print(f"DEBUG Parsing sub as user_id: {user_id}")
        user = db.get(User, user_id)
    except (ValueError, TypeError):
        print(f"DEBUG Using sub as username: {sub}")
        user = db.query(User).filter(User.username == sub).first()

    if not user:
        print("DEBUG User not found in DB")
        raise credentials_exception
    print(f"DEBUG Authenticated user: {user.username} (id={user.id})")
    return user


def get_current_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
