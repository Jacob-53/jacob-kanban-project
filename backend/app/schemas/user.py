# app/schemas/user.py - enum 제거하고 String 사용
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, Literal
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    is_teacher: bool = False
    role: UserRole = UserRole.STUDENT  # enum 사용

class UserCreate(UserBase):
    password: str
    # 회원가입 시 반 정보
    class_name: Optional[str] = None
    
    # ✅ 데이터 일관성 체크 (Pydantic v2 방식으로 수정)
    @model_validator(mode='after')
    def validate_role_consistency(self):
        """role과 is_teacher 필드의 일관성 체크"""
        role = self.role
        is_teacher = self.is_teacher
        
        # role이 teacher면 is_teacher도 True여야 함
        if role == "teacher" and not is_teacher:
            self.is_teacher = True
        # role이 student나 admin이면 is_teacher는 False
        elif role in ["student", "admin"] and is_teacher:
            self.is_teacher = False
            
        return self

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    is_teacher: Optional[bool] = None
    role: Optional[Literal["admin", "teacher", "student"]] = None
    class_id: Optional[int] = None
    password: Optional[str] = None
    
    # ✅ 업데이트 시에도 일관성 체크
    @model_validator(mode='after')
    def validate_role_consistency(self):
        """role과 is_teacher 필드의 일관성 체크"""
        if self.role is not None and self.is_teacher is not None:
            role = self.role
            is_teacher = self.is_teacher
            
            # role이 teacher면 is_teacher도 True여야 함
            if role == "teacher" and not is_teacher:
                self.is_teacher = True
            # role이 student나 admin이면 is_teacher는 False
            elif role in ["student", "admin"] and is_teacher:
                self.is_teacher = False
                
        return self

class UserRead(UserBase):
    id: int
    class_id: Optional[int] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True

# 관리자용 사용자 정보
class UserAdmin(UserRead):
    """관리자가 볼 수 있는 상세한 사용자 정보"""
    hashed_password: str = "***"
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# ✅ 추가: 로그인 응답용 스키마
class UserResponse(UserRead):
    """로그인 후 반환되는 사용자 정보"""
    pass

# ✅ 추가: 사용자 목록 조회용 스키마 (비밀번호 제외)
class UserListItem(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_teacher: bool
    role: Literal["admin", "teacher", "student"]
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    
    class Config:
        from_attributes = True