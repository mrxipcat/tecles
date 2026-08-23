from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session as DbSession

from app.models import (
    Entity,
    Reservation,
    ReservationStatus,
    Room,
    SlotSession,
    User,
    UserRole,
    VisibilityMode,
)

SUPERADMIN_USERNAME = "superadmin"

SUPERADMIN_PASSWORD_HASH = "bfcac35fdc0b279319f5ac68e111cd64$666d5be5c94f922356b39055162c09101bbd16eb665adbbc8c06cac696924d71"


ENTITY_SEEDS = [
    {
        "name": 'Can Rahull',
        "code": 'canrahull',
        "is_multiroom": True,
        "slot_label_singular": {"ca": 'Sala', "es": 'Sala', "en": 'Room'},
        "slot_label_plural": {"ca": 'Sales', "es": 'Salas', "en": 'Rooms'},
        "max_reservations_per_day": None,
        "max_reservations_per_week": None,
        "max_reservations_per_month": None,
        "show_available_places": True,
        "rooms": ['La Quadra', 'El Fogueriu', 'Cuina', 'Recepció A'],
        "users": [
            {"username": 'admin1', "full_name": 'Admin1', "role": UserRole.ADMIN, "password_hash": '9b763ec019e0df6e2f22d8449c199de3$cc5a375da82302f9b0587e2526b6a5b43b176196cdb3f71123dd0a0d8533183c', "must_change_password": False, "visible_rooms": []},
            {"username": 'usuari1', "full_name": 'Usuari1', "role": UserRole.USER, "password_hash": '4943c8be11f8e23c99ab5a80551dca81$561e5aa93f7166ae75368809cfb73f398f70cf951def243b60698f10376d125f', "must_change_password": False, "visible_rooms": []},
            {"username": 'usuari2', "full_name": 'Usuari2', "role": UserRole.USER, "password_hash": 'e45ac3f0ad488326db920a8f13ded182$33dad51d9edf99e725800c854885416b5845b108b91a6c27630a0aca50b3ff64', "must_change_password": False, "visible_rooms": []},
        ],
        "bulk_sessions": [
            {"room": 'La Quadra', "start_days_ahead": 9, "num_days": 30, "capacity": 1, "slot_times": [(time(9, 0), time(11, 0)), (time(11, 0), time(13, 0)), (time(13, 0), time(15, 0)), (time(15, 0), time(17, 0)), (time(17, 0), time(19, 0)), (time(19, 0), time(21, 0))]},
            {"room": 'El Fogueriu', "start_days_ahead": 9, "num_days": 30, "capacity": 1, "slot_times": [(time(9, 0), time(11, 0)), (time(11, 0), time(13, 0)), (time(13, 0), time(15, 0)), (time(15, 0), time(17, 0)), (time(17, 0), time(19, 0)), (time(19, 0), time(21, 0))]},
        ],
    },
    {
        "name": 'Sax Sala',
        "code": 'saxsala',
        "is_multiroom": True,
        "slot_label_singular": {"ca": 'Classe', "es": 'Clase', "en": 'Class'},
        "slot_label_plural": {"ca": 'Classes', "es": 'Clases', "en": 'Classes'},
        "max_reservations_per_day": 3,
        "max_reservations_per_week": 3,
        "max_reservations_per_month": 3,
        "show_available_places": True,
        "rooms": ['Grup A', 'Grup B'],
        "users": [
            {"username": 'admin2', "full_name": 'Admin2', "role": UserRole.ADMIN, "password_hash": '1dd66dc31e462e3ef272b0ff978370e0$d8cf75d1e72df53c03a2c056eeef61fcc817d12f8f83f8b3452ccd045fbe0fc1', "must_change_password": False, "visible_rooms": []},
            {"username": 'usuari1', "full_name": 'Usuari 1', "role": UserRole.USER, "password_hash": '147a4b48ad8b4416f4d188fbcfe76211$6dda1f1d6eacb35608147191896d460e7d18bd96597e0d53d25081683f7d7215', "must_change_password": True, "visible_rooms": ['Grup A']},
            {"username": 'usuari2', "full_name": 'Usuari 2', "role": UserRole.USER, "password_hash": '0aac1bf6bb8973a9bf8e003b82880c15$d600c61dc930f2be9ec08f46d9e5fd4687eb42735e7e03128e3a35fd1b95cc45', "must_change_password": True, "visible_rooms": ['Grup B']},
        ],
        "sample_sessions": [
            {"room": 'Grup A', "title": 'Classe de ioga', "description": 'Classe introductòria de ioga per a tots els nivells.', "days_ahead": 1, "start_time": time(9, 0), "end_time": time(10, 0), "capacity": 15},
            {"room": 'Grup A', "title": 'Classe de pilates', "description": 'Classe de pilates de nivell mitjà.', "days_ahead": 2, "start_time": time(18, 0), "end_time": time(19, 0), "capacity": 12},
            {"room": 'Grup B', "title": 'Classe de cuina', "description": 'Classe pràctica de cuina mediterrània.', "days_ahead": 4, "start_time": time(17, 0), "end_time": time(19, 0), "capacity": 8},
        ],
    },
    {
        "name": 'Afomont',
        "code": 'afomont',
        "is_multiroom": True,
        "slot_label_singular": {"ca": 'Sessió', "es": 'Sesión', "en": 'Session'},
        "slot_label_plural": {"ca": 'Sessions', "es": 'Sesiones', "en": 'Sessions'},
        "max_reservations_per_day": 2,
        "max_reservations_per_week": 9,
        "max_reservations_per_month": 20,
        "show_available_places": True,
        "rooms": ['Estudi', 'Exterior', 'Boudoir'],
        "users": [
            {"username": 'admin3', "full_name": 'Admin 3', "role": UserRole.ADMIN, "password_hash": 'e3b097ce8058fb6f50301123a66d75f2$d6a5c765d1ff0cf2d008ebd453a0bf1b050bec80d317ca70e780179d69fe0921', "must_change_password": False, "visible_rooms": []},
            {"username": 'usuari2', "full_name": 'Usuari 2', "role": UserRole.USER, "password_hash": 'd9f5b6e8c4715c0ef57aa595ca9f7bcb$2bf6caa4cb30d478035eede043c9b74efa81773ad3adcce4287753327158cef5', "must_change_password": True, "visible_rooms": []},
            {"username": 'usuari1', "full_name": 'Usuari 1', "role": UserRole.USER, "password_hash": '253e4c9e5113ae38fc9889f86d5f09bb$8b1f693128bd74fa2923adc7b33aa950277ff998189d409878f72739acc6d88b', "must_change_password": True, "visible_rooms": ['Estudi', 'Exterior']},
        ],
        "sample_sessions": [
            {"room": 'Estudi', "title": 'Model Marina', "description": 'El seu litmind és ...&nbsp;<br>\nBusca fotos tipus ...', "days_ahead": 12, "start_time": time(16, 0), "end_time": time(18, 30), "capacity": 4},
            {"room": 'Exterior', "title": 'Pack 2 models a Montjuïc', "description": '<b>Dues models que busquen fotos per separat</b>', "days_ahead": 14, "start_time": time(10, 0), "end_time": time(13, 0), "capacity": 4},
        ],
    },
    {
        "name": 'Comunitat de Veïns AAA',
        "code": 'comveins',
        "is_multiroom": False,
        "slot_label_singular": {"ca": 'Reunió', "es": 'Reunión', "en": 'Meeting'},
        "slot_label_plural": {"ca": 'Reunions', "es": 'Reuniones', "en": 'Meetings'},
        "max_reservations_per_day": 99,
        "max_reservations_per_week": 99,
        "max_reservations_per_month": 99,
        "show_available_places": False,
        "rooms": ['Principal'],
        "users": [
            {"username": 'admin1', "full_name": 'Admin 1', "role": UserRole.ADMIN, "password_hash": '27c187f8954934d564de9b7c88f6c37c$53e47b2fc6dbc725a0b7e5dfa7df1e4defe63fe6bf61f307db4d308f928e8b29', "must_change_password": False, "visible_rooms": []},
            {"username": 'usuari1', "full_name": 'Usuari 1', "role": UserRole.USER, "password_hash": '0ed07882a35bece142f74fbe5da9ae95$eb90dfd58a2dcfa44f86263ea24a70fdaf651e9c74ea02b1f40e354fbbd7a3f0', "must_change_password": False, "visible_rooms": []},
        ],
        "sample_sessions": [
            {"room": 'Principal', "title": 'Reunió anual veïns escala A', "description": None, "days_ahead": 23, "start_time": time(10, 0), "end_time": time(12, 0), "capacity": 99},
            {"room": 'Principal', "title": 'Reparació teulada', "description": None, "days_ahead": 26, "start_time": time(18, 0), "end_time": time(19, 0), "capacity": 99},
        ],
    },
]


# Reserves ja confirmades sobre alguns dels slots generats, per deixar constancia
# de com queda una entitat amb activitat real (totes fetes per l'admin de Can Rahull).
RESERVATION_SEEDS = [
    {"entity_code": 'canrahull', "room": 'La Quadra', "days_ahead": 9, "start_time": time(11, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'El Fogueriu', "days_ahead": 9, "start_time": time(13, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'La Quadra', "days_ahead": 9, "start_time": time(17, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'La Quadra', "days_ahead": 9, "start_time": time(19, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'La Quadra', "days_ahead": 10, "start_time": time(15, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'El Fogueriu', "days_ahead": 11, "start_time": time(13, 0), "username": 'admin1', "status": "CONFIRMED"},
    {"entity_code": 'canrahull', "room": 'El Fogueriu', "days_ahead": 11, "start_time": time(19, 0), "username": 'admin1', "status": "CONFIRMED"},
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
        password_hash=SUPERADMIN_PASSWORD_HASH,
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
        max_reservations_per_day=config["max_reservations_per_day"],
        max_reservations_per_week=config["max_reservations_per_week"],
        max_reservations_per_month=config["max_reservations_per_month"],
        visibility_mode=VisibilityMode.ALWAYS,
        show_available_places=config["show_available_places"],
        auto_confirm_reservations=True,
        is_multiroom=config["is_multiroom"],
    )
    db.add(entity)
    db.flush()

    rooms_by_name = {}
    for name in config["rooms"]:
        room = Room(entity_id=entity.id, name=name)
        db.add(room)
        rooms_by_name[name] = room
    db.flush()

    for user_config in config["users"]:
        user = User(
            entity_id=entity.id,
            username=user_config["username"],
            full_name=user_config["full_name"],
            role=user_config["role"],
            password_hash=user_config["password_hash"],
            must_change_password=user_config["must_change_password"],
            visible_rooms=[rooms_by_name[name] for name in user_config["visible_rooms"]],
        )
        db.add(user)
    db.flush()

    today = date.today()
    for bulk in config.get("bulk_sessions", []):
        room = rooms_by_name[bulk["room"]]
        for day_offset in range(bulk["num_days"]):
            session_date = today + timedelta(days=bulk["start_days_ahead"] + day_offset)
            for start_time, end_time in bulk["slot_times"]:
                db.add(
                    SlotSession(
                        entity_id=entity.id,
                        room_id=room.id,
                        date=session_date,
                        start_time=start_time,
                        end_time=end_time,
                        capacity=bulk["capacity"],
                    )
                )

    for s in config.get("sample_sessions", []):
        db.add(
            SlotSession(
                entity_id=entity.id,
                room_id=rooms_by_name[s["room"]].id,
                title=s["title"],
                description=s["description"],
                date=today + timedelta(days=s["days_ahead"]),
                start_time=s["start_time"],
                end_time=s["end_time"],
                capacity=s["capacity"],
            )
        )
    db.commit()


def _seed_reservations(db: DbSession) -> None:
    """Seed idempotent: no duplica una reserva ja existent per (sessio, usuari)."""
    today = date.today()
    for r in RESERVATION_SEEDS:
        entity = db.query(Entity).filter(Entity.code == r["entity_code"]).first()
        if not entity:
            continue
        room = db.query(Room).filter(Room.entity_id == entity.id, Room.name == r["room"]).first()
        if not room:
            continue
        session_date = today + timedelta(days=r["days_ahead"])
        session = (
            db.query(SlotSession)
            .filter(
                SlotSession.room_id == room.id,
                SlotSession.date == session_date,
                SlotSession.start_time == r["start_time"],
            )
            .first()
        )
        user = (
            db.query(User)
            .filter(User.entity_id == entity.id, User.username == r["username"])
            .first()
        )
        if not session or not user:
            continue
        exists = (
            db.query(Reservation)
            .filter(Reservation.session_id == session.id, Reservation.user_id == user.id)
            .first()
        )
        if exists:
            continue
        status = ReservationStatus[r["status"]]
        db.add(
            Reservation(
                session_id=session.id,
                user_id=user.id,
                status=status,
                confirmed_at=datetime.utcnow() if status == ReservationStatus.CONFIRMED else None,
            )
        )
    db.commit()


def run_seed(db: DbSession) -> None:
    _seed_superadmin(db)
    for config in ENTITY_SEEDS:
        _seed_entity(db, config)
    _seed_reservations(db)
