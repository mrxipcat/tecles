"""Diagnòstic puntual: llista les columnes reals de la taula `entities` a la
base de dades apuntada per `DATABASE_URL`, per detectar columnes obsoletes
(p. ex. d'un rename antic) que el model actual ja no coneix."""

from sqlalchemy import inspect

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    for table in ["entities", "users", "rooms", "sessions", "reservations"]:
        print(f"--- {table} ---")
        for col in inspector.get_columns(table):
            print(f"  {col['name']:30s} nullable={col['nullable']} default={col.get('default')}")


if __name__ == "__main__":
    main()
