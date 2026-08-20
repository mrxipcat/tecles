from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user_optional
from app.models import Reservation, ReservationStatus, Room, SlotSession, User, UserRole, compose_display_title
from app.schemas import SlotSessionCreate, SlotSessionRead, SlotSessionUpdate

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _serialize_session(session: SlotSession, current_user: User | None, db: DbSession) -> SlotSessionRead:
    occupied = (
        db.query(Reservation)
        .filter(
            Reservation.session_id == session.id,
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        )
        .count()
    )
    available_places = max(session.capacity - occupied, 0)

    show = current_user is not None and (
        current_user.role == UserRole.ADMIN or session.entity.show_available_places
    )

    data = SlotSessionRead.model_validate(session)
    data.available_places = available_places if show else None

    if current_user is not None and current_user.role == UserRole.ADMIN:
        data.pending_count = (
            db.query(Reservation)
            .filter(Reservation.session_id == session.id, Reservation.status == ReservationStatus.PENDING)
            .count()
        )
        data.confirmed_count = (
            db.query(Reservation)
            .filter(Reservation.session_id == session.id, Reservation.status == ReservationStatus.CONFIRMED)
            .count()
        )

    if current_user is not None and current_user.role != UserRole.ADMIN:
        my_reservation = (
            db.query(Reservation)
            .filter(
                Reservation.session_id == session.id,
                Reservation.user_id == current_user.id,
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
            )
            .first()
        )
        if my_reservation:
            data.my_reservation_id = my_reservation.id
            data.my_reservation_status = my_reservation.status

    if current_user is not None and current_user.assigned_room_id is not None:
        # Restringit a una sola sala: no cal repetir-ne el nom al títol.
        data.display_title = compose_display_title(session.title, session.room_name, False)

    return data


@router.get("", response_model=list[SlotSessionRead])
def list_sessions(
    entity_id: int | None = None,
    db: DbSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # TODO(sprint6): si l'entitat té visibility_mode == AVAILABLE_ONLY i l'usuari
    # no és admin, filtrar les sessions sense places lliures.
    query = db.query(SlotSession)
    if entity_id is not None:
        query = query.filter(SlotSession.entity_id == entity_id)
    if (
        current_user is not None
        and current_user.role == UserRole.USER
        and current_user.assigned_room_id is not None
    ):
        query = query.filter(SlotSession.room_id == current_user.assigned_room_id)
    sessions = query.order_by(SlotSession.date, SlotSession.start_time).all()
    return [_serialize_session(session, current_user, db) for session in sessions]


@router.get("/{session_id}", response_model=SlotSessionRead)
def get_session(
    session_id: int,
    db: DbSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    session = db.get(SlotSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessió no trobada")
    return _serialize_session(session, current_user, db)


@router.post("", response_model=SlotSessionRead, status_code=201)
def create_session(
    payload: SlotSessionCreate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if admin.entity_id != payload.entity_id:
        raise HTTPException(status_code=403, detail="No pots crear sessions per a una altra entitat")

    if admin.entity.is_multiroom:
        if payload.room_id is None:
            raise HTTPException(
                status_code=400, detail=f"Cal indicar {admin.entity.room_label_singular.lower()}"
            )
        room = db.get(Room, payload.room_id)
        if not room or room.entity_id != admin.entity_id:
            raise HTTPException(status_code=400, detail=f"{admin.entity.room_label_singular} no vàlida")
        room_id = room.id
    else:
        default_room = (
            db.query(Room).filter(Room.entity_id == admin.entity_id).order_by(Room.id).first()
        )
        room_id = default_room.id

    session = SlotSession(**payload.model_dump(exclude={"room_id"}), room_id=room_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}", response_model=SlotSessionRead)
def update_session(
    session_id: int,
    payload: SlotSessionUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    session = db.get(SlotSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessió no trobada")
    if admin.entity_id != session.entity_id:
        raise HTTPException(status_code=403, detail="No pots modificar sessions d'una altra entitat")

    fields = payload.model_dump(exclude_unset=True)
    room_id = fields.pop("room_id", None)
    if room_id is not None:
        if not admin.entity.is_multiroom:
            raise HTTPException(
                status_code=400,
                detail=f"Activa el mode multisala per assignar {admin.entity.room_label_plural.lower()}",
            )
        room = db.get(Room, room_id)
        if not room or room.entity_id != admin.entity_id:
            raise HTTPException(status_code=400, detail=f"{admin.entity.room_label_singular} no vàlida")
        session.room_id = room.id

    for field, value in fields.items():
        setattr(session, field, value)

    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    session = db.get(SlotSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessió no trobada")
    if admin.entity_id != session.entity_id:
        raise HTTPException(status_code=403, detail="No pots esborrar sessions d'una altra entitat")

    db.delete(session)
    db.commit()
