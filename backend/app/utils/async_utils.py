# app/utils/async_utils.py
import asyncio
from functools import wraps
import threading
from typing import Callable, Any, Coroutine

def run_async(func: Callable[..., Coroutine]) -> Callable:
    """
    비동기 함수를 동기 환경에서 실행하기 위한 데코레이터
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 현재 이벤트 루프가 있는지 확인
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # 이벤트 루프가 없으면 새로 생성
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # 이벤트 루프가 실행 중이면 태스크로 예약
        if loop.is_running():
            return asyncio.create_task(func(*args, **kwargs))
        # 아니면 직접 실행
        else:
            return loop.run_until_complete(func(*args, **kwargs))
    
    return wrapper

def fire_and_forget(coro):
    """
    비동기 코루틴을 백그라운드에서 실행하고 결과를 무시합니다.
    """
    asyncio.create_task(coro)