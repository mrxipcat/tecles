from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Room, User
from app.schemas import PasswordResetRequest, UserCreate, UserRead, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _get_own_entity_user(user_id: int, admin: User, db: DbSession) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuari no trobat")
    if user.entity_id != admin.entity_id:
        raise HTTPException(status_code=403, detail="No pots gestionar usuaris d'una altra entitat")
    return user


def _resolve_rooms(room_ids: list[int], admin: User, db: DbSession) -> list[Room]:
    if not room_ids:
        return []
    rooms = db.query(Room).filter(Room.id.in_(room_ids), Room.entity_id == admin.entity_id).all()
    if len(rooms) != len(set(room_ids)):
        raise HTTPException(status_code=400, detail="Grup no vàlid")
    return rooms


@router.get("", response_model=list[UserRead])
def list_users(db: DbSession = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(User).filter(User.entity_id == admin.entity_id).all()


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = (
        db.query(User)
        .filter(User.entity_id == admin.entity_id, User.username == payload.username)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ja existeix un usuari amb aquest nom d'usuari")

    rooms = _resolve_rooms(payload.visible_room_ids, admin, db)

    user = User(
        entity_id=admin.entity_id,
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        password_hash=hash_password(payload.initial_password),
        must_change_password=True,
        visible_rooms=rooms,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = _get_own_entity_user(user_id, admin, db)
    fields = payload.model_dump(exclude_unset=True)
    room_ids = fields.pop("visible_room_ids", None)
    if room_ids is not None:
        user.visible_rooms = _resolve_rooms(room_ids, admin, db)
    for field, value in fields.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=UserRead)
def reset_password(
    user_id: int,
    payload: PasswordResetRequest,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = _get_own_entity_user(user_id, admin, db)
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No et pots eliminar a tu mateix")
    user = _get_own_entity_user(user_id, admin, db)
    db.delete(user)
    db.commit()
