from sqlmodel import SQLModel, create_engine, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clips.db")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    # Import all your models here so metadata includes them
    from app.models import Clip  # import every model you have
    
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
