from pydantic import BaseModel


class EntryResponse(BaseModel):
    name: str
    category: str
    url: str
    edition: str | None = None

    model_config = {"from_attributes": True}
