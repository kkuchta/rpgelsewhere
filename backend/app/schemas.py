from datetime import datetime

from pydantic import BaseModel


class EntryBase(BaseModel):
    name: str
    category: str
    url: str


class EntryCreate(EntryBase):
    pass


class EntryUpdate(EntryBase):
    pass


class EntryResponse(EntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
