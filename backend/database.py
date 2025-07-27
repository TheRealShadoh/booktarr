import os
from sqlmodel import create_engine, SQLModel, Session
from contextlib import contextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./booktarr.db")

engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


# For FastAPI dependency injection
def get_session():
    with Session(engine) as session:
        yield session


# For use in services as context manager  
@contextmanager
def get_db_session():
    with Session(engine) as session:
        yield session


def init_db():
    create_db_and_tables()