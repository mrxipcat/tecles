import enum
from datetime import date as date_, datetime, time as time_

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def compose_display_title(title: str | None, room_name: str | None, show_room: bool) -> str:
    """"Sala: Títol" quan `show_room` és cert i hi ha nom de sala; si no, només el títol
    (o el nom de la sala si el títol és buit)."""
    label = title or "(sense títol)"
    if not show_room or not room_name:
        return label
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


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    slot_label_singular: Mapped[str] = mapped_column(String(50), nullable=False, default="Sessió")
    slot_label_plural: Mapped[str] = mapped_column(String(50), nullable=False, default="Sessions")
    room_label_singular: Mapped[str] = mapped_column(String(50), nullable=False, default="Sala")
    room_label_plural: Mapped[str] = mapped_column(String(50), nullable=False, default="Sales")

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

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    sessions: Mapped[list["SlotSession"]] = relationship(back_populates="entity", cascade="all, delete-orphan")
    rooms: Mapped[list["Room"]] = relationship(back_populates="entity", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entity: Mapped["Entity"] = relationship(back_populates="rooms")
    sessions: Mapped[list["SlotSession"]] = relationship(back_populates="room")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("entity_id", "username", name="uq_user_entity_username"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int | None] = mapped_column(ForeignKey("entities.id"), nullable=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.USER)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Si s'omple, restringeix aquest usuari a veure/reservar només els slots d'aquesta sala.
    assigned_room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entity: Mapped["Entity | None"] = relationship(back_populates="users")
    assigned_room: Mapped["Room | None"] = relationship(foreign_keys=[assigned_room_id])
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def assigned_room_name(self) -> str | None:
        return self.assigned_room.name if self.assigned_room else None


class SlotSession(Base):
    """Una sessió/aula/sala reservable (el nom visible el defineixen Entity.slot_label_singular/plural)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    date: Mapped[date_] = mapped_column(Date, nullable=False)
    start_time: Mapped[time_] = mapped_column(Time, nullable=False)
    end_time: Mapped[time_] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
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
        show_room = self.session.entity.is_multiroom and self.user.assigned_room_id is None
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
