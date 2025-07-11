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

    def get_tag_list(self):
        try:
            return json.loads(self.tags)
        except Exception:
            return []
