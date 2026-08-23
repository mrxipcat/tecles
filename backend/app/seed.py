from datetime import date, time, timedelta

from sqlalchemy.orm import Session as DbSession

from app.models import Entity, Room, SlotSession, User, UserRole, VisibilityMode
from app.security import hash_password

DEMO_ENTITY_CODE = "demo"
SUPERADMIN_USERNAME = "superadmin"


def _seed_superadmin(db: DbSession) -> None:
    existing = (
        db.query(User)
        .filter(User.entity_id.is_(None), User.username == SUPERADMIN_USERNAME)
        .first()
    )
    if existing:
        return

    superadmin = User(
        entity_id=None,
        username=SUPERADMIN_USERNAME,
        full_name="Superadministrador",
        role=UserRole.SUPERADMIN,
        password_hash=hash_password("super123"),
        must_change_password=False,
    )
    db.add(superadmin)
    db.commit()


def run_seed(db: DbSession) -> None:
    """Seed idempotent: si l'entitat demo ja existeix, no fa res (excepte comprovar el superadmin)."""
    _seed_superadmin(db)

    entity = db.query(Entity).filter(Entity.code == DEMO_ENTITY_CODE).first()
    if entity:
        return

    entity = Entity(
        name="Demo Entitat",
        code=DEMO_ENTITY_CODE,
        slot_label_singular_ca="Sessió",
        slot_label_plural_ca="Sessions",
        slot_label_singular_es="Sesión",
        slot_label_plural_es="Sesiones",
        slot_label_singular_en="Session",
        slot_label_plural_en="Sessions",
        max_reservations_per_day=2,
        max_reservations_per_week=5,
        max_reservations_per_month=15,
        visibility_mode=VisibilityMode.ALWAYS,
        show_available_places=True,
        auto_confirm_reservations=False,
        is_multiroom=True,
    )
    db.add(entity)
    db.flush()

    room_a = Room(entity_id=entity.id, name="Sala A")
    room_b = Room(entity_id=entity.id, name="Sala B")
    db.add_all([room_a, room_b])
    db.flush()

    admin = User(
        entity_id=entity.id,
        username="admin",
        full_name="Administrador Demo",
        role=UserRole.ADMIN,
        password_hash=hash_password("admin123"),
        must_change_password=False,
    )
    user = User(
        entity_id=entity.id,
        username="usuari",
        full_name="Usuari Demo",
        role=UserRole.USER,
        password_hash=hash_password("usuari123"),
        must_change_password=False,
    )
    db.add_all([admin, user])
    db.flush()

    today = date.today()
    sample_sessions = [
        SlotSession(
            entity_id=entity.id,
            room_id=room_a.id,
            title="Ioga matinal",
            description="Sessió introductòria de ioga per a tots els nivells.",
            date=today + timedelta(days=1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            capacity=8,
        ),
        SlotSession(
            entity_id=entity.id,
            room_id=room_a.id,
            title="Sala d'estudi - Torn tarda",
            description="Reserva d'una plaça a la sala d'estudi.",
            date=today + timedelta(days=2),
            start_time=time(15, 0),
            end_time=time(18, 0),
            capacity=1,
        ),
        SlotSession(
            entity_id=entity.id,
            room_id=room_b.id,
            title="Taller de cuina",
            description="Taller pràctic de cuina mediterrània.",
            date=today + timedelta(days=5),
            start_time=time(18, 0),
            end_time=time(20, 0),
            capacity=12,
        ),
        SlotSession(
            entity_id=entity.id,
            room_id=room_b.id,
            title="Aula d'informàtica",
            description="Ús lliure de l'aula d'informàtica.",
            date=today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=6,
        ),
    ]
    db.add_all(sample_sessions)
    db.commit()
