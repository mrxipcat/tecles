# WebAules

Portal web multi-entitat per a la reserva de places en un calendari de sessions/aules/sales.
Cada ENTITAT pot configurar el nom dels seus slots, els límits de reserves per usuari, i la
visibilitat de l'oferta. Els usuaris es poden identificar per fer reserves; els administradors
d'una entitat gestionen les sessions disponibles.

Arquitectura final prevista: frontend a Azure Static Web Apps (Free), backend com a Azure
Functions, base de dades Azure SQL Free o Cosmos DB Free, autenticació via login integrat de SWA
(GitHub) amb rols personalitzats.

## Abast d'aquest sprint 1

Aquesta iteració construeix **l'esquelet estructural** de tots els components, executable
localment dins PyCharm, sense encara la lògica de negoci ni l'autenticació real:

- Backend: FastAPI + SQLAlchemy + SQLite, amb tots els endpoints REST, models de dades i
  llavor (seed) de dades de demostració.
- Frontend: React (Vite), amb totes les pantalles (llista, calendari, reserves pròpies,
  administració de sessions, configuració d'entitat) i encaminament (routing) per rols.
- **Login provisional (superat a l'sprint 3)**: originalment `/api/auth/login` no validava
  cap contrasenya i autoregistrava usuaris amb el rol triat al formulari. Des de l'sprint 3
  la contrasenya es verifica de debò i els comptes els crea l'administrador — vegeu més avall.
  El "token" retornat continua sent una simple codificació base64 sense signatura (vegeu
  `backend/app/security.py`).

## Sprint 2

Aquesta iteració afegeix la lògica de negoci real de les reserves:

- Nous paràmetres d'entitat: `show_available_places` (mostrar o no les places lliures als
  usuaris) i `auto_confirm_reservations` (confirmar automàticament les reserves, o deixar-les
  pendents fins que un administrador les revisi).
- Reserva real des de la vista de llista **i** des de la vista de calendari: es crea la
  reserva, es valida la capacitat disponible (places lliures = capacitat − reserves
  pendents/confirmades) i es rebutja amb un error si la sessió és plena.
- Els administradors no poden fer reserves per a ells mateixos (403 al backend, i la pantalla
  "Les meves reserves" no es mostra ni és accessible per a un perfil administrador).
- Panell d'administració per sessió: sol·licituds pendents (només quan
  `auto_confirm_reservations` és fals) amb botons de confirmar/rebutjar, i llista de reserves
  confirmades, ambdues amb l'usuari, quan es va sol·licitar i quan es va confirmar.

L'entitat de demo ara té `auto_confirm_reservations=False`: entra com a `usuari`, fes una
reserva, i entra com a `admin` a "Admin: Sessions" → "Veure reserves" per confirmar-la o
rebutjar-la en directe. Des de "Admin: Configuració" pots canviar-ho a confirmació automàtica
en qualsevol moment.

**Important**: l'esquema de la base de dades ha canviat (nous camps a `Entity` i `Reservation`)
i encara no hi ha migracions. Si ja tenies `backend/webaules.db` d'una execució anterior,
esborra'l (`rm backend/webaules.db`) abans d'arrencar de nou; es recrearà automàticament amb
les dades de demostració.

## Sprint 3

- Vista d'administració de sessions ara prioritza la llista de slots configurats (amb el
  total de places, les peticions pendents de confirmar quan escau, i les places ja
  confirmades); el formulari de crear/editar queda amagat darrere un botó "Nova sessió".
- La llista de "Les meves reserves" mostra el títol de la sessió en lloc del seu identificador.
- **Comptes d'usuari gestionats per l'administrador de l'entitat**: `/api/auth/login` ara
  verifica una contrasenya real (PBKDF2, sense dependències noves) i ja no autoregistra ni
  permet triar el rol lliurement des del formulari. Des de "Admin: Usuaris" un administrador
  pot crear comptes (amb una contrasenya inicial), editar nom/rol, reiniciar la contrasenya, o
  eliminar-los — sempre restringit a la seva pròpia entitat. Tot compte nou (o amb la
  contrasenya reiniciada) queda marcat perquè l'usuari l'hagi de canviar en el primer login;
  el frontend el redirigeix automàticament a "Canviar contrasenya" fins que ho faci.

El "token" de sessió segueix sent provisional (sense signatura ni caducitat, vegeu
`backend/app/security.py`) — la contrasenya sí que es verifica de debò.

**Important**: l'esquema de la base de dades ha canviat una altra vegada (nous camps
obligatoris a `User`). Si ja tenies `backend/webaules.db`, esborra'l (`rm backend/webaules.db`)
abans d'arrencar de nou.

## Sprint 4

- **Rol superadministrador**: no pertany a cap entitat (`entity_id` és `null`). Des de
  "Superadmin: Entitats" pot crear i esborrar entitats senceres (esborrar-ne una elimina en
  cascada els seus usuaris, sessions i reserves) i crear/gestionar els comptes ADMIN de
  qualsevol entitat (contrasenya inicial, reinici de contrasenya, esborrar). Login de
  superadministrador: marca la casella "Accés de superadministrador" a la pantalla d'entrada
  (no cal codi d'entitat). Compte de demostració: `superadmin` / `super123`.
- **Slots amb una sola plaça**: en lloc del comptador de places lliures, es mostra simplement
  "Disponible" o "No disponible".
- **Nom del slot configurable en singular i plural** (`slot_label_singular`/`slot_label_plural`
  a "Admin: Configuració"): substitueix l'antic camp únic i s'aplica a tota la interfície
  (llistat, calendari, "les meves reserves", administració de slots) tant per a usuaris com
  administradors. Internament el codi continua parlant de "sessions"; només canvia el text
  mostrat.

**Important**: l'esquema de la base de dades ha canviat una altra vegada (`User.entity_id` ara
és opcional, nou rol `superadmin`, `Entity.slot_label` dividit en dues columnes). Si ja tenies
`backend/webaules.db`, esborra'l (`rm backend/webaules.db`) abans d'arrencar de nou.

## Sprint 5 (només frontend)

- **Vista Llistat** més compacta (graella multi-columna, menys espaiat) i amb la descripció de
  cada slot plegada per defecte (botó xebró "⌄" per expandir-la).
- **Vista Calendari** reconstruïda: mode mensual amb graella de dies navegable i mode setmanal
  amb una graella horària real (línies cada hora, cada slot ocupa l'espai proporcional a la
  seva durada, amb col·locació en columnes quan hi ha solapaments). Seleccionar un slot en
  mostra el detall complet sota la graella.
- Colors de fons segons disponibilitat (verd suau = disponible, vermell suau = ple) a targetes,
  xips del calendari i el panell de detall.
- Es pot cancel·lar una reserva pròpia directament des del Llistat o del panell de detall del
  Calendari (amb diàleg de confirmació).

## Sprint 6

- **Sales (rooms)**: nou paràmetre d'entitat `is_multiroom` (monosala/multisala). En monosala,
  cada entitat té una única sala invisible (assignada automàticament, sense selector ni gestió
  visibles). En multisala, "Admin: Sales" permet crear/renombrar/esborrar sales (no es pot
  esborrar una sala amb slots associats ni l'última sala d'una entitat), i el formulari de
  sessions exigeix triar-ne una.
- El títol del slot ara és **opcional**. De cara a l'usuari, el títol mostrat es compon com a
  `Sala: Títol` quan l'entitat és multisala (només `Sala` si no hi ha títol); en monosala es
  mostra el títol tal qual. Tota la lògica interna continua basant-se en l'ID intern del slot;
  aquesta composició (`display_title`) es calcula un sol cop al backend.
- **Filtre de sales**: a la part superior del Llistat i el Calendari (només visible en entitats
  multisala) hi ha un botó per sala que activa/desactiva la seva visualització.

## Sprint 7

- **Prefix de sala al títol, més intel·ligent**: ja no es mostra "Sala: Títol" quan és
  redundant — ni en entitats monosala (com fins ara) ni quan l'usuari que mira té una sala
  assignada en exclusiva (vegeu el punt següent); en aquests casos es veu només el títol.
- **Usuaris restringits a una sala**: a "Admin: Usuaris", si l'entitat és multisala, es pot
  triar una "Sala assignada" per a cada usuari de rol Usuari. Un usuari amb sala assignada
  només veu (i només pot reservar) els slots d'aquella sala — el backend ho filtra a
  `GET /api/sessions` i ho valida a `POST /api/reservations` (403 si intenta reservar fora
  de la seva sala) — i no se li mostra el filtre de sales (no té res a filtrar).
- **Color blau clar** per als slots on l'usuari ja té una reserva (pendent o confirmada),
  consistent a Llistat, Calendari (xips, graella setmanal i panell de detall) i també a les
  files de "Les meves reserves".
- Repàs de tota la interfície per eliminar la paraula "slot" de cara a l'usuari — sempre s'hi
  interpola el nom singular/plural configurat de l'entitat (o una redacció genèrica quan no hi
  ha entitat en context, com al formulari de creació d'entitats del superadmin).
- **Nom de la sala també configurable** (`room_label_singular`/`room_label_plural` a "Admin:
  Configuració", per defecte "Sala"/"Sales"): substitueix la paraula "sala" fixa a tota la
  interfície (i als missatges d'error del backend relacionats amb sales). Internament el codi
  continua parlant de "room(s)".

### Pendent (marcat com `TODO(sprint4)`/`TODO(sprint6)` al codi)

- Autenticació real de sessió (p. ex. login via GitHub / Azure Static Web Apps) en lloc del
  token base64 actual.
- Aplicació dels límits de l'entitat (`max_reservations_per_day/week/month`).
- Aplicació del `visibility_mode` de l'entitat (amagar sessions sense places lliures als
  usuaris no administradors).

**Ja implementat**: un usuari no pot reservar una sessió que coincideixi, totalment o
parcialment, en l'horari amb una altra reserva seva (pendent o confirmada) — validat al
backend a `POST /api/reservations`.

**Important**: l'esquema ha canviat una altra vegada (`User.assigned_room_id`,
`Entity.room_label_singular`/`room_label_plural`). Esborra `backend/webaules.db` si en tens un
d'una execució anterior.

## Estructura del projecte

```
backend/    API FastAPI + models SQLAlchemy + SQLite
frontend/   Aplicació React (Vite)
```

## Com executar en local

### Backend

```bash
cd backend
python3 -m venv .venv        # o reutilitza un venv existent a l'arrel del repo
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

L'API queda disponible a `http://localhost:8000/api` (documentació interactiva a
`http://localhost:8000/docs`). En arrencar, crea automàticament la base de dades SQLite
(`backend/webaules.db`) i la omple amb dades de demostració si està buida.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'aplicació queda disponible a `http://localhost:5173` i redirigeix les crides `/api` cap al
backend a `http://localhost:8000` (configurat a `vite.config.js`).

## Credencials de demostració (seed)

- Codi d'entitat: `demo`
- Usuari administrador: `admin` / `admin123`
- Usuari normal: `usuari` / `usuari123`
- Superadministrador (sense entitat): `superadmin` / `super123`

Els nous comptes ja no s'autoregistren: un administrador els pot crear des de "Admin:
Usuaris" (per a la seva pròpia entitat) i un superadministrador des de "Superadmin: Entitats"
(comptes admin de qualsevol entitat).

## Desplegament a Azure (tecles.com)

Aquest repositori té vinculat un recurs d'Azure Static Web Apps existent (domini `tecles.com`),
amb el flux d'Azure Functions "Managed" que preveia l'arquitectura final: el frontend es
serveix com a contingut estàtic i el backend FastAPI es desplega com una Azure Function
única que embolcalla tota l'app amb el pont ASGI, sense haver de reescriure cap endpoint.

### Automatitzat (GitHub Actions)

Cada `push` a `main` dispara `.github/workflows/azure-static-web-apps-mango-dune-043afed03.yml`,
que:
- Construeix `frontend/` (Vite) com a `app_location` i en desplega `frontend/dist` com a
  `output_location`.
- Construeix `backend/` com a `api_location` (Managed Functions, runtime `python:3.10` fixat a
  `frontend/staticwebapp.config.json` — Managed Functions no admet 3.11) i el desplega a la
  mateixa Static Web App.
- No cal cap recurs d'Azure nou per a això — reutilitza el que ja existia i que servia la
  landing page anterior.

**Detalls de la integració amb Azure Functions** (costosos de descobrir, documentats perquè no
calgui repetir-ho):
- Es fa servir el **model V1** de Functions (`backend/ApiHandler/__init__.py` +
  `function.json`), no el model V2 d'un sol fitxer (`function_app.py` + `AsgiFunctionApp`): el
  V2 fallava sistemàticament en desplegar-se a Managed Functions amb l'error genèric "Failed to
  deploy the Azure Functions" (confirmat que no era un problema intermitent — reproduït diverses
  vegades amb el mateix commit).
- `backend/host.json` fixa `http.routePrefix` a `"api"` (Managed Functions no accepta cap altre
  valor — un desplegament amb `routePrefix: ""` falla en temps de build). Aquest prefix només
  determina QUINA Function atén la petició (aquí, el catch-all `{*route}`); `req.url` (i per
  tant el path ASGI que rep FastAPI) conserva el path original sencer (`/api/...`), així que els
  routers de FastAPI SÍ declaren el seu propi prefix `/api` (vegeu `backend/app/main.py`),
  exactament igual que en local.
- El pont ASGI d'Azure Functions (`AsgiMiddleware`) **no envia el protocol de lifespan d'ASGI**,
  així que l'esdeveniment `@app.on_event("startup")` de FastAPI (creació de taules + llavor) mai
  s'executaria en producció. Per això aquesta lògica viu en una funció reutilitzable
  (`ensure_db_ready()` a `app/main.py`) que `ApiHandler/__init__.py` crida explícitament en
  importar-se el mòdul (un sol cop per arrencada freda del contenidor).

### Base de dades (ja creada)

- **Azure SQL Database, nivell Free** (`teclesdb` al servidor `teclesweb-sql`, grup de recursos
  `TECLES`, regió West Europe), creada amb `--use-free-limit` i
  `--free-limit-exhaustion-behavior AutoPause`: si mai s'exhaureix la quota gratuïta (100.000
  segons-vCore/mes + 32 GB), la base de dades es pausa automàticament en lloc de començar a
  facturar.
- Driver de connexió: **`pymssql`** (empaqueta FreeTDS al wheel, sense dependència del driver
  ODBC del sistema). Es va provar primer amb `python-tds`/`sqlalchemy-pytds` (pur Python), però
  la seva validació TLS trenca amb versions actuals de pyOpenSSL i Azure SQL exigeix connexió
  xifrada — `pymssql` sí que connecta correctament (provat contra la base de dades real).
- Regla de tallafocs `AllowAzureServices` (0.0.0.0) perquè les Managed Functions hi puguin
  connectar.
- La cadena de connexió ja està configurada com a variable d'entorn **`DATABASE_URL`** de la
  Static Web App `teclesweb` (Portal d'Azure → Configuration). La contrasenya de l'usuari
  `teclesadmin` es va generar aleatòriament — si mai cal rotar-la: `az sql server update
  --resource-group TECLES --name teclesweb-sql --admin-password <nova>` i actualitzar
  `DATABASE_URL` en conseqüència amb `az staticwebapp appsettings set`.
- Al primer desplegament, l'aplicació crea les taules i les dades de llavor (seed)
  automàticament contra aquesta base de dades, igual que en local amb SQLite.

El domini personalitzat `tecles.com` segueix vinculat al mateix recurs `teclesweb` (no s'ha
tocat, només el contingut que hi desplega GitHub Actions).

### Observabilitat

Les Managed Functions només registren logs si hi ha Application Insights activat. Ja se n'ha
creat un (`teclesweb-insights`, grup de recursos `TECLES`) i vinculat a la Static Web App via
les variables d'entorn `APPLICATIONINSIGHTS_CONNECTION_STRING`/`APPINSIGHTS_INSTRUMENTATIONKEY`.
Per consultar l'últim error real (no el missatge genèric que es veu al log de GitHub Actions):

```bash
az monitor app-insights query --app teclesweb-insights --resource-group TECLES \
  --analytics-query "exceptions | order by timestamp desc | take 5"
```

Per veure l'estat dels desplegaments:

```bash
gh run list --repo mrxipcat/tecles
gh run view <run-id> --repo mrxipcat/tecles --log-failed
```
