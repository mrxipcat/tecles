from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.include_router(auth.router)
app.include_router(entities.router)
app.include_router(sessions.router)
app.include_router(reservations.router)
app.include_router(users.router)
app.include_router(superadmin.router)
app.include_router(rooms.router)


def ensure_db_ready() -> None:
    """Crea les taules i sembra les dades de demo si cal.

    Es crida des de l'esdeveniment `startup` de FastAPI (servidor ASGI local,
    p. ex. uvicorn) i també explícitament des de `backend/ApiHandler/__init__.py`:
    el pont ASGI d'Azure Functions no envia el protocol de lifespan d'ASGI, així
    que l'esdeveniment `startup` mai s'hi executaria si no es crida a mà.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    ensure_db_ready()


@app.get("/health")
def health():
    return {"status": "ok"}
