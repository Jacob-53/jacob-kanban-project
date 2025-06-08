# backend/app/schemas/classes.py
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class ClassBase(BaseModel):
    name: str
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2:
            raise ValueError('반 이름은 2자 이상이어야 합니다')
        if len(v) > 50:
            raise ValueError('반 이름은 50자 이하여야 합니다')
        return v.strip()

class ClassCreate(ClassBase):
    pass

class ClassUpdate(ClassBase):
    pass

class ClassRead(ClassBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ✅ 학생 수 포함 응답
class ClassWithStudentCount(ClassRead):
    student_count: int = 0