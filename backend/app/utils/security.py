# 비밀번호 해싱 및 검증을 위한 유틸 함수
from passlib.context import CryptContext

# bcrypt 알고리즘을 사용하는 암호화 컨텍스트 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    평문 비밀번호를 bcrypt 알고리즘으로 해싱하여 반환합니다.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    사용자가 입력한 평문 비밀번호와 저장된 해시 비밀번호가 일치하는지 확인합니다.
    """
    return pwd_context.verify(plain_password, hashed_password)
