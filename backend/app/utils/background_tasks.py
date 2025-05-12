# app/utils/background_tasks.py
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from app.crud.time_tracking import check_delayed_tasks
from app.database import get_db
import asyncio
import time
from contextlib import contextmanager

# 데이터베이스 세션 컨텍스트 매니저
@contextmanager
def get_db_context():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

# 지연 상태 정기 체크 함수
async def periodic_check_delays():
    while True:
        try:
            with get_db_context() as db:
                check_delayed_tasks(db)
                print("Delay check completed")
        except Exception as e:
            print(f"Error during delay check: {e}")
        
        # 5분(300초)마다 체크
        await asyncio.sleep(300)

# 백그라운드 태스크 시작 함수
def start_background_tasks():
    loop = asyncio.get_event_loop()
    loop.create_task(periodic_check_delays())