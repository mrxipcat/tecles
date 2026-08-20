from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models import Reservation, ReservationStatus, SlotSession, User, UserRole
from app.schemas import ReservationAdminRead, ReservationCreate, ReservationDecision, ReservationRead

router = APIRouter(prefix="/reservations", tags=["reservations"])


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
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Els administradors no poden fer reserves")

    session = db.get(SlotSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessió no trobada")
    if session.entity_id != current_user.entity_id:
        raise HTTPException(status_code=403, detail="No pots reservar una sessió d'una altra entitat")
    if current_user.assigned_room_id is not None and session.room_id != current_user.assigned_room_id:
        room_singular = current_user.entity.room_label_singular.lower()
        raise HTTPException(
            status_code=403, detail=f"No pots reservar en {room_singular} fora de la que tens assignada"
        )

    occupied = (
        db.query(Reservation)
        .filter(
            Reservation.session_id == session.id,
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
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
            Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
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

    # TODO(sprint6): aplicar límits max_reservations_per_day/week/month de l'entitat.

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
    return reservation


@router.patch("/{reservation_id}", response_model=ReservationAdminRead)
def decide_reservation(
    reservation_id: int,
    payload: ReservationDecision,
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

    db.commit()
    db.refresh(reservation)
    return reservation


@router.delete("/{reservation_id}", status_code=204)
def cancel_reservation(
    reservation_id: int,
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

    reservation.status = ReservationStatus.CANCELLED
    db.commit()
