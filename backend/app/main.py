from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

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


def ensure_db_ready() -> None:
    """Crea les taules i sembra les dades de demo si cal.

    Es crida des de l'esdeveniment `startup` de FastAPI (servidor ASGI local,
    p. ex. uvicorn) i també explícitament des de `backend/ApiHandler/__init__.py`:
    el pont ASGI d'Azure Functions no envia el protocol de lifespan d'ASGI, així
    que l'esdeveniment `startup` mai s'hi executaria si no es crida a mà.
    """
    Base.metadata.create_all(bind=engine)
    _migrate_legacy_assigned_room()
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    ensure_db_ready()


@app.get("/api/health")
def health():
    return {"status": "ok"}
