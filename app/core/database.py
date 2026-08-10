import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# --- Konzept: Umgebungsspezifische Konfiguration ---
# Die Datenbank-URL wird über eine Umgebungsvariable konfiguriert.
# Lokal/Default: SQLite (einfach, kein Setup nötig).
# Produktion (Docker Compose): PostgreSQL.
# Tests: In-Memory SQLite (siehe tests/conftest.py).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todo.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency: yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
