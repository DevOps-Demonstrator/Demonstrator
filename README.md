# Todo API - CI/CT/CD Demonstrator

Eine FastAPI Todo-API mit React-Frontend, die als Demonstrator für CI/CT/CD-Prozesse dient.
Teil der Studienarbeit "CI/CT/CD-Demonstrator".

## Quick Start

### Lokal (Backend + SQLite)

```bash
uv sync --group dev
uv run uvicorn app.main:app --reload
```

API-Dokumentation: http://localhost:8000/docs

### Lokal (Frontend separat)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (Vite proxied API-Requests an `localhost:8000`)

### Docker Compose (3-Container-Stack)

```bash
docker compose up --build
```

| Service | URL | Beschreibung |
|---|---|---|
| Frontend (nginx) | http://localhost | React-App + Reverse Proxy |
| API (FastAPI) | http://localhost/todos | REST-API (via nginx) |
| API-Docs | http://localhost/docs | Swagger UI (via nginx) |
| DB (PostgreSQL) | localhost:5433 | Nur für direkten DB-Zugriff |

Herunterfahren:

```bash
docker compose down       # Container stoppen (Daten bleiben)
docker compose down -v    # Container stoppen + Volumes/Daten löschen
```

## Entwicklung

### Einrichtung

```bash
# uv installieren (falls noch nicht vorhanden)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Backend
uv sync --group dev
uv run pre-commit install

# Frontend
cd frontend && npm install
```

### Befehle (Makefile)

```bash
make install     # Abhängigkeiten + Pre-Commit installieren
make run         # App lokal starten (SQLite)
make test        # Tests mit Coverage
make lint        # Formatting + Linting prüfen
make format      # Code automatisch formatieren
make check       # Lint + Tests (wie in CI)
make audit       # Dependency-Schwachstellenscan
make docker      # Docker Compose starten (PostgreSQL)
make clean       # Caches und Build-Artefakte entfernen
```

### Frontend-Befehle

```bash
cd frontend
npm run dev           # Vite Dev-Server starten
npm test              # Unit-Tests (Vitest)
npm run test:e2e      # E2E-Tests (Playwright, braucht laufendes Backend)
npm run lint          # oxlint
npm run build         # Production-Build
```

## Projektstruktur

```
demonstrator/
├── app/                         # Backend (FastAPI)
│   ├── main.py                  #   App + Health-Endpoint + SPA-Serving
│   ├── core/database.py         #   DB-Verbindung (SQLite/PostgreSQL)
│   ├── models/todo.py           #   SQLAlchemy-Model
│   ├── schemas/todo.py          #   Pydantic-Validierung
│   ├── crud/todo.py             #   CRUD-Operationen
│   └── routers/todos.py         #   API-Routen (/todos)
│
├── frontend/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx              #   Hauptkomponente (State, API-Aufrufe)
│   │   ├── api.js               #   API-Client (fetch-Wrapper)
│   │   ├── components/          #   TodoForm, TodoList, TodoItem
│   │   └── *.test.{js,jsx}     #   Unit-Tests (Vitest, co-located)
│   ├── tests/                   #   E2E-Tests (Playwright)
│   ├── nginx/default.conf       #   nginx-Config (Reverse Proxy)
│   ├── Dockerfile               #   Multi-Stage: Node Build → nginx
│   ├── playwright.config.js     #   E2E-Test-Konfiguration
│   ├── package.json             #   Dependencies + Scripts
│   └── vite.config.js           #   Build-Config + API-Proxy (Dev)
│
├── tests/                       # Backend-Tests
│   ├── conftest.py              #   Fixtures (In-Memory-DB, TestClient)
│   ├── test_crud.py             #   11 Unit-Tests
│   └── test_api.py              #   15 Integrationstests (inkl. Health-Check)
│
├── .github/
│   ├── pull_request_template.md #   PR-Vorlage (Issue, Beschreibung, Checkliste)
│   ├── dependabot.yml           #   Automatische Dependency-Updates (pip, npm, Actions, Docker)
│   └── workflows/               #   CI/CD-Pipeline (7 Workflows)
│       ├── linters.yml          #     Backend (Black, Ruff) + Frontend (oxlint) + zizmor
│       ├── tests.yml            #     Tests + Coverage (SQLite + PostgreSQL + Frontend)
│       ├── e2e.yml              #     Playwright Browser-Tests (On-Demand)
│       ├── pr_checks.yml        #     Issue-Referenz + PR-Beschreibung
│       ├── security.yml         #     Dependency-Audit (pip-audit)
│       ├── cd.yml               #     Docker-Images bauen + pushen + Deploy (API + Frontend)
│       └── smoke-test.yml       #     Multi-Container Smoke-Test
│
├── .editorconfig                # Editor-Formatierung
├── .pre-commit-config.yaml      # Pre-Commit Hooks (Black, Ruff, oxlint, zizmor)
├── pyproject.toml               # Projekt-Config + Tool-Einstellungen + Dependency Groups
├── uv.lock                      # Lockfile (deterministische Abhängigkeiten)
├── Makefile                     # Standardisierte Befehle (uv run ...)
├── Dockerfile                   # API: Multi-Stage Build (uv + Python)
├── docker-compose.yml           # Dev: Frontend + API + PostgreSQL
├── docker-compose.prod.yml      # Prod: Swarm-Deployment (3 Container)
├── .env.example                 # Dokumentierte Umgebungsvariablen
├── README.md                    # Quick Start + Projektübersicht
├── CONTRIBUTING.md              # Entwicklungsworkflow + Konventionen
└── .gitignore
```

## Tests

| Bereich | Tests | Framework | Befehl |
|---|---|---|---|
| Backend (API + CRUD) | 26 | pytest | `make test` |
| Frontend (Komponenten) | 22 | Vitest + Testing Library | `cd frontend && npm test` |
| E2E (Browser) | 7 | Playwright | `cd frontend && npm run test:e2e` |
| **Gesamt** | **55** | | |

## CI/CD-Pipeline

7 GitHub Actions Workflows:

| Workflow | Trigger | Funktion |
|---|---|---|
| `linters.yml` | Push + PR | Black, Ruff, oxlint, zizmor |
| `tests.yml` | Push + PR | Backend (SQLite + PostgreSQL) + Frontend (Vitest) |
| `e2e.yml` | PR mit Label `e2e` | Playwright Browser-Tests (On-Demand) |
| `pr_checks.yml` | Pull Requests | Issue-Referenz + PR-Beschreibung prüfen |
| `security.yml` | Push + PR + Wöchentlich | pip-audit Dependency-Scan |
| `cd.yml` | Push auf `main` | Docker-Images bauen + GHCR pushen + SSH Deploy |
| `smoke-test.yml` | Push + PR (Infra-Dateien) | Multi-Container Smoke-Test |

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./todo.db` | Datenbank-Verbindung. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |

## Architektur

```
Entwicklung:                        Production (Docker Compose):
┌──────────┐  Proxy  ┌────────┐    ┌─────────────────────────────┐
│ Vite Dev │ ──────→ │FastAPI │    │  nginx (Frontend-Container) │ :80
│ :5173    │         │ :8000  │    │  ├── /        → React SPA   │
└──────────┘         └────┬───┘    │  └── /todos   → proxy → api │
                          │        └──────────────┬──────────────┘
                     ┌────▼───┐    ┌──────────────▼──────────────┐
                     │ SQLite │    │  FastAPI (API-Container)     │ :8000
                     └────────┘    └──────────────┬──────────────┘
                                   ┌──────────────▼──────────────┐
                                   │  PostgreSQL (DB-Container)  │ :5432
                                   └─────────────────────────────┘
```
