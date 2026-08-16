# Demonstrator - Übersicht

## Ziel

Der Demonstrator setzt die Erkenntnisse aus der [Django-Analyse](../django/übersicht.md) praktisch um.
Aus Djangos DevOps-Konzepten werden diejenigen ausgewählt, die für **kleinere Softwareprojekte (bspw. im Hochschul-Kontext)** - also Projekte mit begrenztem Umfang, kleinem Team und endlicher Laufzeit - den größten Mehrwert bringen.

Das Ergebnis ist eine vollständige Sammlung an DevOps-Konzepten mit CI/CD-Infrastruktur auf Basis einer kleinen FastAPI-Anwendung.

---

## Konzeptauswahl: Von Django zum Demonstrator

Djangos CI/CD-Infrastruktur ist auf ein Projekt mit über 2.000 Contributors ausgelegt.
Nicht alles davon ist für ein wie oben beschriebenes Softwareprojekt (begrenzter Umfang) sinnvoll.
Die folgende Tabelle zeigt, welche [Konzepte](../django/übersicht.md) übernommen, angepasst oder bewusst weggelassen wurden und warum.

| # | Django-Prinzip | Demonstrator | Begründung |
|---|---|---|---|
| 1 | **Shift Left** (Pre-Commit) | **Übernommen** | Höchster Mehrwert pro Aufwand: Fehler werden gefunden, bevor sie committet werden. |
| 2 | **Least Privilege** | **Übernommen** | Trivial umzusetzen (`permissions: contents: read`), verhindert, dass ein kompromittierter Workflow Schaden anrichtet. |
| 3 | **Concurrency Control** | **Übernommen** | Eine Zeile YAML spart Runner-Minuten: Alte CI-Runs werden bei neuen Pushes abgebrochen. |
| 4 | **Intelligente Filterung** (`paths-ignore`, `paths`) | **Übernommen** | Django überspringt Tests bei reinen Doku-Änderungen (`paths-ignore: docs/**`) und triggert den Migrations-Check nur bei Model-Änderungen (`paths`). Der Demonstrator nutzt `paths-ignore` in `linters.yml` und `tests.yml` sowie `paths` in `smoke-test.yml` für Infrastruktur-Änderungen. |
| 5 | **On-Demand-Testing** (Label-Trigger) | **Übernommen** | Django steuert teure Tests (Selenium, Coverage) per Label. Der Demonstrator nutzt dasselbe Pattern: E2E-Tests (`e2e.yml`) laufen nur wenn das Label `e2e` gesetzt wird. |
| 6 | **Matrix-Testing** (Multi-Version) | **Weggelassen** | Kleinere Projekte benötigen i.d.R. nur eine Python-Version. Matrix-Testing gegen 5+ Versionen wäre Overkill. |
| 7 | **DRY** (Versionen aus `pyproject.toml`) | **Angepasst** | Statt Versionen dynamisch zu extrahieren, wird die gesamte Tool-Konfiguration in `pyproject.toml` zentralisiert. Das DRY-Prinzip wird so einfacher umgesetzt. |
| 8 | **Supply-Chain-Security** (SHA-Pinning, zizmor) | **Übernommen** | zizmor scannt Workflows auf Sicherheitsprobleme (wie bei Django). Zusätzlich prüft pip-audit Abhängigkeiten gegen CVE-Datenbanken - das geht über Djangos Ansatz hinaus. `persist-credentials: false` und Least Privilege auf allen Workflows. |
| 9 | **Docs as Code** | **Möglich** | Die Pipeline ist vorbereitet für eine MkDocs-Integration. Im Demonstrator wird zunächst auf FastAPIs eingebaute `/docs` (Swagger UI) gesetzt. |

### Was bringt den größten Mehrwert?

Die übernommenen Konzepte sollen bei einem möglichst **geringen Aufwand, einen hohen Nutzen bringen**:

- **Pre-Commit Hooks**: Einmal `pre-commit install`, danach läuft alles automatisch bei jedem Commit.
- **CI-Tests**: Ein Push reicht - Tests und Linting laufen ohne manuelles Zutun.
- **CD (Docker)**: Jeder Merge auf `main` produziert ein deploybares Artefakt.

Was bewusst **nicht** übernommen wurde, hat ein schlechtes Aufwand-Nutzen-Verhältnis für kleine Projekte: Matrix-Testing und Nightly-Builds.

---

## Beispiel-Anwendung

Als Demonstrator dient eine **Todo-App**: eine Anwendung zur Verwaltung von ToDo's mit Backend (FastAPI) und Frontend (React).

**Warum diese App?**

- **Überschaubar**: ~200 Zeilen Anwendungscode. Der Leser versteht die App in Minuten, der Fokus bleibt auf der Pipeline.
- **Realistisch**: Datenbank (SQLite, Postgres), Input-Validierung (Pydantic), CRUD-Operationen - Komponenten, die i.d.R in allen Projekten (vor allem mit Web-Kontext) vorkommen.
- **Testbar**: Trennung von Logik und Routen ermöglicht sowohl Unit- als auch Integrationstests.
- **Deploybar**: Lässt sich in ein Docker-Image verpacken und ausliefern (CD).

### Komponenten

Die Anwendung besteht aus drei Komponenten, die jeweils als eigener Docker-Container laufen:

![Komponentenübersicht](diagrams/uebersicht.svg)

| Container | Technologie | Dockerfile | Aufgabe |
|---|---|---|---|
| **Frontend** | React + Vite (Build-Stage) → nginx (Runtime-Stage) | `frontend/Dockerfile` | Statische Dateien ausliefern (kompiliertes HTML/JS/CSS) + Reverse Proxy für API-Requests |
| **API** | FastAPI + SQLAlchemy + uvicorn | `Dockerfile` | REST-Endpoints, Validierung, CRUD |
| **DB** | PostgreSQL 16 | Offizielles Image | Datenhaltung (Todos) |

Der Frontend-Container enthält kein Node.js zur Laufzeit. React wird im Multi-Stage Build zu statischen Dateien kompiliert (`npm run build` → `dist/`), und nur diese werden in das nginx-Image kopiert. nginx liefert sie als normalen Webserver aus und leitet API-Requests (`/todos`, `/health`) an den Backend-Container weiter.

Lokal ohne Docker kann die API auch standalone mit SQLite laufen - PostgreSQL wird nur im Docker-Setup und in der CI verwendet (siehe [Umgebungsvariablen](#umgebungsvariablen)).

### Starten der Anwendung

| Variante | Befehl | Was startet | DB | URL |
|---|---|---|---|---|
| **Backend only** | `uv run uvicorn app.main:app --reload` | FastAPI | SQLite | `http://localhost:8000/docs` |
| **Frontend only** | `cd frontend && npm run dev` | Vite Dev-Server (proxied API) | - | `http://localhost:5173` |
| **Docker Compose** | `docker compose up --build` | Frontend (nginx) + API + PostgreSQL | PostgreSQL | `http://localhost` |

Für die lokale Entwicklung startet man Backend und Frontend separat - das Frontend proxied API-Requests automatisch an das Backend (konfiguriert in `vite.config.js`). Mit Docker Compose läuft der gesamte Stack als 3-Container-Setup, wobei nginx das Frontend ausliefert und API-Requests an den Backend-Container weiterleitet.

### API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/health` | Health-Check (für Container-Orchestrierung) |
| `GET` | `/todos` | Alle Todos auflisten (Filter: `completed`, `priority`) |
| `GET` | `/todos/{id}` | Einzelnes Todo abrufen |
| `POST` | `/todos` | Neues Todo erstellen |
| `PUT` | `/todos/{id}` | Todo aktualisieren (partiell) |
| `DELETE` | `/todos/{id}` | Todo löschen |

---

## Projektstruktur

```
/
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
├── docs/                        # MkDocs-Dokumentation
│   ├── demonstrator/            #   Demonstrator-Analyse + Pipeline
│   └── django/                  #   Django-Analyse (Referenzprojekt)
│
├── .github/
│   ├── pull_request_template.md #   PR-Vorlage (Issue, Beschreibung, Checkliste)
│   ├── dependabot.yml           #   Automatische Dependency-Updates (pip, npm, Actions, Docker)
│   └── workflows/               #   CI/CD-Pipeline (7 Workflows + Pages)
│       ├── linters.yml          #     Backend (Black, Ruff) + Frontend (oxlint) + zizmor
│       ├── tests.yml            #     Tests + Coverage (SQLite + PostgreSQL + Frontend)
│       ├── e2e.yml              #     Playwright Browser-Tests (On-Demand)
│       ├── pr_checks.yml        #     Issue-Referenz + PR-Beschreibung
│       ├── security.yml         #     Dependency-Audit (pip-audit)
│       ├── cd.yml               #     Docker-Images bauen + pushen + Deploy (API + Frontend)
│       ├── smoke-test.yml       #     Multi-Container Smoke-Test
│       └── pages.yml            #     MkDocs-Dokumentation auf GitHub Pages deployen
│
├── .editorconfig                # Editor-Formatierung
├── .pre-commit-config.yaml      # Pre-Commit Hooks (Black, Ruff, oxlint, zizmor)
├── pyproject.toml               # Projekt-Config + Tool-Einstellungen + Dependency Groups
├── uv.lock                      # Lockfile (deterministische Abhängigkeiten)
├── mkdocs.yml                   # MkDocs-Konfiguration
├── Makefile                     # Standardisierte Befehle (uv run ...)
├── Dockerfile                   # API: Multi-Stage Build (uv + Python)
├── docker-compose.yml           # Dev: Frontend + API + PostgreSQL
├── docker-compose.prod.yml      # Prod: Swarm-Deployment (3 Container)
├── .env.example                 # Dokumentierte Umgebungsvariablen
├── README.md                    # Quick Start + Repo-Übersicht
├── CONTRIBUTING.md              # Entwicklungsworkflow + Konventionen
└── .gitignore
```

---

## Projektdokumentation

| Datei | Zweck | Django-Äquivalent |
|---|---|---|
| [`README.md`](../../README.md) | Quick Start, Projektstruktur, CI/CD-Übersicht | `README.rst` |
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | Einrichtung, Entwicklungsworkflow, Konventionen, Befehle | `CONTRIBUTING.rst` + `docs/internals/contributing/` |
| [`pull_request_template.md`](../../.github/pull_request_template.md) | PR-Vorlage: Issue-Referenz, Beschreibung, Checkliste (wird automatisch geladen) | [`.github/pull_request_template.md`](https://github.com/django/django/blob/main/.github/pull_request_template.md) |
| [`.env.example`](../../.env.example) | Dokumentiert benötigte Umgebungsvariablen mit Beispielwerten | - |

---

## Entwicklungsworkflow mit GitHub Issues

Jede Änderung am Code beginnt mit einem [GitHub Issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues). 
Issues dokumentieren, **was** geändert werden soll und **warum**, bevor Code geschrieben wird.

Der Workflow im Demonstrator folgt diesem Ablauf:

```
1. Issue erstellen       →  Beschreibt das Problem oder Feature
2. Branch erstellen      →  z.B. feature/42-todo-filter
3. Code schreiben        →  Pre-Commit Hooks prüfen lokal
4. PR erstellen          →  Template fordert Issue-Referenz (Closes #42)
5. CI prüft automatisch  →  Linting, Tests, Security, PR Checks
6. Code Review           →  Teammitglied prüft und genehmigt
7. Merge auf main        →  Issue wird automatisch geschlossen, CD startet
```

Django nutzt dafür ein externes Ticketsystem und prüft per Workflow (`labels.yml`), ob PRs eine Ticketnummer enthalten.
Der Demonstrator nutzt stattdessen **GitHub Issues**, die direkt in die Plattform integriert sind:

- Das [**PR-Template**](../../.github/pull_request_template.md) fordert `Closes #XXXX` als Issue-Referenz.
- Der Workflow [`pr_checks.yml`](../../.github/workflows/pr_checks.yml) prüft automatisch, ob eine `#123`-Referenz vorhanden ist.
- Das Schlüsselwort `Closes` bewirkt, dass GitHub das referenzierte Issue **automatisch schließt**, wenn der PR gemergt wird.

So entsteht eine lückenlose Verbindung zwischen Anforderung (Issue), Umsetzung (PR) und Auslieferung (CD) (ohne manuellen Aufwand).

---

## Umgebungsvariablen

Der Demonstrator lässt sich mit Umgebungsvariablen konfigurieren, um sich an verschiedene Umgebungen anzupassen. 
Derselbe Code läuft lokal, in der CI und in Docker, nur die Konfiguration unterscheidet sich.

### Anwendung

| Variable | Default | Beschreibung |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./todo.db` | Datenbank-Verbindung. SQLite für lokale Entwicklung, PostgreSQL für Docker/Produktion. Format: `postgresql+psycopg://user:pass@host:port/db` |

```python
# app/core/database.py
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todo.db")
```

| Umgebung | `DATABASE_URL` | Datenbank |
|---|---|---|
| Lokal (Entwicklung) | Nicht gesetzt (Default) | SQLite (`todo.db`) |
| CI - Test-Job 1 | Nicht gesetzt | SQLite (in-memory) |
| CI - Test-Job 2 | `postgresql+psycopg://...@localhost` | PostgreSQL (Service-Container) |
| Docker Compose (Dev/Prod) | `postgresql+psycopg://...@db` | PostgreSQL (Container) |

### GitHub Secrets (CI/CD)

Secrets werden nicht im Code gespeichert, sondern in den GitHub Repository Settings konfiguriert:

| Secret | Verwendet in | Beschreibung |
|---|---|---|
| `GITHUB_TOKEN` | `cd.yml` | Automatisch von GitHub bereitgestellt. Zugriff auf Container Registry (GHCR). |
| `DEPLOY_HOST` | `cd.yml` (Deploy-Job) | IP-Adresse oder Hostname des Swarm-Manager-Servers |
| `DEPLOY_USER` | `cd.yml` (Deploy-Job) | SSH-Benutzername für den Deployment-Server |
| `DEPLOY_SSH_KEY` | `cd.yml` (Deploy-Job) | Privater SSH-Schlüssel für den Deployment-Server |

### Docker Compose (Infrastruktur)

Diese Variablen konfigurieren die Container-Infrastruktur in `docker-compose.yml` und `docker-compose.prod.yml`:

| Variable | Wert | Beschreibung |
|---|---|---|
| `POSTGRES_DB` | `todo` | Name der PostgreSQL-Datenbank |
| `POSTGRES_USER` | `todo` | PostgreSQL-Benutzer |
| `POSTGRES_PASSWORD` | `todo` | PostgreSQL-Passwort |
| `API_IMAGE` | `ghcr.io/OWNER/REPO:latest` | Docker-Image für die API (nur `docker-compose.prod.yml`) |
| `FRONTEND_IMAGE` | `ghcr.io/OWNER/REPO-frontend:latest` | Docker-Image für das Frontend (nur `docker-compose.prod.yml`) |

Die Datei [`.env.example`](../../.env.example) dokumentiert alle Variablen mit Beispielwerten.

---

## Branch Protection

Die CI-Workflows (Linters, Tests, Security) und der CD-Workflow (`cd.yml`) laufen in **separaten Workflow-Dateien**. Innerhalb einer Datei kann man mit `needs:` Job-Abhängigkeiten definieren (z.B. Deploy wartet auf Build). Zwischen Dateien geht das nicht.

Die Absicherung, dass nur geprüfter Code gebaut und deployt wird, läuft deshalb über **GitHub Branch Protection Rules** - eine Einstellung im Repository, die verhindert, dass Code ohne bestandene CI-Checks auf `main` gelangt:

![Branch Protection Flow](diagrams/branch_protection.svg)

### Einrichtung (einmalig pro Repository)

In den GitHub Repository Settings unter **Settings → Branches → Add branch protection rule**:

| Einstellung | Wert | Zweck |
|---|---|---|
| Branch name pattern | `main` | Schutz für den Hauptbranch |
| Require a pull request before merging | Aktiviert | Kein direkter Push auf `main` |
| Require approvals | 1 | Mindestens ein Teammitglied muss den PR reviewen und freigeben |
| Require status checks to pass | Aktiviert | CI muss bestehen |
| Status checks: `Linters` | Required | Formatting + Linting muss bestehen |
| Status checks: `Tests` | Required | Alle Tests müssen bestehen |
| Status checks: `Security` | Required | Dependency-Scan muss bestehen |

Damit ist garantiert, dass kein Code `main` erreicht (und damit `cd.yml`) ohne ein Code Review durch ein Teammitglied **und** bestandene CI-Checks. 
Beides muss erfüllt sein bevor ein PR gemergt werden kann.

---

## Repository-Einrichtung

Damit die CI/CD-Pipeline vollständig funktioniert, müssen nach dem Klonen des Repositories einmalig folgende Schritte auf GitHub durchgeführt werden.

### 1. Lokale Entwicklungsumgebung

```bash
# uv installieren (falls noch nicht vorhanden)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Abhängigkeiten + Pre-Commit Hooks
make install

# Frontend
cd frontend && npm install
```

### 2. GitHub Label: `e2e`

Der E2E-Workflow (`e2e.yml`) läuft nur, wenn ein PR das Label `e2e` trägt.
Das Label muss einmalig erstellt werden:

**Settings → Issues → Labels → New label** → Name: `e2e`

### 3. GitHub Secrets (nur für Deployment)

Der Deploy-Job in `cd.yml` verbindet sich per SSH mit dem Produktionsserver.
Die Zugangsdaten werden als Repository Secrets konfiguriert:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Beschreibung |
|---|---|
| `DEPLOY_HOST` | IP-Adresse oder Hostname des Swarm-Manager-Servers |
| `DEPLOY_USER` | SSH-Benutzername für den Deployment-Server |
| `DEPLOY_SSH_KEY` | Privater SSH-Schlüssel für den Deployment-Server |

`GITHUB_TOKEN` wird automatisch von GitHub bereitgestellt und muss **nicht** manuell angelegt werden.

Ohne diese Secrets laufen alle CI-Workflows (Linters, Tests, Security, etc.) trotzdem - nur der Deploy-Job schlägt fehl.

### 4. Branch Protection Rules

Siehe [Abschnitt oben](#branch-protection): Schützt `main` vor ungeprüftem Code.

### 5. Server vorbereiten (nur für Deployment)

Auf dem Zielserver muss einmalig Docker Swarm initialisiert und der GHCR-Zugriff eingerichtet werden:

```bash
docker swarm init
docker login ghcr.io -u <github-user> -p <personal-access-token>
```

### Checkliste

| Schritt | Wo | Pflicht? |
|---|---|---|
| `make install` + `cd frontend && npm install` | Lokal | Ja |
| Label `e2e` erstellen | GitHub → Labels | Ja (sonst kein E2E-Trigger) |
| Branch Protection Rules | GitHub → Settings → Branches | Empfohlen |
| Secrets (`DEPLOY_*`) | GitHub → Settings → Secrets | Nur für Deployment |
| `docker swarm init` + GHCR-Login | Zielserver | Nur für Deployment |

---

## Vergleich: Django vs. Demonstrator

| Aspekt | Django | Demonstrator | Warum der Unterschied? |
|---|---|---|---|
| **Teamgröße** | >2.000 Contributors | 1-5 Contributors | Kleineres Team braucht weniger Automatisierung |
| **Workflows** | 17 GitHub Actions | 7 (Linters, Tests, E2E, PR Checks, Security, CD, Smoke-Test) | Gleiche Trennung nach Concern, inkl. On-Demand-Pattern |
| **Pre-Commit Hooks** | 6 (black, blacken-docs, isort, flake8, biome, zizmor) | 4 (Black, Ruff, oxlint, zizmor) | Ruff ersetzt flake8 + isort; oxlint und zizmor kommen hinzu |
| **Linting** | flake8 + isort + biome + zizmor | Ruff (Python) + oxlint (Frontend) + zizmor (Workflows) | Ruff ersetzt flake8 + isort; oxlint ersetzt biome |
| **Test-Strategie** | Matrix (5+ Python, 3 OS, 3 DB) | 3 Jobs: SQLite + PostgreSQL + Frontend (Vitest) + E2E on-demand (Playwright) | Keine Version-Matrix, aber Backend + Frontend + Browser-Tests |
| **Coverage** | On-Demand per Label (2 Workflows) | Immer aktiv, integriert (fail_under=80%) | Günstig genug um immer zu laufen |
| **Security** | zizmor (CI-Workflow-Scan) | zizmor + pip-audit (Dependency-Scan) + wöchentlicher Cron | Supply-Chain-Security auf Workflows und Abhängigkeiten |
| **CD** | Read the Docs + Coverage-Kommentar | Docker Build → GHCR → SSH Deploy → Docker Swarm (Rolling Update) | Framework vs. deploybare App mit vollständiger CD-Kette |
| **Paketmanagement** | pip + virtualenv + pip-tools | uv (Astral) | 10-100x schneller, Lockfile, `uv run` statt venv-Aktivierung |
| **Konfiguration** | Verteilt (`.flake8`, `tox.ini`, `pyproject.toml`) | Zentralisiert in `pyproject.toml` | Eine Datei statt drei - einfacher zu pflegen |

## Detailanalysen

- **[Lokale Tools](lokale-tools.md)** - EditorConfig, Pre-Commit Hooks, zentralisierte Konfiguration
- **[CI/CD-Pipeline](pipeline.md)** - GitHub Actions Workflows für Tests, Linting und Deployment
