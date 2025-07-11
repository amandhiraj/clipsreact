
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy import func
from app.models import Clip
from app.db import get_session
from typing import List
import json

router = APIRouter(prefix="/clips", tags=["Clips"])

@router.post("/")
def create_clip(clip: Clip, session = Depends(get_session)):
    # convert list to JSON string before saving
    if isinstance(clip.tags, list):
        clip.tags = json.dumps(clip.tags)
    session.add(clip)
    session.commit()
    session.refresh(clip)
    return clip


@router.get("/", response_model=List[Clip])
def get_clips(tag: str = None, creator: str = None, session = Depends(get_session)):
    query = select(Clip)
    if tag:
        query = query.where(func.lower(Clip.tags).like(f'%{tag.lower()}%'))
    if creator:
        query = query.where(func.lower(Clip.creator).like(f'%{creator.lower()}%'))
    return session.exec(query).all()

