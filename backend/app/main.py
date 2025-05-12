from fastapi import FastAPI
from app.database import engine
from app.routers import user, task, auth, stage
from sqlalchemy import text
import asyncio
from app.utils.background_tasks import start_background_tasks
from app.routers import time_tracking
from app.routers import help_request

# FastAPI 앱 생성
app = FastAPI()

# 데이터베이스 초기화 함수
def init_db():
    try:
        # 직접 SQL로 테이블 생성 (SQLAlchemy 자동 생성 대신)
        with engine.connect() as conn:
            # 테이블 존재 여부 확인 후 생성
            tables_check = [
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR NOT NULL,
                    email VARCHAR,
                    hashed_password VARCHAR NOT NULL,
                    is_teacher BOOLEAN DEFAULT FALSE
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    user_id INTEGER REFERENCES users(id),
                    stage VARCHAR DEFAULT 'todo',
                    expected_time INTEGER DEFAULT 0,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    current_stage_started_at TIMESTAMP,
                    help_needed BOOLEAN DEFAULT FALSE,
                    help_requested_at TIMESTAMP,
                    help_message VARCHAR,
                    is_delayed BOOLEAN DEFAULT FALSE
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS stage_configs (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    stage VARCHAR NOT NULL,
                    expected_time INTEGER NOT NULL,
                    description VARCHAR,
                    "order" INTEGER NOT NULL
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS task_histories (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    user_id INTEGER REFERENCES users(id),
                    previous_stage VARCHAR,
                    new_stage VARCHAR NOT NULL,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    time_spent INTEGER,
                    comment VARCHAR
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS help_requests (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    user_id INTEGER REFERENCES users(id),
                    message VARCHAR,
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER REFERENCES users(id),
                    resolution_message VARCHAR
                )
                """
            ]
            # 테이블 생성 시도
            for create_stmt in tables_check:
                try:
                    conn.execute(text(create_stmt))
                except Exception as e:
                    print(f"테이블 생성 중 오류 (무시 가능): {e}")

            # 인덱스 생성 (필요한 경우에만, 이미 존재하는 인덱스는 건너뜀)
            indexes_check = [
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE indexname = 'ix_tasks_title'
                    ) THEN
                        CREATE INDEX ix_tasks_title ON tasks (title);
                    END IF;
                END
                $$;
                """
            ]
            for index_stmt in indexes_check:
                try:
                    conn.execute(text(index_stmt))
                except Exception as e:
                    print(f"인덱스 생성 중 오류 (무시 가능): {e}")

            # 기존 테이블에 컬럼 추가 (이미 존재하는 경우 대비)
            alter_statements = [
                # task_histories 테이블에 comment 컬럼 추가
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = 'task_histories' AND column_name = 'comment'
                    ) THEN
                        ALTER TABLE task_histories ADD COLUMN comment VARCHAR;
                    END IF;
                END $$;
                """,
                # help_requests 테이블에 resolution_message 컬럼 추가
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT FROM information_schema.columns
                        WHERE table_name = 'help_requests' AND column_name = 'resolution_message'
                    ) THEN
                        ALTER TABLE help_requests ADD COLUMN resolution_message VARCHAR;
                    END IF;
                END $$;
                """
            ]
            for stmt in alter_statements:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"컬럼 추가 중 오류 (무시 가능): {e}")

            # PostgreSQL용 컬럼 존재 확인 후 추가 (기존 코드 유지)
            statements = [
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'stage') THEN
                        ALTER TABLE tasks ADD COLUMN stage VARCHAR DEFAULT 'todo';
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'expected_time') THEN
                        ALTER TABLE tasks ADD COLUMN expected_time INTEGER DEFAULT 0;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'started_at') THEN
                        ALTER TABLE tasks ADD COLUMN started_at TIMESTAMP;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'completed_at') THEN
                        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'current_stage_started_at') THEN
                        ALTER TABLE tasks ADD COLUMN current_stage_started_at TIMESTAMP;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'help_needed') THEN
                        ALTER TABLE tasks ADD COLUMN help_needed BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'help_requested_at') THEN
                        ALTER TABLE tasks ADD COLUMN help_requested_at TIMESTAMP;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'help_message') THEN
                        ALTER TABLE tasks ADD COLUMN help_message VARCHAR;
                    END IF;
                END $$;
                """,
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'is_delayed') THEN
                        ALTER TABLE tasks ADD COLUMN is_delayed BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
                """
            ]
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"컬럼 추가 중 오류 (무시 가능): {e}")

            conn.commit()
        print("데이터베이스 초기화 완료")
    except Exception as e:
        print(f"데이터베이스 초기화 중 오류 발생: {e}")

# 앱 시작 시 DB 초기화
init_db()

# 라우터 등록
app.include_router(user.router)
app.include_router(task.router)
app.include_router(auth.router)
app.include_router(stage.router)
app.include_router(time_tracking.router)
app.include_router(help_request.router)

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# 앱 시작 시 백그라운드 태스크 실행
@app.on_event("startup")
def startup_event():
    start_background_tasks()