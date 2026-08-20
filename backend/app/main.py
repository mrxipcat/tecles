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

app.include_router(auth.router, prefix="/api")
app.include_router(entities.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(superadmin.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
