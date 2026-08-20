"""Punt d'entrada per a Azure Functions (Managed Functions d'Azure Static Web Apps).

Embolcalla l'aplicació FastAPI existent (`app/main.py`) amb el pont ASGI d'Azure
Functions, sense necessitat de reescriure cap endpoint com a Function individual.

Les Managed Functions de Static Web Apps exigeixen que `host.json` mantingui
`http.routePrefix` a "api" (no es pot desactivar) — Azure el consumeix ell
mateix abans d'invocar la Function. Per això els routers de FastAPI NO
declaren el seu propi prefix "/api" (vegeu `app/main.py`): el path que rep
aquesta app és el que queda després que Functions n'hagi tret l'"api/". El
proxy de Vite en local fa la mateixa reescriptura (`frontend/vite.config.js`),
així el frontend sempre crida `/api/...` sense saber res d'això.
"""

import azure.functions as func

from app.main import app as fastapi_app

app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
