"""Funció HTTP catch-all (model V1 d'Azure Functions) que embolcalla l'app
FastAPI existent amb el pont ASGI d'Azure Functions.

Es fa servir el model V1 (aquesta carpeta + `function.json`) en lloc del
`function_app.py` d'un sol fitxer (model V2) perquè les Managed Functions
d'Azure Static Web Apps van fallar sistemàticament en desplegar-se amb el
model V2 (`AsgiFunctionApp`) — el `host.json` segueix fixant `routePrefix` a
"api" (obligatori en Managed Functions), i com que els routers de FastAPI no
declaren el seu propi prefix "/api" (vegeu `app/main.py`), el path que rep
aquesta funció ja és el correcte.
"""

import azure.functions as func

from app.main import app as fastapi_app, ensure_db_ready

# AsgiMiddleware no envia el protocol de lifespan d'ASGI, així que l'esdeveniment
# "startup" de FastAPI no s'executaria mai aquí — es crida a mà, un sol cop per
# arrencada freda del contenidor (aquest mòdul només s'importa una vegada).
ensure_db_ready()


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fastapi_app).handle_async(req, context)
