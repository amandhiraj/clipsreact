
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from app.models import Clip
from app.db import get_session
from typing import List

router = APIRouter(prefix="/clips", tags=["Clips"])

@router.post("/")
def create_clip(clip: Clip, session = Depends(get_session)):
    session.add(clip)
    session.commit()
    session.refresh(clip)
    return clip

@router.get("/", response_model=List[Clip])
def get_clips(tag: str = None, creator: str = None, session = Depends(get_session)):
    clips = session.exec(select(Clip)).all()

    if tag:
        clips = [clip for clip in clips if tag in clip.tags]

    if creator:
        clips = [clip for clip in clips if clip.creator == creator]

    return clips

