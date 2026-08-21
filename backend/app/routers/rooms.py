from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Room, SlotSession, User
from app.schemas import RoomCreate, RoomRead, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _get_own_entity_room(room_id: int, admin: User, db: DbSession) -> Room:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Grup no trobat")
    if room.entity_id != admin.entity_id:
        raise HTTPException(
            status_code=403,
            detail="No pots gestionar grups d'una altra entitat",
        )
    return room


@router.get("", response_model=list[RoomRead])
def list_rooms(entity_id: int, db: DbSession = Depends(get_db)):
    return db.query(Room).filter(Room.entity_id == entity_id).order_by(Room.name).all()


@router.post("", response_model=RoomRead, status_code=201)
def create_room(
    payload: RoomCreate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if not admin.entity.is_multiroom:
        raise HTTPException(
            status_code=400,
            detail="Activa el mode multisala per gestionar grups",
        )

    room = Room(entity_id=admin.entity_id, name=payload.name)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomRead)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    room = _get_own_entity_room(room_id, admin, db)
    if not admin.entity.is_multiroom:
        raise HTTPException(
            status_code=400,
            detail="Activa el mode multisala per gestionar grups",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(
    room_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    room = _get_own_entity_room(room_id, admin, db)
    if not admin.entity.is_multiroom:
        raise HTTPException(
            status_code=400,
            detail="Activa el mode multisala per gestionar grups",
        )

    remaining_rooms = db.query(Room).filter(Room.entity_id == admin.entity_id).count()
    if remaining_rooms <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cal mantenir com a mínim un grup",
        )

    has_sessions = db.query(SlotSession).filter(SlotSession.room_id == room_id).first()
    if has_sessions:
        slot_plural = admin.entity.slot_label_plural.lower()
        raise HTTPException(
            status_code=400,
            detail=f"No es pot esborrar un grup que encara té {slot_plural}",
        )

    db.delete(room)
    db.commit()
