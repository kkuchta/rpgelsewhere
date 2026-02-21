from datetime import datetime

from pydantic import BaseModel


class EntryBase(BaseModel):
    name: str
    category: str
    url: str
    edition: str | None = None


class EntryCreate(EntryBase):
    pass


class EntryUpdate(EntryBase):
    pass


class EntryResponse(EntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
