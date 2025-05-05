from datetime import datetime, timedelta
from typing import Any, Union
from passlib.context import CryptContext
from jose import jwt

# 1) 암호 해싱을 위한 CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2) JWT 설정
SECRET_KEY = "YOUR_SECRET_KEY"            # 실제로는 .env 에 두세요
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def get_password_hash(password: str) -> str:
    """평문 비밀번호를 해시하여 돌려줍니다."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시가 일치하는지 확인합니다."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(
    data: dict[str, Any],
    expires_delta: Union[timedelta, None] = None
) -> str:
    """data 안에 담긴 정보를 JWT 토큰으로 인코딩하여 반환합니다."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
