from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.email_service import prepare_reservation_email, send_prepared_email
from app.models import Reservation, ReservationStatus, Room, SlotSession, User
from app.schemas import (
    PasswordResetRequest,
    UserBulkActiveUpdate,
    UserBulkDelete,
    UserBulkRoomAction,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _get_own_entity_user(user_id: int, admin: User, db: DbSession) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuari no trobat")
    if user.entity_id != admin.entity_id:
        raise HTTPException(status_code=403, detail="No pots gestionar usuaris d'una altra entitat")
    return user


def _resolve_owned_users(user_ids: list[int], admin: User, db: DbSession) -> list[User]:
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    found_ids = {user.id for user in users}
    missing_ids = set(user_ids) - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Usuari no trobat: {sorted(missing_ids)}")
    for user in users:
        if user.entity_id != admin.entity_id:
            raise HTTPException(status_code=403, detail="No pots gestionar usuaris d'una altra entitat")
    return users


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
        email=payload.email,
        role=payload.role,
        password_hash=hash_password(payload.initial_password),
        must_change_password=True,
        is_active=payload.is_active,
        visible_rooms=rooms,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/bulk-active", response_model=list[UserRead])
def bulk_update_active(
    payload: UserBulkActiveUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if not payload.is_active and admin.id in payload.user_ids:
        raise HTTPException(status_code=400, detail="No et pots desactivar a tu mateix")

    users = _resolve_owned_users(payload.user_ids, admin, db)
    for user in users:
        user.is_active = payload.is_active
    db.commit()
    for user in users:
        db.refresh(user)
    return users


@router.delete("/bulk", status_code=204)
def bulk_delete_users(
    payload: UserBulkDelete,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if admin.id in payload.user_ids:
        raise HTTPException(status_code=400, detail="No et pots eliminar a tu mateix")

    users = _resolve_owned_users(payload.user_ids, admin, db)
    for user in users:
        db.delete(user)
    db.commit()


def _resolve_own_entity_room(room_id: int, admin: User, db: DbSession) -> Room:
    room = db.get(Room, room_id)
    if not room or room.entity_id != admin.entity_id:
        raise HTTPException(status_code=400, detail="Grup no vàlid")
    return room


@router.patch("/bulk-add-room", response_model=list[UserRead])
def bulk_add_room(
    payload: UserBulkRoomAction,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    room = _resolve_own_entity_room(payload.room_id, admin, db)
    users = _resolve_owned_users(payload.user_ids, admin, db)
    for user in users:
        if room not in user.visible_rooms:
            user.visible_rooms.append(room)
    db.commit()
    for user in users:
        db.refresh(user)
    return users


@router.patch("/bulk-remove-room", response_model=list[UserRead])
def bulk_remove_room(
    payload: UserBulkRoomAction,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    room = _resolve_own_entity_room(payload.room_id, admin, db)
    users = _resolve_owned_users(payload.user_ids, admin, db)
    user_ids = [user.id for user in users]

    # En treure el grup, l'usuari perd l'accés a les seves sessions: cal cancel·lar
    # qualsevol reserva activa (pendent o confirmada) que hi tingués.
    reservations = (
        db.query(Reservation)
        .join(SlotSession, Reservation.session_id == SlotSession.id)
        .filter(
            Reservation.user_id.in_(user_ids),
            SlotSession.room_id == room.id,
            Reservation.status.in_((ReservationStatus.PENDING, ReservationStatus.CONFIRMED)),
        )
        .all()
    )
    for reservation in reservations:
        reservation.status = ReservationStatus.CANCELLED_BY_ADMIN
    prepared_emails = [prepare_reservation_email(reservation, "cancelled_by_admin") for reservation in reservations]

    for user in users:
        if room in user.visible_rooms:
            user.visible_rooms.remove(room)
    db.commit()
    for user in users:
        db.refresh(user)
    for prepared in prepared_emails:
        if prepared:
            background_tasks.add_task(send_prepared_email, prepared)
    return users


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = _get_own_entity_user(user_id, admin, db)
    fields = payload.model_dump(exclude_unset=True)
    if user_id == admin.id and fields.get("is_active") is False:
        raise HTTPException(status_code=400, detail="No et pots desactivar a tu mateix")
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
