# app/dependencies.py - String 기반 권한 체계 (3단계 개선 버전)
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from jose import JWTError, jwt
import os
from typing import Optional
from functools import wraps

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

# ✅ 기본 권한 체크 함수들

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

# ✅ 3단계 추가: 강화된 관리자 권한 함수들

def get_current_super_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """슈퍼 관리자 권한 체크 (시스템 전체 관리)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super administrator privileges required"
        )
    return current_user

def get_admin_or_self(
    current_user: User = Depends(get_current_user)
) -> User:
    """관리자이거나 본인인 경우만 허용 (사용자 관리용)"""
    # 이 함수는 라우터에서 target_user_id와 함께 사용
    return current_user

# ✅ 3단계 추가: 고급 권한 체크 함수들

def check_user_management_permission(
    current_user: User,
    target_user_id: int,
    db: Session = None
) -> bool:
    """사용자 관리 권한 체크 (관리자, 교사, 본인)"""
    # 관리자는 모든 사용자 관리 가능
    if current_user.role == "admin":
        return True
    
    # 본인 정보는 항상 관리 가능
    if current_user.id == target_user_id:
        return True
    
    # 교사는 자신의 반 학생들만 관리 가능
    if current_user.is_teacher and db:
        target_user = db.get(User, target_user_id)
        if target_user and target_user.class_id == current_user.class_id and target_user.role == "student":
            return True
    
    return False

def check_class_management_permission(
    current_user: User,
    class_id: int = None
) -> bool:
    """반 관리 권한 체크"""
    # 관리자는 모든 반 관리 가능
    if current_user.role == "admin":
        return True
    
    # 교사는 자신의 반만 관리 가능
    if current_user.is_teacher:
        if class_id is None or current_user.class_id == class_id:
            return True
    
    return False

def check_task_management_permission(
    current_user: User,
    task_owner_id: int,
    task_class_id: int = None
) -> bool:
    """태스크 관리 권한 체크"""
    # 관리자는 모든 태스크 관리 가능
    if current_user.role == "admin":
        return True
    
    # 태스크 소유자는 자신의 태스크 관리 가능
    if current_user.id == task_owner_id:
        return True
    
    # 교사는 자신의 반 학생들의 태스크 관리 가능
    if current_user.is_teacher and task_class_id:
        if current_user.class_id == task_class_id:
            return True
    
    return False

# ✅ 기존 자원 권한 체크 함수들 (유지)

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

# ✅ 3단계 추가: 권한 체크 데코레이터들

def require_admin(func):
    """관리자 권한이 필요한 함수에 사용하는 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if not current_user or current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator privileges required"
            )
        return func(*args, **kwargs)
    return wrapper

def require_teacher_or_admin(func):
    """교사 또는 관리자 권한이 필요한 함수에 사용하는 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if not current_user or (current_user.role not in ["admin", "teacher"] and not current_user.is_teacher):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher or Administrator privileges required"
            )
        return func(*args, **kwargs)
    return wrapper

def require_same_user_or_admin(func):
    """본인이거나 관리자 권한이 필요한 함수에 사용하는 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user = kwargs.get('current_user')
        target_user_id = kwargs.get('user_id') or kwargs.get('target_user_id')
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if current_user.role != "admin" and current_user.id != target_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only access your own resources or need administrator privileges"
            )
        
        return func(*args, **kwargs)
    return wrapper

# ✅ 3단계 추가: 복합 권한 체크 의존성들

def require_user_management_permission(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """사용자 관리 권한이 있는지 체크하는 의존성"""
    if not check_user_management_permission(current_user, user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this user"
        )
    return current_user

def require_class_management_permission(
    class_id: int = None,
    current_user: User = Depends(get_current_user)
) -> User:
    """반 관리 권한이 있는지 체크하는 의존성"""
    if not check_class_management_permission(current_user, class_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage this class"
        )
    return current_user

# ✅ 3단계 추가: 사용자 역할 확인 유틸리티

def is_admin(user: User) -> bool:
    """사용자가 관리자인지 확인"""
    return user.role == "admin"

def is_teacher(user: User) -> bool:
    """사용자가 교사인지 확인"""
    return user.role == "teacher" or user.is_teacher

def is_student(user: User) -> bool:
    """사용자가 학생인지 확인"""
    return user.role == "student"

def can_manage_user(manager: User, target_user: User) -> bool:
    """관리자가 대상 사용자를 관리할 수 있는지 확인"""
    # 관리자는 모든 사용자 관리 가능
    if is_admin(manager):
        return True
    
    # 교사는 자신의 반 학생들만 관리 가능
    if is_teacher(manager) and is_student(target_user):
        return manager.class_id == target_user.class_id
    
    # 본인은 자신의 정보 관리 가능
    return manager.id == target_user.id

def can_access_class(user: User, class_id: int) -> bool:
    """사용자가 특정 반에 접근할 수 있는지 확인"""
    # 관리자는 모든 반 접근 가능
    if is_admin(user):
        return True
    
    # 해당 반의 멤버(교사 또는 학생)는 접근 가능
    return user.class_id == class_id