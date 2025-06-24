# app/routers/user.py - 회원가입 로직 개선
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRead, UserCreate, UserUpdate, UserCreateResponse
from app.crud.user import (
    create_user as create_user_crud,
    get_user,
    get_users,
    update_user as update_user_crud,
    delete_user as delete_user_crud,
    get_user_by_username
)
# ✅ dependencies.py에서 가져오기
from app.dependencies import get_current_user, get_current_teacher

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# ✅ 회원가입 로직 개선 (반 정보 처리 추가)
@router.post("/", response_model=UserCreateResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    사용자 회원가입
    - 반 이름(class_name)이 있으면 해당 반에 배정
    - 중복 사용자명 체크
    - role과 is_teacher 일관성 자동 조정
    """
    # ✅ 중복 사용자명 체크
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 사용자명입니다"
        )
    
    # ✅ 회원가입 로직 실행
    try:
        new_user = create_user_crud(db=db, user=user)
        
        # ✅ 응답 메시지 커스터마이징
        if new_user.class_id:
            message = f"회원가입이 완료되었습니다. '{user.class_name}' 반에 배정되었습니다."
        else:
            message = "회원가입이 완료되었습니다."
        
        return UserCreateResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            is_teacher=new_user.is_teacher,
            role=new_user.role,
            class_id=new_user.class_id,
            class_name=user.class_name,  # 입력된 반 이름
            message=message
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 중 오류가 발생했습니다"
        )

# ✅ /users/me 엔드포인트 - 반 정보 포함하여 반환
@router.get("/me", response_model=UserRead)
def read_users_me(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 로그인한 사용자의 정보를 반환합니다 (반 정보 포함)."""
    # ✅ 반 정보 추가 조회
    if current_user.class_id:
        from app.crud.classes import get_class
        user_class = get_class(db, current_user.class_id)
        class_name = user_class.name if user_class else None
    else:
        class_name = None
    
    return UserRead(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_teacher=current_user.is_teacher,
        role=current_user.role,
        class_id=current_user.class_id,
        class_name=class_name
    )

# 유저 전체 조회 (교사 권한 필요)
@router.get("/", response_model=list[UserRead])
def read_users(
    skip: int = 0,
    limit: int = 100,
    class_id: int = None,  # ✅ 반별 필터링 옵션 추가
    role: str = None,      # ✅ 역할별 필터링 옵션 추가
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher)
):
    """
    사용자 목록 조회 (교사 권한 필요)
    - class_id: 특정 반 학생들만 조회
    - role: 특정 역할 사용자들만 조회
    """
    # ✅ 필터링 로직 추가
    if class_id:
        from app.crud.user import get_users_by_class
        users = get_users_by_class(db, class_id, skip, limit)
    elif role:
        from app.crud.user import get_users_by_role
        users = get_users_by_role(db, role, skip, limit)
    else:
        users = get_users(db, skip=skip, limit=limit)
    
    # ✅ 반 정보 포함하여 반환
    result = []
    for user in users:
        if user.class_id:
            from app.crud.classes import get_class
            user_class = get_class(db, user.class_id)
            class_name = user_class.name if user_class else None
        else:
            class_name = None
            
        result.append(UserRead(
            id=user.id,
            username=user.username,
            email=user.email,
            is_teacher=user.is_teacher,
            role=user.role,
            class_id=user.class_id,
            class_name=class_name
        ))
    
    return result

# 특정 유저 조회
@router.get("/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 교사이거나 자신의 정보만 조회 가능
    if not current_user.is_teacher and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this user")
    
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # ✅ 반 정보 포함하여 반환
    if db_user.class_id:
        from app.crud.classes import get_class
        user_class = get_class(db, db_user.class_id)
        class_name = user_class.name if user_class else None
    else:
        class_name = None
    
    return UserRead(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        is_teacher=db_user.is_teacher,
        role=db_user.role,
        class_id=db_user.class_id,
        class_name=class_name
    )

# 사용자 정보 업데이트
@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 교사이거나 자신의 정보만 수정 가능
    if not current_user.is_teacher and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this user")
    
    db_user = update_user_crud(db, user_id, user_update)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # ✅ 반 정보 포함하여 반환
    if db_user.class_id:
        from app.crud.classes import get_class
        user_class = get_class(db, db_user.class_id)
        class_name = user_class.name if user_class else None
    else:
        class_name = None
    
    return UserRead(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        is_teacher=db_user.is_teacher,
        role=db_user.role,
        class_id=db_user.class_id,
        class_name=class_name
    )

# 사용자 삭제 (교사만 가능)
@router.delete("/{user_id}", response_model=UserRead)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_teacher)
):
    db_user = delete_user_crud(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user