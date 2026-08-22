from datetime import date as date_, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.email_service import prepare_reservation_email, send_prepared_email
from app.models import Reservation, ReservationStatus, SlotSession, User, UserRole
from app.schemas import (
    ReservationAdminRead,
    ReservationBulkSessionAction,
    ReservationCreate,
    ReservationDecision,
    ReservationRead,
)

router = APIRouter(prefix="/reservations", tags=["reservations"])

ACTIVE_STATUSES = (ReservationStatus.PENDING, ReservationStatus.CONFIRMED)


def _lock_session_for_reservation(db: DbSession, session_id: int) -> SlotSession | None:
    """Bloqueja la fila de la sessió abans de comptar places, per evitar que dues
    reserves concurrents vegin totes dues "places lliures" i sobrereservin.

    Tanca primer qualsevol transacció de només lectura ja oberta (p. ex. la consulta
    de l'usuari autenticat feta per les dependències) perquè el lock es prengui just
    en obrir la transacció nova, no a mitges.
    """
    db.rollback()
    dialect = db.bind.dialect.name
    if dialect == "sqlite":
        # SQLite no té bloqueig de fila: BEGIN IMMEDIATE agafa el lock d'escriptura
        # de tota la base de dades abans de llegir, eliminant la finestra de cursa.
        db.execute(text("BEGIN IMMEDIATE"))
        return db.get(SlotSession, session_id)
    if dialect == "mssql":
        # SQL Server no admet FOR UPDATE; cal un hint de taula perquè el SELECT ja
        # prengui un lock exclusiu de fila.
        return (
            db.query(SlotSession)
            .with_hint(SlotSession, "WITH (UPDLOCK, ROWLOCK, HOLDLOCK)", "mssql")
            .filter(SlotSession.id == session_id)
            .first()
        )
    return db.query(SlotSession).filter(SlotSession.id == session_id).with_for_update().first()


def _count_active_reservations_in_range(user_id: int, start: date_, end: date_, db: DbSession) -> int:
    return (
        db.query(Reservation)
        .join(SlotSession, Reservation.session_id == SlotSession.id)
        .filter(
            Reservation.user_id == user_id,
            Reservation.status.in_(ACTIVE_STATUSES),
            SlotSession.date >= start,
            SlotSession.date <= end,
        )
        .count()
    )


def _check_reservation_limits(user: User, session: SlotSession, db: DbSession) -> None:
    entity = session.entity
    day = session.date

    if entity.max_reservations_per_day is not None:
        count = _count_active_reservations_in_range(user.id, day, day, db)
        if count >= entity.max_reservations_per_day:
            raise HTTPException(status_code=400, detail="Has arribat al límit de reserves per dia d'aquesta entitat")

    if entity.max_reservations_per_week is not None:
        week_start = day - timedelta(days=day.weekday())
        week_end = week_start + timedelta(days=6)
        count = _count_active_reservations_in_range(user.id, week_start, week_end, db)
        if count >= entity.max_reservations_per_week:
            raise HTTPException(status_code=400, detail="Has arribat al límit de reserves per setmana d'aquesta entitat")

    if entity.max_reservations_per_month is not None:
        month_start = day.replace(day=1)
        next_month_start = (
            date_(day.year + 1, 1, 1) if day.month == 12 else date_(day.year, day.month + 1, 1)
        )
        month_end = next_month_start - timedelta(days=1)
        count = _count_active_reservations_in_range(user.id, month_start, month_end, db)
        if count >= entity.max_reservations_per_month:
            raise HTTPException(status_code=400, detail="Has arribat al límit de reserves per mes d'aquesta entitat")


@router.get("", response_model=list[ReservationAdminRead])
def list_reservations(
    session_id: int | None = None,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Reservation)
    if session_id is not None:
        session = db.get(SlotSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Sessió no trobada")
        if current_user.role != UserRole.ADMIN or current_user.entity_id != session.entity_id:
            raise HTTPException(status_code=403, detail="Només un administrador pot veure totes les reserves d'una sessió")
        query = query.filter(Reservation.session_id == session_id)
    else:
        query = query.filter(Reservation.user_id == current_user.id)

    return query.order_by(Reservation.created_at.desc()).all()


@router.post("", response_model=ReservationRead, status_code=201)
def create_reservation(
    payload: ReservationCreate,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _lock_session_for_reservation(db, payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessió no trobada")
    if session.entity_id != current_user.entity_id:
        raise HTTPException(status_code=403, detail="No pots reservar una sessió d'una altra entitat")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Aquesta sessió no està disponible")
    if current_user.role == UserRole.USER and current_user.entity.is_multiroom:
        visible_ids = set(current_user.visible_room_ids)
        if visible_ids and session.room_id not in visible_ids:
            raise HTTPException(
                status_code=403,
                detail="No pots reservar en un grup fora dels que tens assignats",
            )

    occupied = (
        db.query(Reservation)
        .filter(
            Reservation.session_id == session.id,
            Reservation.status.in_(ACTIVE_STATUSES),
        )
        .count()
    )
    if occupied >= session.capacity:
        raise HTTPException(status_code=400, detail="No hi ha places disponibles")

    overlapping = (
        db.query(Reservation)
        .join(SlotSession, Reservation.session_id == SlotSession.id)
        .filter(
            Reservation.user_id == current_user.id,
            Reservation.status.in_(ACTIVE_STATUSES),
            SlotSession.date == session.date,
            SlotSession.start_time < session.end_time,
            SlotSession.end_time > session.start_time,
        )
        .first()
    )
    if overlapping:
        raise HTTPException(
            status_code=400,
            detail="Ja tens una reserva que coincideix, totalment o parcialment, amb aquest horari",
        )

    _check_reservation_limits(current_user, session, db)

    auto_confirm = session.entity.auto_confirm_reservations
    reservation = Reservation(
        session_id=session.id,
        user_id=current_user.id,
        status=ReservationStatus.CONFIRMED if auto_confirm else ReservationStatus.PENDING,
        confirmed_at=datetime.utcnow() if auto_confirm else None,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    prepared = prepare_reservation_email(reservation, "confirmed" if auto_confirm else "requested")
    if prepared:
        background_tasks.add_task(send_prepared_email, prepared)

    return reservation


def _validate_owned_sessions(session_ids: list[int], admin: User, db: DbSession) -> None:
    sessions = db.query(SlotSession).filter(SlotSession.id.in_(session_ids)).all()
    found_ids = {session.id for session in sessions}
    missing_ids = set(session_ids) - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Sessió no trobada: {sorted(missing_ids)}")
    for session in sessions:
        if session.entity_id != admin.entity_id:
            raise HTTPException(status_code=403, detail="No pots gestionar sessions d'una altra entitat")


@router.patch("/bulk-confirm", response_model=list[ReservationAdminRead])
def bulk_confirm_reservations(
    payload: ReservationBulkSessionAction,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    _validate_owned_sessions(payload.session_ids, admin, db)

    reservations = (
        db.query(Reservation)
        .filter(Reservation.session_id.in_(payload.session_ids), Reservation.status == ReservationStatus.PENDING)
        .all()
    )
    for reservation in reservations:
        reservation.status = ReservationStatus.CONFIRMED
        reservation.confirmed_at = datetime.utcnow()
    prepared_emails = [prepare_reservation_email(reservation, "confirmed") for reservation in reservations]
    db.commit()
    for reservation in reservations:
        db.refresh(reservation)
    for prepared in prepared_emails:
        if prepared:
            background_tasks.add_task(send_prepared_email, prepared)
    return reservations


@router.patch("/bulk-cancel", response_model=list[ReservationAdminRead])
def bulk_cancel_reservations(
    payload: ReservationBulkSessionAction,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    _validate_owned_sessions(payload.session_ids, admin, db)

    reservations = (
        db.query(Reservation)
        .filter(Reservation.session_id.in_(payload.session_ids), Reservation.status.in_(ACTIVE_STATUSES))
        .all()
    )
    for reservation in reservations:
        reservation.status = ReservationStatus.CANCELLED_BY_ADMIN
    prepared_emails = [prepare_reservation_email(reservation, "cancelled_by_admin") for reservation in reservations]
    db.commit()
    for reservation in reservations:
        db.refresh(reservation)
    for prepared in prepared_emails:
        if prepared:
            background_tasks.add_task(send_prepared_email, prepared)
    return reservations


@router.patch("/{reservation_id}", response_model=ReservationAdminRead)
def decide_reservation(
    reservation_id: int,
    payload: ReservationDecision,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no trobada")
    if reservation.session.entity_id != admin.entity_id:
        raise HTTPException(status_code=403, detail="No pots gestionar reserves d'una altra entitat")
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Aquesta reserva ja no està pendent")
    if payload.status not in (ReservationStatus.CONFIRMED, ReservationStatus.REJECTED):
        raise HTTPException(status_code=400, detail="Estat no vàlid per a aquesta acció")

    reservation.status = payload.status
    if payload.status == ReservationStatus.CONFIRMED:
        reservation.confirmed_at = datetime.utcnow()

    event = "confirmed" if payload.status == ReservationStatus.CONFIRMED else "cancelled_by_admin"
    prepared = prepare_reservation_email(reservation, event)

    db.commit()
    db.refresh(reservation)

    if prepared:
        background_tasks.add_task(send_prepared_email, prepared)

    return reservation


@router.delete("/{reservation_id}", status_code=204)
def cancel_reservation(
    reservation_id: int,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no trobada")

    is_owner = reservation.user_id == current_user.id
    is_admin_same_entity = (
        current_user.role == UserRole.ADMIN and reservation.session.entity_id == current_user.entity_id
    )
    if not (is_owner or is_admin_same_entity):
        raise HTTPException(status_code=403, detail="No pots cancel·lar aquesta reserva")
    if reservation.status not in ACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail="Aquesta reserva ja no és activa")

    cancelled_by_admin = is_admin_same_entity and not is_owner
    reservation.status = ReservationStatus.CANCELLED_BY_ADMIN if cancelled_by_admin else ReservationStatus.CANCELLED

    prepared = prepare_reservation_email(reservation, "cancelled_by_admin" if cancelled_by_admin else "cancelled_by_user")

    db.commit()

    if prepared:
        background_tasks.add_task(send_prepared_email, prepared)
