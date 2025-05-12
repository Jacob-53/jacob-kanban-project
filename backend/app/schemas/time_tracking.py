# app/schemas/time_tracking.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class DelayStatus(BaseModel):
    task_id: int
    title: str
    user_id: int
    username: str
    current_stage: str
    expected_time: int  # 분 단위
    elapsed_time: float  # 분 단위 (소수점 허용)
    delay_percentage: float  # 예: 150.5 (%) = 예상 시간의 150.5%
    started_at: datetime
    is_delayed: bool

class TimeStatistics(BaseModel):
    task_id: int
    title: str
    stage: str
    expected_time: int  # 분 단위
    actual_time: float  # 분 단위 (소수점 허용)
    efficiency: float  # 예상 시간 / 실제 시간 (1.0 = 정확히 예상대로, <1.0 = 초과, >1.0 = 단축)

class UserTimeStatistics(BaseModel):
    user_id: int
    username: str
    completed_tasks: int
    total_expected_time: int  # 분 단위
    total_actual_time: float  # 분 단위 (소수점 허용)
    average_efficiency: float
    stage_statistics: Dict[str, TimeStatistics]  # 단계별 통계

class DelayNotification(BaseModel):
    task_id: int
    title: str
    user_id: int
    username: str
    stage: str
    expected_time: int
    elapsed_time: float  # 분 단위 (소수점 허용)
    created_at: datetime