import io
from datetime import datetime as datetime_, time as time_, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user_optional
from app.models import (
    Reservation,
    ReservationStatus,
    Room,
    SlotSession,
    User,
    UserRole,
    VisibilityMode,
    compose_display_title,
)
from app.sanitize import sanitize_rich_text
from app.schemas import (
    SlotSessionBulkActiveUpdate,
    SlotSessionBulkCapacityIncrement,
    SlotSessionBulkDelete,
    SlotSessionBulkRoomUpdate,
    SlotSessionCreate,
    SlotSessionDeleteExpiredResult,
    SlotSessionExportRequest,
    SlotSessionPackCreate,
    SlotSessionRead,
    SlotSessionUpdate,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

MAX_PACK_SESSIONS = 500
ENROLLED_STATUSES = (ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
ENROLLED_STATUS_LABELS = {
    ReservationStatus.PENDING: "Pendent",
    ReservationStatus.CONFIRMED: "Confirmada",
}


def _occupied_count(session_id: int, db: DbSession) -> int:
    return (
        db.query(Reservation)
        .filter(
            Reservation.session_id == session_id,
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        )
        .count()
    )


def _is_expired(session: SlotSession) -> bool:
    return datetime_.combine(session.date, session.end_time) < datetime_.now()


def _has_active_reservation(session_id: int, user_id: int, db: DbSession) -> bool:
    return (
        db.query(Reservation)
        .filter(
            Reservation.session_id == session_id,
            Reservation.user_id == user_id,
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        )
        .first()
        is not None
    )


def _serialize_session(session: SlotSession, current_user: User | None, db: DbSession) -> SlotSessionRead:
    occupied = _occupied_count(session.id, db)
    available_places = max(session.capacity - occupied, 0)

    is_admin = current_user is not None and current_user.role == UserRole.ADMIN
    show = is_admin or session.entity.show_available_places

    data = SlotSessionRead.model_validate(session)
    data.is_available = available_places > 0
    data.available_places = available_places if show else None
    if not show:
        data.capacity = None

    if is_admin:
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

    if current_user is not None:
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

    if current_user is not None and len(current_user.visible_rooms) == 1:
        # Restringit a un sol grup: no cal repetir-ne el nom al títol.
        data.display_title = compose_display_title(session.title, session.room_name, False)

    return data


def _parse_start_time(raw: str) -> time_:
    parts = raw.strip().split(":")
    if len(parts) != 2 or not all(p.isdigit() for p in parts):
        raise HTTPException(status_code=400, detail=f"Hora no vàlida: «{raw}» (format esperat H:MM)")
    hour, minute = int(parts[0]), int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise HTTPException(status_code=400, detail=f"Hora no vàlida: «{raw}»")
    return time_(hour, minute)


def _resolve_session_room(admin: User, room_id: int | None, db: DbSession) -> int:
    if admin.entity.is_multiroom:
        if room_id is None:
            raise HTTPException(status_code=400, detail="Cal indicar un grup")
        room = db.get(Room, room_id)
        if not room or room.entity_id != admin.entity_id:
            raise HTTPException(status_code=400, detail="Grup no vàlid")
        return room.id

    default_room = db.query(Room).filter(Room.entity_id == admin.entity_id).order_by(Room.id).first()
    return default_room.id


@router.get("", response_model=list[SlotSessionRead])
def list_sessions(
    entity_id: int | None = None,
    db: DbSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    is_admin = current_user is not None and current_user.role == UserRole.ADMIN

    query = db.query(SlotSession)
    if entity_id is not None:
        query = query.filter(SlotSession.entity_id == entity_id)
    if not is_admin:
        query = query.filter(SlotSession.is_active == True)  # noqa: E712 (.is_(True) -> "IS 1", invalid in T-SQL)
    if (
        current_user is not None
        and current_user.role == UserRole.USER
        and current_user.entity is not None
        and current_user.entity.is_multiroom
    ):
        visible_room_ids = current_user.visible_room_ids
        if visible_room_ids:
            query = query.filter(SlotSession.room_id.in_(visible_room_ids))
    sessions = query.order_by(SlotSession.date, SlotSession.start_time).all()

    if not is_admin:
        sessions = [session for session in sessions if not _is_expired(session)]

    if current_user is not None and current_user.role == UserRole.USER:
        sessions = [
            session
            for session in sessions
            if session.entity.visibility_mode != VisibilityMode.AVAILABLE_ONLY
            or _occupied_count(session.id, db) < session.capacity
            or _has_active_reservation(session.id, current_user.id, db)
        ]

    return [_serialize_session(session, current_user, db) for session in sessions]


@router.get("/{session_id}", response_model=SlotSessionRead)
def get_session(
    session_id: int,
    db: DbSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    session = db.get(SlotSession, session_id)
    is_admin = current_user is not None and current_user.role == UserRole.ADMIN
    if not session or (not is_admin and (not session.is_active or _is_expired(session))):
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

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="L'hora de finalització ha de ser posterior a l'hora d'inici")

    room_id = _resolve_session_room(admin, payload.room_id, db)

    data = payload.model_dump(exclude={"room_id"})
    data["description"] = sanitize_rich_text(data.get("description"))
    session = SlotSession(**data, room_id=room_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/pack", response_model=list[SlotSessionRead], status_code=201)
def create_session_pack(
    payload: SlotSessionPackCreate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="La data final ha de ser posterior o igual a la data d'inici")
    if payload.duration_hours <= 0:
        raise HTTPException(status_code=400, detail="La durada ha de ser més gran que 0")
    if payload.capacity < 1:
        raise HTTPException(status_code=400, detail="Les places han de ser almenys 1")
    if not payload.start_times:
        raise HTTPException(status_code=400, detail="Cal indicar almenys una hora d'inici")

    room_id = _resolve_session_room(admin, payload.room_id, db)
    duration = timedelta(hours=payload.duration_hours)
    start_times = [_parse_start_time(raw) for raw in payload.start_times]

    entries = []
    current_date = payload.start_date
    while current_date <= payload.end_date:
        for start_time in start_times:
            end_dt = datetime_.combine(current_date, start_time) + duration
            if end_dt.date() != current_date:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"La sessió de les {start_time.strftime('%H:%M')} del "
                        f"{current_date.isoformat()} no pot acabar l'endemà"
                    ),
                )
            entries.append((current_date, start_time, end_dt.time()))
        current_date += timedelta(days=1)

    if len(entries) > MAX_PACK_SESSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Massa sessions per crear en un sol pack (màxim {MAX_PACK_SESSIONS}); "
                "redueix el rang de dates o el nombre d'hores d'inici"
            ),
        )

    title = payload.title or None
    sessions = [
        SlotSession(
            entity_id=admin.entity_id,
            room_id=room_id,
            title=title,
            date=entry_date,
            start_time=start_time,
            end_time=end_time,
            capacity=payload.capacity,
            is_active=payload.is_active,
        )
        for entry_date, start_time, end_time in entries
    ]
    db.add_all(sessions)
    db.commit()
    for session in sessions:
        db.refresh(session)
    return sessions


def _resolve_owned_sessions(session_ids: list[int], admin: User, db: DbSession) -> list[SlotSession]:
    sessions = db.query(SlotSession).filter(SlotSession.id.in_(session_ids)).all()
    found_ids = {session.id for session in sessions}
    missing_ids = set(session_ids) - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Sessió no trobada: {sorted(missing_ids)}")
    for session in sessions:
        if session.entity_id != admin.entity_id:
            raise HTTPException(status_code=403, detail="No pots gestionar sessions d'una altra entitat")
    return sessions


@router.patch("/bulk-active", response_model=list[SlotSessionRead])
def bulk_update_active(
    payload: SlotSessionBulkActiveUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    sessions = _resolve_owned_sessions(payload.session_ids, admin, db)

    for session in sessions:
        session.is_active = payload.is_active
    db.commit()
    for session in sessions:
        db.refresh(session)
    return [_serialize_session(session, admin, db) for session in sessions]


@router.delete("/bulk", status_code=204)
def bulk_delete_sessions(
    payload: SlotSessionBulkDelete,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    sessions = _resolve_owned_sessions(payload.session_ids, admin, db)
    for session in sessions:
        db.delete(session)
    db.commit()


@router.delete("/expired", response_model=SlotSessionDeleteExpiredResult)
def delete_expired_sessions(
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # L'esborrat de la sessió arrossega (cascade) totes les seves reserves i
    # l'historial de sol·licituds; no es notifica cap usuari (com ja passa amb
    # `delete_session`).
    sessions = db.query(SlotSession).filter(SlotSession.entity_id == admin.entity_id).all()
    expired = [session for session in sessions if _is_expired(session)]
    for session in expired:
        db.delete(session)
    db.commit()
    return SlotSessionDeleteExpiredResult(deleted_count=len(expired))


@router.patch("/bulk-room", response_model=list[SlotSessionRead])
def bulk_update_room(
    payload: SlotSessionBulkRoomUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if not admin.entity.is_multiroom:
        raise HTTPException(status_code=400, detail="Activa el mode multisala per assignar grups")
    room = db.get(Room, payload.room_id)
    if not room or room.entity_id != admin.entity_id:
        raise HTTPException(status_code=400, detail="Grup no vàlid")

    sessions = _resolve_owned_sessions(payload.session_ids, admin, db)
    for session in sessions:
        session.room_id = room.id
    db.commit()
    for session in sessions:
        db.refresh(session)
    return [_serialize_session(session, admin, db) for session in sessions]


@router.patch("/bulk-add-capacity", response_model=list[SlotSessionRead])
def bulk_add_capacity(
    payload: SlotSessionBulkCapacityIncrement,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="El nombre de places a afegir ha de ser més gran que 0")

    sessions = _resolve_owned_sessions(payload.session_ids, admin, db)
    for session in sessions:
        session.capacity += payload.amount
    db.commit()
    for session in sessions:
        db.refresh(session)
    return [_serialize_session(session, admin, db) for session in sessions]


@router.post("/export-reservations-xlsx")
def export_reservations_xlsx(
    payload: SlotSessionExportRequest,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    sessions = _resolve_owned_sessions(payload.session_ids, admin, db)
    sessions.sort(key=lambda session: (session.date, session.start_time))

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Inscrits"
    sheet.append(["Sessió", "Grup", "Data", "Horari", "Usuari", "Nom complet", "Correu electrònic", "Estat"])

    for session in sessions:
        reservations = (
            db.query(Reservation)
            .join(User, Reservation.user_id == User.id)
            .filter(Reservation.session_id == session.id, Reservation.status.in_(ENROLLED_STATUSES))
            .order_by(User.full_name, User.username)
            .all()
        )
        for reservation in reservations:
            user = reservation.user
            sheet.append(
                [
                    session.title or "(sense títol)",
                    session.room_name,
                    session.date.strftime("%d/%m/%Y"),
                    f"{session.start_time.strftime('%H:%M')}-{session.end_time.strftime('%H:%M')}",
                    user.username,
                    user.full_name or "",
                    user.email or "",
                    ENROLLED_STATUS_LABELS[reservation.status],
                ]
            )

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="inscrits.xlsx"'},
    )


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

    effective_start = fields.get("start_time", session.start_time)
    effective_end = fields.get("end_time", session.end_time)
    if effective_end <= effective_start:
        raise HTTPException(status_code=400, detail="L'hora de finalització ha de ser posterior a l'hora d'inici")

    if "description" in fields:
        fields["description"] = sanitize_rich_text(fields["description"])

    room_id = fields.pop("room_id", None)
    if room_id is not None:
        if not admin.entity.is_multiroom:
            raise HTTPException(
                status_code=400,
                detail="Activa el mode multisala per assignar grups",
            )
        room = db.get(Room, room_id)
        if not room or room.entity_id != admin.entity_id:
            raise HTTPException(status_code=400, detail="Grup no vàlid")
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
