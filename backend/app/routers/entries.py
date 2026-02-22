from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Entry
from app.schemas import EntryCreate, EntryResponse, EntryUpdate

router = APIRouter(prefix="/api/entries", tags=["entries"])


@router.get("", response_model=list[EntryResponse])
def list_entries(db: Session = Depends(get_db)):
    return db.query(Entry).order_by(Entry.name).all()


@router.post(
    "",
    response_model=EntryResponse,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    db_entry = Entry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put(
    "/{entry_id}", response_model=EntryResponse, dependencies=[Depends(require_admin)]
)
def update_entry(entry_id: int, entry: EntryUpdate, db: Session = Depends(get_db)):
    db_entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in entry.model_dump().items():
        setattr(db_entry, field, value)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.delete("/{entry_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(db_entry)
    db.commit()
