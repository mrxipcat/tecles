import enum
from datetime import date as date_, datetime, time as time_

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def compose_display_title(title: str | None, room_name: str | None, show_room: bool) -> str:
    """"Sala: Títol" quan `show_room` és cert i hi ha nom de sala; si no, només el títol
    (o el nom de la sala si el títol és buit)."""
    if not show_room or not room_name:
        return title or room_name or "(sense títol)"
    return f"{room_name}: {title}" if title else room_name


class VisibilityMode(str, enum.Enum):
    ALWAYS = "always"
    AVAILABLE_ONLY = "available_only"


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class ReservationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    CANCELLED_BY_ADMIN = "cancelled_by_admin"


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    # Nom personalitzat del "slot" (sessió/torn/reserva...), configurable per idioma
    # per un superadministrador (`routers/superadmin.py`). La columna original
    # (sense sufix) es manté com a valor català per no requerir cap migració de
    # columna existent; `es`/`en` són columnes noves opcionals afegides a
    # `_add_missing_columns()`. Exposat a l'API com un diccionari (vegeu
    # `slot_label_singular`/`slot_label_plural` @property més avall) i resolt
    # segons l'idioma amb `slot_label()`.
    slot_label_singular_ca: Mapped[str] = mapped_column(
        "slot_label_singular", String(50), nullable=False, default="Sessió"
    )
    slot_label_plural_ca: Mapped[str] = mapped_column(
        "slot_label_plural", String(50), nullable=False, default="Sessions"
    )
    slot_label_singular_es: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slot_label_singular_en: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slot_label_plural_es: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slot_label_plural_en: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Aplicats a `routers/reservations.py::create_reservation`.
    max_reservations_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_reservations_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_reservations_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Aplicat a `routers/sessions.py::list_sessions` per a usuaris no admin.
    visibility_mode: Mapped[VisibilityMode] = mapped_column(
        Enum(VisibilityMode), nullable=False, default=VisibilityMode.ALWAYS
    )

    show_available_places: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_confirm_reservations: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_multiroom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Habilita `POST /auth/register` (`routers/auth.py`) perquè nous usuaris puguin
    # crear-se el seu propi compte des de la pàgina de login, amb rol USER forçat i
    # una contrasenya inicial d'un sol ús enviada per correu.
    allow_self_registration: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Compte i servidor SMTP utilitzats per `app/email_service.py` per enviar les
    # notificacions de reserves i el correu de prova de configuració.
    smtp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    smtp_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_from_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Peu de text (HTML sanititzat) afegit a tots els correus enviats per aquesta entitat.
    email_signature: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    sessions: Mapped[list["SlotSession"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    rooms: Mapped[list["Room"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    # Grups assignats automàticament als usuaris que s'autoregistren (vegeu
    # `entity_self_registration_rooms` més avall); buit = sense restricció, igual que
    # `User.visible_rooms`. Només té efecte real quan `is_multiroom` és cert.
    self_registration_rooms: Mapped[list["Room"]] = relationship(secondary="entity_self_registration_rooms")

    @property
    def slot_label_singular(self) -> dict[str, str | None]:
        return {"ca": self.slot_label_singular_ca, "es": self.slot_label_singular_es, "en": self.slot_label_singular_en}

    @property
    def slot_label_plural(self) -> dict[str, str | None]:
        return {"ca": self.slot_label_plural_ca, "es": self.slot_label_plural_es, "en": self.slot_label_plural_en}

    @property
    def self_registration_room_ids(self) -> list[int]:
        return [room.id for room in self.self_registration_rooms]

    def slot_label(self, lang: str | None, *, plural: bool = False) -> str:
        """Resol l'alies del slot per a `lang`, amb reserva al valor català si no
        s'ha configurat una traducció per aquest idioma."""
        lang = lang if lang in ("es", "en") else "ca"
        prefix = "slot_label_plural" if plural else "slot_label_singular"
        return getattr(self, f"{prefix}_{lang}") or getattr(self, f"{prefix}_ca")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entity: Mapped["Entity"] = relationship(back_populates="rooms")
    sessions: Mapped[list["SlotSession"]] = relationship(back_populates="room")


user_rooms = Table(
    "user_rooms",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("room_id", ForeignKey("rooms.id"), primary_key=True),
)


entity_self_registration_rooms = Table(
    "entity_self_registration_rooms",
    Base.metadata,
    Column("entity_id", ForeignKey("entities.id"), primary_key=True),
    Column("room_id", ForeignKey("rooms.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("entity_id", "username", name="uq_user_entity_username"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int | None] = mapped_column(ForeignKey("entities.id"), nullable=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.USER)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Controla l'accés al portal (vegeu `app/routers/auth.py::login` i
    # `app/dependencies.py::get_current_user`). No afecta superadministradors,
    # que en la pràctica sempre es creen actius.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # None = sense preferència: el frontend fa servir l'idioma del navegador.
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entity: Mapped["Entity | None"] = relationship(back_populates="users")
    # Cap grup assignat = sense restricció (veu tots els grups). Un o més = restringit a aquests.
    visible_rooms: Mapped[list["Room"]] = relationship(secondary=user_rooms)
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def visible_room_ids(self) -> list[int]:
        return [room.id for room in self.visible_rooms]

    @property
    def visible_room_names(self) -> list[str]:
        return [room.name for room in self.visible_rooms]


class SlotSession(Base):
    """Una sessió/aula/sala reservable (el nom visible el defineixen Entity.slot_label_singular/plural)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date_] = mapped_column(Date, nullable=False)
    start_time: Mapped[time_] = mapped_column(Time, nullable=False)
    end_time: Mapped[time_] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entity: Mapped["Entity"] = relationship(back_populates="sessions")
    room: Mapped["Room"] = relationship(back_populates="sessions")
    reservations: Mapped[list["Reservation"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    @property
    def room_name(self) -> str | None:
        return self.room.name if self.room else None

    @property
    def display_title(self) -> str:
        """Valor per defecte quan no hi ha usuari visitant en context (p. ex. respostes
        directes de create/update). `routers/sessions.py` el pot sobreescriure per usuaris
        restringits a una sola sala."""
        return compose_display_title(self.title, self.room_name, self.entity.is_multiroom)


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus), nullable=False, default=ReservationStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped["SlotSession"] = relationship(back_populates="reservations")
    user: Mapped["User"] = relationship(back_populates="reservations")

    @property
    def session_title(self) -> str:
        show_room = self.session.entity.is_multiroom and len(self.user.visible_rooms) != 1
        return compose_display_title(self.session.title, self.session.room_name, show_room)

    @property
    def session_date(self) -> date_:
        return self.session.date

    @property
    def session_start_time(self) -> time_:
        return self.session.start_time

    @property
    def session_end_time(self) -> time_:
        return self.session.end_time
