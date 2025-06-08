from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserRead
from app.crud.user import create_user as create_user_crud, get_user, get_users
from app.utils.security import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# 👉 회원가입 (email, class_id 포함)
@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    새 사용자 생성. 공개 엔드포인트이며, body에
    - username: str
    - email: str
    - password: str
    - is_teacher: bool
    - class_id: Optional[int]
    를 포함해야 합니다.
    """
    try:
        return create_user_crud(db=db, user=user)
    except Exception as e:
        # 예: username/email 중복 등
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# 👉 유저 전체 조회 (교사 권한 필요)
@router.get("/", response_model=list[UserRead])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    모든 사용자 조회. 교사 계정으로만 접근 가능합니다.
    """
    if not current_user.is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="교사 권한이 필요합니다."
        )
    return get_users(db, skip=skip, limit=limit)


# 👉 내 정보 조회
@router.get("/me", response_model=UserRead)
def read_users_me(current_user = Depends(get_current_user)):
    """
    현재 토큰으로 인증된 사용자 정보 조회
    """
    return current_user


# 👉 특정 사용자 조회 (교사 권한 필요)
@router.get("/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    ID로 특정 사용자 조회. 교사 권한이 필요합니다.
    """
    if not current_user.is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="교사 권한이 필요합니다."
        )
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
