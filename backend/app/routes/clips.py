
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy import func, desc, or_
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
def get_clips(tag: str = None, creator: str = None, trending: bool = False, search: str = None, session = Depends(get_session)):
    query = select(Clip)
    if tag:
        query = query.where(func.lower(Clip.tags).like(f'%{tag.lower()}%'))
    if creator:
        query = query.where(func.lower(Clip.creator).like(f'%{creator.lower()}%'))
    if trending:
        query = query.order_by(desc(Clip.likes))
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Clip.creator).like(search_lower),
                func.lower(Clip.source).like(search_lower),
                func.lower(Clip.tags).like(search_lower),
            )
        )
    else:
        query = query.order_by(desc(Clip.submitted_at))
    return session.exec(query).all()

def get_current_user():
    # Return a fixed username or ID for now
    return "testuser"

@router.post("/{clip_id}/like")
def like_clip(
    clip_id: int,
    session = Depends(get_session),
    current_user: str = Depends(get_current_user),  # replace with your auth dependency
):
    clip = session.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    liked_users = clip.get_liked_by_list()

    if current_user in liked_users:
        clip.remove_like(current_user)
    else:
        clip.add_like(current_user)

    session.add(clip)
    session.commit()
    session.refresh(clip)

    return {"likes": clip.likes, "liked_by": clip.get_liked_by_list()}