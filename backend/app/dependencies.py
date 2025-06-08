# backend/app/dependencies.py - 디버깅 강화
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from jose import JWTError, jwt
import os

# Docker Compose env_file로 주입된 환경변수 사용
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# 환경 변수에서 JWT 비밀키 및 알고리즘 로드
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("환경 변수 JWT_SECRET_KEY (또는 JWT_SECRET, SECRET_KEY)가 설정되지 않았습니다.")
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
    print(f"🔍 [DEPENDENCIES] SECRET_KEY starts with: {SECRET_KEY[:5]!r}")
    print(f"🔍 [DEPENDENCIES] ALGORITHM: {ALGORITHM!r}")
    print(f"🔍 [DEPENDENCIES] Received token: {token[:20]}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"🔍 [DEPENDENCIES] Decoded payload: {payload}")
        sub = payload.get("sub")
        if sub is None:
            print("❌ [DEPENDENCIES] No 'sub' field in payload")
            raise credentials_exception
        print(f"🔍 [DEPENDENCIES] Extracted sub: {sub}")
    except JWTError as e:
        print(f"❌ [DEPENDENCIES] JWTError: {e}")
        raise credentials_exception

    # sub가 숫자면 ID로, 아니면 username으로 조회
    user = None
    try:
        user_id = int(sub)
        print(f"🔍 [DEPENDENCIES] Parsing sub as user_id: {user_id}")
        user = db.get(User, user_id)
        if user:
            print(f"✅ [DEPENDENCIES] Found user by ID: {user.username} (id={user.id})")
        else:
            print(f"❌ [DEPENDENCIES] User not found by ID: {user_id}")
    except (ValueError, TypeError):
        print(f"🔍 [DEPENDENCIES] Using sub as username: {sub}")
        user = db.query(User).filter(User.username == sub).first()
        if user:
            print(f"✅ [DEPENDENCIES] Found user by username: {user.username} (id={user.id})")
        else:
            print(f"❌ [DEPENDENCIES] User not found by username: {sub}")

    if not user:
        print("❌ [DEPENDENCIES] User not found in DB")
        raise credentials_exception
        
    print(f"✅ [DEPENDENCIES] Final authenticated user: {user.username} (id={user.id})")
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