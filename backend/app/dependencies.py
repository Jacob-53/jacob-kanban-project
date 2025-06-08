# app/dependencies.py - String 기반 권한 체계 (개선 버전)
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from jose import JWTError, jwt
import os
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# ✅ 환경 변수 처리 개선
SECRET_KEY = (
    os.getenv("JWT_SECRET_KEY") or 
    os.getenv("JWT_SECRET") or 
    os.getenv("SECRET_KEY") or
    "fallback-secret-key-for-development"  # 개발용 fallback
)

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# 프로덕션에서는 SECRET_KEY가 반드시 설정되어야 함
if not any([os.getenv("JWT_SECRET_KEY"), os.getenv("JWT_SECRET"), os.getenv("SECRET_KEY")]):
    print("⚠️  [WARNING] JWT Secret key not found in environment variables. Using fallback key for development.")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """현재 인증된 사용자 정보 반환"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # JWT 토큰 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        
        if sub is None:
            print("❌ [AUTH] No 'sub' field in JWT payload")
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ [AUTH] JWT decode error: {e}")
        raise credentials_exception

    # 사용자 조회 (ID 또는 username으로)
    user = _find_user_by_sub(db, sub)
    
    if not user:
        print(f"❌ [AUTH] User not found for sub: {sub}")
        raise credentials_exception
        
    return user

def _find_user_by_sub(db: Session, sub: str) -> Optional[User]:
    """sub 값으로 사용자 조회 (ID 또는 username)"""
    # 먼저 ID로 시도
    try:
        user_id = int(sub)
        user = db.get(User, user_id)
        if user:
            print(f"✅ [AUTH] Found user by ID: {user.username} (role={user.role})")
            return user
    except (ValueError, TypeError):
        pass
    
    # ID가 아니면 username으로 조회
    user = db.query(User).filter(User.username == sub).first()
    if user:
        print(f"✅ [AUTH] Found user by username: {user.username} (role={user.role})")
        return user
    
    return None

# ✅ 권한 체크 함수들 (String 기반)

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """관리자 권한 체크"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required"
        )
    return current_user

def get_current_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    """교사 권한 체크 (is_teacher 또는 role=teacher)"""
    is_teacher_by_role = current_user.role == "teacher"
    is_teacher_by_flag = current_user.is_teacher
    
    if not (is_teacher_by_role or is_teacher_by_flag):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher privileges required"
        )
    return current_user

def get_current_teacher_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """교사 또는 관리자 권한 체크"""
    allowed_roles = ["teacher", "admin"]
    has_teacher_flag = current_user.is_teacher
    
    if current_user.role not in allowed_roles and not has_teacher_flag:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or Administrator privileges required"
        )
    return current_user

def get_current_student(
    current_user: User = Depends(get_current_user)
) -> User:
    """학생 권한 체크"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required"
        )
    return current_user

def get_current_student_or_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    """학생 또는 교사 권한 체크"""
    allowed_roles = ["student", "teacher"]
    has_teacher_flag = current_user.is_teacher
    
    if current_user.role not in allowed_roles and not has_teacher_flag:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student or Teacher privileges required"
        )
    return current_user

# ✅ 추가: 자원 소유자 또는 관리자 권한 체크
def check_resource_owner_or_admin(
    current_user: User,
    resource_user_id: int
) -> bool:
    """리소스 소유자이거나 관리자인지 확인"""
    is_owner = current_user.id == resource_user_id
    is_admin = current_user.role == "admin"
    return is_owner or is_admin

def check_resource_owner_or_teacher(
    current_user: User,
    resource_user_id: int
) -> bool:
    """리소스 소유자이거나 교사인지 확인"""
    is_owner = current_user.id == resource_user_id
    is_teacher = current_user.role == "teacher" or current_user.is_teacher
    return is_owner or is_teacher

# ✅ 추가: 클래스 멤버십 체크 (향후 확장용)
def check_same_class_or_teacher(
    current_user: User,
    target_user: User
) -> bool:
    """같은 클래스이거나 교사인지 확인"""
    is_teacher = current_user.role == "teacher" or current_user.is_teacher
    is_admin = current_user.role == "admin"
    same_class = (
        current_user.class_id is not None and 
        current_user.class_id == target_user.class_id
    )
    
    return is_teacher or is_admin or same_class