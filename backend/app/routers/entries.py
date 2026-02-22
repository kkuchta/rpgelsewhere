from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Entry
from app.schemas import EntryResponse

router = APIRouter(prefix="/api/entries", tags=["entries"])


@router.get("", response_model=list[EntryResponse])
def list_entries(db: Session = Depends(get_db)):
    return db.query(Entry).order_by(Entry.name).all()
