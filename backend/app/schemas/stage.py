# app/schemas/stage.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# 단계 이동 요청 스키마
class StageMove(BaseModel):
    stage: str
    comment: Optional[str] = None

# 단계 설정 기본 스키마
class StageConfigBase(BaseModel):
    stage: str
    expected_time: int = Field(..., description="Expected time in minutes")
    description: Optional[str] = None
    order: int

# 단계 설정 생성 스키마
class StageConfigCreate(StageConfigBase):
    task_id: int

# 단계 설정 업데이트 스키마
class StageConfigUpdate(BaseModel):
    expected_time: Optional[int] = None
    description: Optional[str] = None
    order: Optional[int] = None

# 단계 설정 응답 스키마
class StageConfigSchema(StageConfigBase):
    id: int
    task_id: int

    class Config:
        from_attributes = True

# 단계 이력 응답 스키마
class TaskHistorySchema(BaseModel):
    id: int
    task_id: int
    user_id: int
    previous_stage: Optional[str]
    new_stage: str
    changed_at: datetime
    time_spent: Optional[int] = None  # 소요 시간(초)

    class Config:
        from_attributes = True

# 단계 요약 응답 스키마 (선택적)
class StageSummary(BaseModel):
    stage: str
    count: int
    avg_time_spent: Optional[float] = None  # 평균 소요 시간(분)