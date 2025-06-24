# app/schemas/stage.py - 단계 관리 전체 스키마
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ========================
# 기존 스키마 (그대로 유지)
# ========================
class StageMove(BaseModel):
    """태스크 단계 이동 요청 스키마"""
    stage: str
    comment: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "stage": "requirements",
                "comment": "요구사항 분석 단계로 이동합니다"
            }
        }

# ========================
# 새로 추가되는 스키마들
# ========================

# 단계 설정 기본 스키마
class StageConfigBase(BaseModel):
    """단계 설정 기본 정보"""
    stage: str
    expected_time: int = Field(..., description="Expected time in minutes", ge=1)
    description: Optional[str] = None
    order: int = Field(..., description="Stage order", ge=0)

# 단계 설정 생성 스키마
class StageConfigCreate(StageConfigBase):
    """단계 설정 생성용 스키마"""
    task_id: int = Field(..., description="Task ID", gt=0)

# 단계 설정 업데이트 스키마
class StageConfigUpdate(BaseModel):
    """단계 설정 업데이트용 스키마"""
    expected_time: Optional[int] = Field(None, description="Expected time in minutes", ge=1)
    description: Optional[str] = None
    order: Optional[int] = Field(None, description="Stage order", ge=0)

# 단계 설정 응답 스키마
class StageConfigSchema(StageConfigBase):
    """단계 설정 응답용 스키마"""
    id: int
    task_id: int

    class Config:
        from_attributes = True

# 단계 이력 응답 스키마
class TaskHistorySchema(BaseModel):
    """태스크 단계 변경 이력 스키마"""
    id: int
    task_id: int
    user_id: int
    previous_stage: Optional[str] = None
    new_stage: str
    changed_at: datetime
    time_spent: Optional[int] = Field(None, description="Time spent in seconds")
    comment: Optional[str] = None

    class Config:
        from_attributes = True

# 단계 요약 통계 스키마
class StageSummary(BaseModel):
    """단계별 통계 요약 스키마"""
    stage: str
    count: int = Field(..., description="Number of tasks in this stage", ge=0)
    avg_time_spent: Optional[float] = Field(None, description="Average time spent in minutes")

# 단계 진행률 스키마
class StageProgress(BaseModel):
    """단계 진행률 정보 스키마"""
    stage: str
    total_tasks: int = Field(..., ge=0)
    completed_tasks: int = Field(..., ge=0)
    progress_percentage: float = Field(..., ge=0.0, le=100.0)
    avg_completion_time: Optional[float] = Field(None, description="Average completion time in minutes")

# 사용자별 단계 통계 스키마
class UserStageStatistics(BaseModel):
    """사용자별 단계 수행 통계 스키마"""
    user_id: int
    username: str
    stage_stats: List[StageSummary]
    total_tasks_completed: int = Field(..., ge=0)
    average_efficiency: Optional[float] = Field(None, description="Overall efficiency ratio")

    class Config:
        from_attributes = True

# 단계별 시간 추적 스키마
class StageTimeTracking(BaseModel):
    """단계별 시간 추적 스키마"""
    task_id: int
    stage: str
    expected_time: int = Field(..., description="Expected time in minutes")
    actual_time: Optional[float] = Field(None, description="Actual time spent in minutes")
    efficiency_ratio: Optional[float] = Field(None, description="Expected/Actual time ratio")
    is_delayed: bool = False
    delay_percentage: Optional[float] = Field(None, description="Delay percentage if over expected time")

# 단계 전환 응답 스키마 (확장)
class StageMoveResponse(BaseModel):
    """단계 이동 응답 스키마"""
    task_id: int
    previous_stage: Optional[str]
    new_stage: str
    time_spent_in_previous: Optional[int] = Field(None, description="Time spent in previous stage (seconds)")
    moved_at: datetime
    comment: Optional[str] = None
    
    class Config:
        from_attributes = True