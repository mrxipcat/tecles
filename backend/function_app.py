"""Punt d'entrada per a Azure Functions (Managed Functions d'Azure Static Web Apps).

Embolcalla l'aplicació FastAPI existent (`app/main.py`) amb el pont ASGI d'Azure
Functions, sense necessitat de reescriure cap endpoint com a Function individual.
`host.json` fixa `routePrefix` a buit perquè Functions no hi afegeixi un "api/"
addicional per sobre del que ja declaren els routers de FastAPI (`prefix="/api"`).
"""

import azure.functions as func

from app.main import app as fastapi_app

app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
