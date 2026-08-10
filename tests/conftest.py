import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

# Wenn DATABASE_URL gesetzt ist (z.B. in CI mit PostgreSQL), wird diese verwendet.
# Sonst: In-Memory SQLite -- schnell, isoliert, kein Cleanup nötig.
_database_url = os.getenv("DATABASE_URL", "sqlite://")

_connect_args = {}
_engine_kwargs = {}
if _database_url.startswith("sqlite"):
    from sqlalchemy import StaticPool

    _connect_args["check_same_thread"] = False
    _engine_kwargs["poolclass"] = StaticPool

engine = create_engine(_database_url, connect_args=_connect_args, **_engine_kwargs)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Yield a test DB session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    """HTTP test client with overridden DB dependency."""

    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
