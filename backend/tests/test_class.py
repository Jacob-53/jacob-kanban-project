import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.main import app, init_db
from app.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configure a test database URL (use TEST_DATABASE_URL from .env or default)
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL")

# Create a new engine and session for testing
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency to use test DB
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown_db():
    # Initialize test database schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    init_db()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="session")
def token_teacher():
    # Create a teacher user and obtain token
    signup_data = {"username": "tom1", "email": "tom1@test.com", "password": "pass", "is_teacher": True}
    client.post("/auth/signup", json=signup_data)
    resp = client.post("/auth/token", data={"username": "tom1", "password": "pass"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest.fixture
def auth_headers(token_teacher):
    return {"Authorization": f"Bearer {token_teacher}"}


def test_create_class(auth_headers):
    payload = {"name": "TestClass"}
    resp = client.post("/classes/", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "TestClass"
    assert "id" in data


def test_list_classes(auth_headers):
    resp = client.get("/classes/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(c["name"] == "TestClass" for c in data)


def test_get_class(auth_headers):
    # fetch list to get id
    resp = client.get("/classes/", headers=auth_headers)
    cls_list = resp.json()
    cls_id = next(c["id"] for c in cls_list if c["name"] == "TestClass")
    resp = client.get(f"/classes/{cls_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == cls_id
    assert data["name"] == "TestClass"


def test_update_class(auth_headers):
    # get id
    resp = client.get("/classes/", headers=auth_headers)
    cls_id = resp.json()[0]["id"]
    resp = client.put(f"/classes/{cls_id}", json={"name": "RenamedClass"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "RenamedClass"


def test_delete_class(auth_headers):
    # create then delete
    create = client.post("/classes/", json={"name": "ToDeleteClass"}, headers=auth_headers)
    cls_id = create.json()["id"]
    resp = client.delete(f"/classes/{cls_id}", headers=auth_headers)
    assert resp.status_code == 204
    # ensure not found
    resp = client.get(f"/classes/{cls_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_get_users_by_class(auth_headers):
    # create test student
    signup_data = {"username": "jacob1", "email": "jacob1@test.com", "password": "pw", "is_teacher": False}
    client.post("/auth/signup", json=signup_data)
    resp_user = client.post(
        "/users/", 
        json={"username": "jacob1", "email": "jacob1@test.com", "password": "pw", "class_id": 1},
        headers=auth_headers
    )
    assert resp_user.status_code in (200, 201)
    resp = client.get("/classes/1/users", headers=auth_headers)
    assert resp.status_code == 200
    users = resp.json()
    assert any(u["username"] == "jacob1" for u in users)
