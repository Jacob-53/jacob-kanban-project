# app/schemas/help_request.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 도움 요청 생성 스키마
class HelpRequestCreate(BaseModel):
    task_id: int
    message: Optional[str] = None

# 도움 요청 업데이트 스키마
class HelpRequestUpdate(BaseModel):
    resolved: bool = True
    resolution_message: Optional[str] = None

# ✅ 새로 추가: 도움 요청 해결용 스키마 (WebSocket 브로드캐스트에서 사용)
class HelpRequestResolve(BaseModel):
    """도움 요청 해결 시 사용하는 스키마"""
    resolution_message: Optional[str] = None
    
    class Config:
        # ✅ Pydantic v2 호환성
        json_schema_extra = {
            "example": {
                "resolution_message": "문제가 해결되었습니다. 다음 단계로 진행하세요."
            }
        }

# 도움 요청 응답 스키마
class HelpRequestSchema(BaseModel):
    id: int
    task_id: int
    user_id: int
    username: str  # 요청자 이름
    task_title: str  # 태스크 제목
    message: Optional[str] = None
    requested_at: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolver_name: Optional[str] = None  # 해결한 교사 이름
    resolution_message: Optional[str] = None

    class Config:
        from_attributes = True