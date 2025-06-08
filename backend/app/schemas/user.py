# app/schemas/user.py
from pydantic import BaseModel, model_validator, field_validator
from typing import Optional, Literal

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    is_teacher: bool = False
    role: Literal["admin", "teacher", "student"] = "student"

class UserCreate(UserBase):
    password: str
    # ✅ 회원가입 시 반 정보 입력
    class_name: Optional[str] = None  # 반 이름으로 입력
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('사용자명은 3자 이상이어야 합니다')
        if len(v) > 50:
            raise ValueError('사용자명은 50자 이하여야 합니다')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 4:
            raise ValueError('비밀번호는 4자 이상이어야 합니다')
        return v
    
    @model_validator(mode='after')
    def validate_role_consistency(self):
        """role과 is_teacher 필드의 일관성 체크"""
        if self.role == "teacher" and not self.is_teacher:
            self.is_teacher = True
        elif self.role in ["student", "admin"] and self.is_teacher:
            self.is_teacher = False
        return self

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    is_teacher: Optional[bool] = None
    role: Optional[Literal["admin", "teacher", "student"]] = None
    class_id: Optional[int] = None
    password: Optional[str] = None

class UserRead(UserBase):
    id: int
    class_id: Optional[int] = None
    class_name: Optional[str] = None  # 반 이름도 함께 반환

    class Config:
        from_attributes = True

# ✅ 회원가입 응답용 (민감 정보 제외)
class UserCreateResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_teacher: bool
    role: str
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    message: str = "회원가입이 완료되었습니다"
    
    class Config:
        from_attributes = True

# 관리자용 상세 정보
class UserAdmin(UserRead):
    """관리자가 볼 수 있는 상세한 사용자 정보"""
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True