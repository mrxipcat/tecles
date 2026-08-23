from datetime import date, time, timedelta

from sqlalchemy.orm import Session as DbSession

from app.models import Entity, Room, SlotSession, User, UserRole, VisibilityMode
from app.security import hash_password

SUPERADMIN_USERNAME = "superadmin"

# Dues entitats de demo/seed amb vocabularis diferents (una sense multisala,
# l'altra amb) perquè quedi clar que l'alies del slot i el mode multisala són
# independents per entitat.
ENTITY_SEEDS = [
    {
        "name": "Can Rahull",
        "code": "can-rahull",
        "is_multiroom": False,
        "slot_label_singular": {"ca": "Sala", "es": "Sala", "en": "Room"},
        "slot_label_plural": {"ca": "Sales", "es": "Salas", "en": "Rooms"},
        "rooms": ["Principal"],
        "admin_username": "admin1",
        "user_usernames": ["usuari1", "usuari2"],
        "sample_sessions": [
            {
                "room_index": 0,
                "title": "Reunió de veïns",
                "description": "Reunió ordinària de la comunitat.",
                "days_ahead": 1,
                "start_time": time(18, 0),
                "end_time": time(19, 30),
                "capacity": 20,
            },
            {
                "room_index": 0,
                "title": "Neteja comunitària",
                "description": "Jornada de neteja i manteniment de la sala.",
                "days_ahead": 3,
                "start_time": time(10, 0),
                "end_time": time(12, 0),
                "capacity": 10,
            },
        ],
    },
    {
        "name": "Sax Sala",
        "code": "sax-sala",
        "is_multiroom": True,
        "slot_label_singular": {"ca": "Classe", "es": "Clase", "en": "Class"},
        "slot_label_plural": {"ca": "Classes", "es": "Clases", "en": "Classes"},
        "rooms": ["Grup A", "Grup B"],
        "admin_username": "admin2",
        "user_usernames": ["usuari3", "usuari4"],
        "sample_sessions": [
            {
                "room_index": 0,
                "title": "Classe de ioga",
                "description": "Classe introductòria de ioga per a tots els nivells.",
                "days_ahead": 1,
                "start_time": time(9, 0),
                "end_time": time(10, 0),
                "capacity": 15,
            },
            {
                "room_index": 0,
                "title": "Classe de pilates",
                "description": "Classe de pilates de nivell mitjà.",
                "days_ahead": 2,
                "start_time": time(18, 0),
                "end_time": time(19, 0),
                "capacity": 12,
            },
            {
                "room_index": 1,
                "title": "Classe de cuina",
                "description": "Classe pràctica de cuina mediterrània.",
                "days_ahead": 4,
                "start_time": time(17, 0),
                "end_time": time(19, 0),
                "capacity": 8,
            },
        ],
    },
]


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


def _seed_entity(db: DbSession, config: dict) -> None:
    """Seed idempotent: si l'entitat (pel `code`) ja existeix, no fa res."""
    if db.query(Entity).filter(Entity.code == config["code"]).first():
        return

    entity = Entity(
        name=config["name"],
        code=config["code"],
        slot_label_singular_ca=config["slot_label_singular"]["ca"],
        slot_label_singular_es=config["slot_label_singular"]["es"],
        slot_label_singular_en=config["slot_label_singular"]["en"],
        slot_label_plural_ca=config["slot_label_plural"]["ca"],
        slot_label_plural_es=config["slot_label_plural"]["es"],
        slot_label_plural_en=config["slot_label_plural"]["en"],
        visibility_mode=VisibilityMode.ALWAYS,
        show_available_places=True,
        auto_confirm_reservations=True,
        is_multiroom=config["is_multiroom"],
    )
    db.add(entity)
    db.flush()

    rooms = [Room(entity_id=entity.id, name=name) for name in config["rooms"]]
    db.add_all(rooms)
    db.flush()

    admin = User(
        entity_id=entity.id,
        username=config["admin_username"],
        full_name=config["admin_username"].capitalize(),
        role=UserRole.ADMIN,
        password_hash=hash_password(config["admin_username"]),
        must_change_password=False,
    )
    users = [
        User(
            entity_id=entity.id,
            username=username,
            full_name=username.capitalize(),
            role=UserRole.USER,
            password_hash=hash_password(username),
            must_change_password=False,
        )
        for username in config["user_usernames"]
    ]
    db.add_all([admin, *users])
    db.flush()

    today = date.today()
    sessions = [
        SlotSession(
            entity_id=entity.id,
            room_id=rooms[s["room_index"]].id,
            title=s["title"],
            description=s["description"],
            date=today + timedelta(days=s["days_ahead"]),
            start_time=s["start_time"],
            end_time=s["end_time"],
            capacity=s["capacity"],
        )
        for s in config["sample_sessions"]
    ]
    db.add_all(sessions)
    db.commit()


def run_seed(db: DbSession) -> None:
    _seed_superadmin(db)
    for config in ENTITY_SEEDS:
        _seed_entity(db, config)
