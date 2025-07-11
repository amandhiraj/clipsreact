from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import json

class Clip(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    url: str
    tags: str  # stored as JSON string
    creator: str
    source: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    # New fields
    likes: int = Field(default=0)
    liked_by: str = Field(default="[]")  # JSON string of usernames

    def get_tag_list(self):
        try:
            return json.loads(self.tags)
        except Exception:
            return []

    def get_liked_by_list(self):
        try:
            return json.loads(self.liked_by)
        except Exception:
            return []

    def add_like(self, user: str):
        liked_users = self.get_liked_by_list()
        if user not in liked_users:
            liked_users.append(user)
            self.likes += 1
            self.liked_by = json.dumps(liked_users)

    def remove_like(self, user: str):
        liked_users = self.get_liked_by_list()
        if user in liked_users:
            liked_users.remove(user)
            self.likes = max(self.likes - 1, 0)
            self.liked_by = json.dumps(liked_users)
