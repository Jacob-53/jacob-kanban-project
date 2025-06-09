# app/utils/security.py
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# 수정: tokenUrl을 실제 경로와 일치하도록 수정 ("/token" -> "/auth/token")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(pw):
    return pwd_context.hash(pw)

def authenticate_user(db: Session, username: str, password: str):
    # 순환 참조 방지: 여기서 import
    from app.crud.user import get_user_by_username
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    # 디버깅: 토큰 생성 시 값 출력
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"▶ [DEBUG] Created token payload: {to_encode}")
    print(f"▶ [DEBUG] SECRET_KEY starts with: {SECRET_KEY[:5] if SECRET_KEY else 'None'}")
    return encoded

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 디버깅: 토큰 디코딩 과정 출력
        print(f"▶ [DEBUG] Trying to decode token starting with: {token[:10] if token else 'None'}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"▶ [DEBUG] Token decoded successfully: {payload}")
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # 🔧 수정: user_id로 사용자 검색 (username이 아님)
        try:
            user_id = int(user_id)  # 문자열을 정수로 변환
        except (ValueError, TypeError):
            print(f"▶ [DEBUG] Invalid user_id format: {user_id}")
            raise credentials_exception
            
    except JWTError as e:
        # 디버깅: 예외 발생 시 상세 정보 출력
        print(f"▶ [DEBUG] JWT decode error: {str(e)}")
        raise credentials_exception
    
    # 🔧 수정: ID로 사용자 검색
    from app.crud.user import get_user  # get_user_by_username 대신 get_user 사용
    user = get_user(db, user_id)
    if user is None:
        print(f"▶ [DEBUG] User not found with ID: {user_id}")
        raise credentials_exception
    
    print(f"▶ [DEBUG] User found: {user.username} (ID: {user.id})")
    return user