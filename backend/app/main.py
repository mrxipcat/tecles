import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, entities, reservations, rooms, sessions, superadmin, users
from app.seed import run_seed

app = FastAPI(title="WebAules API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(entities.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(superadmin.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")


def _migrate_legacy_assigned_room() -> None:
    """Còpia best-effort de l'antiga `users.assigned_room_id` (relació 1:1) a la nova
    taula `user_rooms` (relació N:N), per a bases de dades creades abans d'aquest canvi.
    `create_all` no elimina columnes: la columna antiga simplement queda sense ús."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "assigned_room_id" not in columns:
        return

    with engine.begin() as conn:
        already_migrated = conn.execute(text("SELECT COUNT(*) FROM user_rooms")).scalar()
        if already_migrated:
            return
        conn.execute(
            text(
                "INSERT INTO user_rooms (user_id, room_id) "
                "SELECT id, assigned_room_id FROM users WHERE assigned_room_id IS NOT NULL"
            )
        )


def _add_missing_columns() -> None:
    """Afegeix columnes noves a taules que ja existien abans d'incorporar-les al
    model (`create_all` no altera taules existents, només en crea de noves)."""
    inspector = inspect(engine)
    dialect = engine.dialect.name
    bool_type = "BIT" if dialect == "mssql" else "BOOLEAN"
    text_type = "NVARCHAR(MAX)" if dialect == "mssql" else "TEXT"
    specs = [
        ("sessions", "is_active", f"{bool_type} NOT NULL DEFAULT 1"),
        ("users", "email", "VARCHAR(255) NULL"),
        ("users", "is_active", f"{bool_type} NOT NULL DEFAULT 1"),
        ("users", "language", "VARCHAR(10) NULL"),
        ("entities", "smtp_host", "VARCHAR(255) NULL"),
        ("entities", "smtp_port", "INTEGER NULL"),
        ("entities", "smtp_username", "VARCHAR(255) NULL"),
        ("entities", "smtp_password", "VARCHAR(255) NULL"),
        ("entities", "smtp_from_email", "VARCHAR(255) NULL"),
        ("entities", "smtp_use_tls", f"{bool_type} NOT NULL DEFAULT 1"),
        ("entities", "email_signature", f"{text_type} NULL"),
        ("entities", "slot_label_singular_es", "VARCHAR(50) NULL"),
        ("entities", "slot_label_singular_en", "VARCHAR(50) NULL"),
        ("entities", "slot_label_plural_es", "VARCHAR(50) NULL"),
        ("entities", "slot_label_plural_en", "VARCHAR(50) NULL"),
    ]
    with engine.begin() as conn:
        for table, column, ddl in specs:
            if table not in inspector.get_table_names():
                continue
            if column in {col["name"] for col in inspector.get_columns(table)}:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD {column} {ddl}"))


def _retry_on_transient_db_error(fn, attempts: int = 5, delay_seconds: float = 5.0) -> None:
    """Azure SQL Serverless posa la base de dades en pausa quan no hi ha activitat; la
    primera connexió després d'una pausa pot trigar mig minut a "despertar-la" i mentrestant
    respon amb un OperationalError transitori. Com que aquesta funció es crida en important
    el mòdul (vegeu `ensure_db_ready`), una excepció aquí deixa el worker de Functions
    permanentment trencat fins al següent arrencada freda — per això cal reintentar-ho aquí
    en lloc de deixar-la pujar."""
    for attempt in range(1, attempts + 1):
        try:
            fn()
            return
        except OperationalError:
            if attempt == attempts:
                raise
            time.sleep(delay_seconds)


def ensure_db_ready() -> None:
    """Crea les taules i sembra les dades de demo si cal.

    Es crida des de l'esdeveniment `startup` de FastAPI (servidor ASGI local,
    p. ex. uvicorn) i també explícitament des de `backend/ApiHandler/__init__.py`:
    el pont ASGI d'Azure Functions no envia el protocol de lifespan d'ASGI, així
    que l'esdeveniment `startup` mai s'hi executaria si no es crida a mà.
    """
    _retry_on_transient_db_error(lambda: Base.metadata.create_all(bind=engine))
    _retry_on_transient_db_error(_migrate_legacy_assigned_room)
    _retry_on_transient_db_error(_add_missing_columns)

    def _seed() -> None:
        db = SessionLocal()
        try:
            run_seed(db)
        finally:
            db.close()

    _retry_on_transient_db_error(_seed)


@app.on_event("startup")
def on_startup() -> None:
    ensure_db_ready()


@app.get("/api/health")
def health():
    return {"status": "ok"}
