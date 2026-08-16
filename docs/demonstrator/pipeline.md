# CI/CD-Pipeline

Der Demonstrator nutzt **sieben GitHub Actions Workflows**, aufgeteilt nach Verantwortlichkeit, analog zu Djangos Trennung in eigenständige Workflow-Dateien.

---

## Workflow-Architektur

| Workflow | Datei | Trigger | Funktion |
|---|---|---|---|
| **Linters** | `linters.yml` | Push + PR | Formatting + Linting (Black, Ruff, oxlint, zizmor) |
| **Tests** | `tests.yml` | Push + PR | Unit-/Integrationstests + Coverage (SQLite + PostgreSQL) |
| **PR Checks** | `pr_checks.yml` | Pull Requests | Issue-Referenz + PR-Beschreibung prüfen |
| **E2E Tests** | `e2e.yml` | PR mit Label `e2e` | Playwright Browser-Tests (On-Demand) |
| **Security** | `security.yml` | Push + PR + Wöchentlich | Dependency-Schwachstellenscan |
| **CD** | `cd.yml` | Push auf `main` | Images bauen + pushen + SSH Deploy (`needs:` Verkettung) |
| **Smoke-Test** | `smoke-test.yml` | Push + PR (Infra-Dateien) | Multi-Container Smoke-Test (Frontend + API + DB) |

![CI/CD-Pipeline](diagrams/pipeline.svg)

### Vergleich zu Django

Django gruppiert seine 17 Workflows in sechs Kategorien.
Der Demonstrator bildet die wichtigsten Kategorien mit sieben Workflows ab:

| Django-Kategorie | Django-Workflows | Demonstrator-Pendant |
|---|---|---|
| **Immer** (tests, linters, docs, migrations, commit-msgs) | 5 | `linters.yml` + `tests.yml` |
| **On-Demand** (selenium, coverage, benchmark, ...) | 6 | `e2e.yml` (Playwright, Label-gated) + Coverage in `tests.yml` |
| **Nightly/Scheduled** (schedules, schedule_tests) | 2 | `security.yml` (wöchentlicher Cron) |
| **Prozessqualität** (labels, commit-messages, PR-quality) | 3 | `pr_checks.yml` (Issue-Referenz + PR-Beschreibung) |
| **Supply-Chain-Security** (zizmor in linters.yml) | (Teil von Linters) | `linters.yml` (zizmor) + `security.yml` (pip-audit) |
| **Deployment** (Read the Docs, Coverage-Kommentar) | 2 | `cd.yml` (Build + Deploy via `needs:`) + `smoke-test.yml` (Smoke-Test) |



### Pipeline in Zahlen

| Metrik | Django | Demonstrator |
|---|---|---|
| Workflow-Dateien | 17 | 7 |
| CI-Jobs pro PR | 5+ (immer) + 6 (on-demand) | 10 (4 Linters + 3 Tests + 1 Security + 2 PR Checks) + E2E (on-demand) + Smoke-Test (bei Infra-Änderungen) |
| Coverage | On-Demand per Label | Immer aktiv (mit Schwellenwert) |
| Security-Scan | zizmor (CI-Workflows) | zizmor (Workflows) + pip-audit (Deps) + wöchentlicher Cron |
| CD | Docs-Deployment | Docker Build → GHCR Push → SSH Deploy → Docker Swarm (alles in `cd.yml` via `needs:`) |
| Deployment-Strategie | - | Rolling Update, Zero Downtime, 2 Replicas |
| Qualitäts-Gate | Branch Protection Rules | GitHub Rulesets (Code Review + CI müssen bestehen bevor Code auf `main` gelangt) |
| Geplante Ausführung | Nächtlich | Wöchentlich (Security) |


---

## Gemeinsame Grundkonzepte

Alle Workflows verwenden dieselben Grundkonzepte aus der Django-Analyse:

### uv statt pip

Alle Python-bezogenen Workflows nutzen **uv** statt pip für die Installation von Abhängigkeiten.
uv ist von [Astral](https://astral.sh/) - derselben Firma, die auch Ruff entwickelt - und 10-100x schneller als pip.

So wie **Ruff** die Linting-Tools (flake8 + isort) modernisiert, modernisiert **uv** das Paketmanagement (pip + virtualenv + pip-tools).
Der Demonstrator nutzt damit durchgängig den Astral-Stack.

In den Workflows bedeutet das:

```yaml
# Vorher (pip):
- uses: actions/setup-python@v5
- run: pip install ".[dev]"
- run: pytest

# Nachher (uv):
- uses: astral-sh/setup-uv@v9
- run: uv sync --frozen --group dev
- run: uv run pytest
```

Drei zentrale Unterschiede zur pip-basierten CI:

1. **`uv run` statt direkter Aufruf.** Jeder Python-Befehl wird über `uv run` ausgeführt. Das stellt sicher, dass die virtuelle Umgebung existiert und synchron ist (ohne manuelle Aktivierung).

2. **`--frozen` in CI.** Verbietet uv, das Lockfile (`uv.lock`) neu zu berechnen. Wenn `pyproject.toml` und `uv.lock` nicht übereinstimmen, schlägt der Build sofort fehl statt still andere Versionen zu installieren.

3. **`uvx` für Einmal-Tools.** Installiert und führt ein Tool temporär aus, ohne es dauerhaft zu installieren. 
Geeignet für Linting-Jobs:

```yaml
- run: uvx black --check --diff .
- run: uvx ruff check --output-format=github .
```

### Least Privilege

```yaml
permissions:
  contents: read
```

Jeder Workflow bekommt nur die Rechte, die er braucht.
Ausnahme: Die Build-Jobs in `cd.yml` brauchen zusätzlich `packages: write` für die Container Registry. Fiese Berechtigung wird auf **Job-Level** gesetzt, nicht auf Workflow-Level.

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Alte CI-Runs werden bei neuen Pushes abgebrochen.
Ausnahme: `cd.yml` setzt `cancel-in-progress: false`, damit kein halbfertiges Image entsteht.

### Timeout

Jeder Job hat ein Zeitlimit. Schützt vor endlos laufenden Prozessen.

### Umgebungsspezifische Konfiguration

Der Demonstrator konfiguriert sich über Umgebungsvariablen.
Derselbe Code läuft in jeder Umgebung, nur die Konfiguration unterscheidet sich. 
Eine vollständige Übersicht aller Variablen findet sich in der 
[Demonstrator-Übersicht](übersicht.md#umgebungsvariablen).

---

## 1. Linters (`linters.yml`)

**Konfigurationsdatei:** [`linters.yml`](../../.github/workflows/linters.yml)

**Trigger:** Push auf `main`, Pull Requests

Vier parallele Jobs prüfen Formatting, Linting, Frontend und Workflow-Security unabhängig voneinander:

### Job: Black (Formatting)

```yaml
black:
  name: Black (Formatting)
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - uses: actions/checkout@v7
    - uses: astral-sh/setup-uv@v9
    - name: Check formatting
      run: uvx black --check --diff .
```

`uvx` installiert Black temporär und führt es sofort aus, kein `pip install` nötig.
`--diff` zeigt die konkreten Änderungen an, die Black vornehmen würde.

### Job: Ruff (Linting)

```yaml
ruff:
  name: Ruff (Linting)
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - uses: actions/checkout@v7
    - uses: astral-sh/setup-uv@v9
    - name: Check linting + imports
      run: uvx ruff check --output-format=github .
```

`--output-format=github` erzeugt Annotationen direkt im Pull Request.
Fehler erscheinen als Inline-Kommentare an der betroffenen Zeile.
Django nutzt dafür `gh-problem-matcher-wrap` mit flake8, Ruff hat dieses Feature nativ eingebaut.

### Job: Frontend (oxlint + Build)

```yaml
frontend:
  name: Frontend (Lint + Build)
  runs-on: ubuntu-latest
  timeout-minutes: 5
  defaults:
    run:
      working-directory: frontend
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with:
        node-version: "22"
        cache: "npm"
        cache-dependency-path: "frontend/package-lock.json"
    - run: npm ci
    - name: Lint
      run: npm run lint
    - name: Build
      run: npm run build
```

oxlint prüft JavaScript/JSX-Code auf Fehler und Stilprobleme. Der Build-Schritt (`npm run build`) stellt zusätzlich sicher, dass der Produktions-Build fehlerfrei durchläuft.

### Job: zizmor (Workflow-Security)

```yaml
zizmor:
  name: zizmor (Workflow Security)
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - uses: actions/checkout@v7
    - uses: zizmorcore/zizmor-action@v0.6.2
      with:
        annotations: true
```

zizmor scannt alle GitHub Actions Workflows auf Sicherheitsprobleme: ungepinnte Actions, gefährliche Trigger, übermäßige Permissions. Django nutzt dasselbe Tool.

---

## 2. Tests (`tests.yml`)

**Konfigurationsdatei:** [`tests.yml`](../../.github/workflows/tests.yml)

**Trigger:** Push auf `main`, Pull Requests

Der Workflow besteht aus **drei parallelen Jobs** - analog zu Djangos `tests.yml`, das ebenfalls Backend-Tests und JavaScript-Tests parallel ausführt.

### Job 1: Tests mit SQLite (schnelles Feedback)

```yaml
test-sqlite:
  name: Tests (SQLite)
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v7
    - uses: astral-sh/setup-uv@v9
    - name: Install dependencies
      run: uv sync --frozen --group dev
    - name: Run tests with coverage
      run: uv run pytest -v --cov --cov-report=term-missing --cov-report=xml
    - name: Coverage summary
      if: always()
      run: |
        echo "## Coverage Report (SQLite)" >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
        uv run coverage report >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
```

### Job 2: Tests mit PostgreSQL (Service-Container)

```yaml
test-postgres:
  name: Tests (PostgreSQL)
  runs-on: ubuntu-latest
  timeout-minutes: 10
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: todo_test
        POSTGRES_USER: todo
        POSTGRES_PASSWORD: todo
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 5s
        --health-timeout 3s
        --health-retries 5
  steps:
    - uses: actions/checkout@v7
    - uses: astral-sh/setup-uv@v9
    - name: Install dependencies
      run: uv sync --frozen --group dev --extra postgres
    - name: Run tests against PostgreSQL
      env:
        DATABASE_URL: "postgresql+psycopg://todo:todo@localhost:5432/todo_test"
      run: uv run pytest -v
```

Django nutzt `services:` mit Health-Checks in `check-migrations.yml`, `coverage_tests.yml` und `schedule_tests.yml`.
Der Demonstrator übernimmt dieses Muster: GitHub Actions startet einen PostgreSQL-Container als Sidecar, der Health-Check (`pg_isready`) stellt sicher, dass die Datenbank bereit ist, bevor die Tests starten.

Die Datenbank-URL wird per Umgebungsvariable `DATABASE_URL` übergeben.
Lokal und im SQLite-Job ist sie nicht gesetzt, sodass der Default (`sqlite:///./todo.db`) greift.

### Coverage-Integration

Django trennt Test-Coverage in zwei On-Demand-Workflows (`coverage_tests.yml` + `coverage_comment.yml`), die nur per Label aktiviert werden.
Denn bei Django dauern die Tests mit Coverage Minuten, zu teuer für jeden PR.

Im Demonstrator dauern alle Tests ungefähr eine Sekunde.
Deshalb läuft Coverage **immer mit** (`--cov`) und die Ergebnisse werden als **Job Summary** direkt in der GitHub Actions UI angezeigt.

| Aspekt | Django | Demonstrator |
|---|---|---|
| Trigger | On-Demand (Label `coverage`) | Immer (bei jedem Push/PR) |
| Ergebnis-Anzeige | PR-Kommentar (separater Workflow mit Schreibrechten) | Job Summary (keine Extra-Permissions nötig) |
| Workflows | 2 (Tests + Kommentar) | 1 (integriert) |
| Schwellenwert | Keiner | `fail_under = 80` in `pyproject.toml` |

**Schwellenwert**: Die Coverage-Konfiguration in `pyproject.toml` definiert ein Minimum von 80%:

```toml
[tool.coverage.run]
source = ["app"]

[tool.coverage.report]
show_missing = true
fail_under = 80
```

Fällt die Coverage unter 80%, schlägt der Workflow fehl. Neue Änderungen **müssen** getestet sein.

### Docker Compose

Lokal lassen sich App und Datenbank mit Docker Compose starten:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: todo
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: todo
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo"]

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: "postgresql+psycopg://todo:todo@db:5432/todo"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - api
```

`depends_on` mit `condition: service_healthy` stellt sicher, dass die API erst startet, wenn PostgreSQL bereit ist - dasselbe Prinzip wie die Health-Checks in den CI-Service-Containern.

### Job 3: Frontend-Tests (wie Djangos `javascript-tests`)

```yaml
test-frontend:
  name: Frontend Tests (Vitest)
  runs-on: ubuntu-latest
  timeout-minutes: 10
  defaults:
    run:
      working-directory: frontend
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with:
        node-version: "22"
        cache: "npm"
        cache-dependency-path: "frontend/package-lock.json"
    - run: npm ci
    - run: npm test
```

Django führt JavaScript-Tests als eigenen parallelen Job `javascript-tests` in `tests.yml` aus - mit QUnit als Test-Framework und Grunt + Puppeteer als Runner. Der Demonstrator nutzt das moderne Äquivalent:

| Aspekt | Django | Demonstrator |
|---|---|---|
| Test-Framework | QUnit | Vitest |
| Test-Runner | Grunt + Puppeteer (Headless Chrome) | Vitest + jsdom |
| DOM-Umgebung | Echter Browser (Puppeteer) | Simuliert (jsdom) |
| Bibliothek | Manuell (jQuery + QUnit Assertions) | React Testing Library |
| Testdateien | `js_tests/*.test.js` (12 Dateien) | `src/**/*.test.{js,jsx}` (4 Dateien, 22 Tests) |

Die Tests prüfen:

- **API-Client** (`api.test.js`): fetch-Aufrufe, Fehlerbehandlung, Filter-Parameter
- **TodoForm** (`TodoForm.test.jsx`): Formular-Rendering, Submit, Validierung, Feld-Reset
- **TodoItem** (`TodoItem.test.jsx`): Checkbox-State, Toggle/Delete-Callbacks, Priority-Labels, CSS-Klassen
- **TodoList** (`TodoList.test.jsx`): Leerer Zustand, Rendering aller Todos

### Vergleich zu Django

| Aspekt | Django (`tests.yml` + weitere) | Demonstrator (`tests.yml`) |
|---|---|---|
| Jobs | 3 parallel (Windows, JS, Scripts) | 3 parallel (SQLite, PostgreSQL, Frontend) |
| Backend-Datenbanken | SQLite + PostgreSQL (Service-Container) | SQLite + PostgreSQL (Service-Container) |
| Frontend-Tests | QUnit + Puppeteer (eigener Job) | Vitest + Testing Library (eigener Job) |
| Coverage | Separater On-Demand-Workflow | Integriert, immer aktiv |
| Docker Compose | - (Framework, nicht deploybar) | `docker-compose.yml` (App + DB + Frontend) |

---

## 3. E2E Tests (`e2e.yml`)

**Konfigurationsdatei:** [`e2e.yml`](../../.github/workflows/e2e.yml)

**Trigger:** Pull Requests mit Label `e2e` (On-Demand)

Django nutzt **Selenium mit Chrome Headless** für Browser-Tests der Admin-UI. Diese Tests laufen nicht bei jedem PR, sondern nur **on-demand per Label** (`selenium`).
Sie sind teurer als Unit-Tests, weil sie einen echten Browser starten.

Der Demonstrator übernimmt genau dieses Pattern mit **Playwright** als modernem Äquivalent:

```yaml
e2e:
  # Label-gated: Läuft nur wenn "e2e" Label gesetzt ist
  if: contains(github.event.pull_request.labels.*.name, 'e2e')
  name: Playwright (Chromium)
  runs-on: ubuntu-latest
  steps:
    # Backend + Frontend starten
    - run: uv run uvicorn app.main:app --port 8000 &
    - run: npm ci
    - run: npx playwright install chromium --with-deps

    # E2E-Tests im echten Browser
    - run: npm run test:e2e

    # Screenshots bei Fehler als Artefakt hochladen
    - uses: actions/upload-artifact@v7
      if: failure()
      with:
        name: playwright-report-${{ github.event.pull_request.head.sha }}
        path: frontend/test-results/
```

### Was wird getestet? 

Die E2E-Tests verifizieren den **gesamten Stack durch einen echten Browser**, also Frontend, API und Datenbank zusammen:

| Test | Verifiziert |
|---|---|
| App-Titel sichtbar | Frontend rendert korrekt |
| Leerer Zustand | Empty State wird angezeigt |
| Todo erstellen | Formular → API → DB → Anzeige |
| Todo abhaken/wieder öffnen | Checkbox → PUT → Reload → CSS-Klasse |
| Todo löschen | Delete-Button → DELETE → Reload → Empty State |
| Mehrere Todos | Liste rendert mehrere Items |
| Input-Reset | Formular wird nach Submit geleert |

### Vergleich zu Django

| Aspekt | Django (`selenium.yml`) | Demonstrator (`e2e.yml`) |
|---|---|---|
| Tool | Selenium + Chrome Headless | Playwright + Chromium Headless |
| Trigger | On-Demand (Label `selenium`) | On-Demand (Label `e2e`) |
| Screenshots | Eigener Workflow (`screenshots.yml`) + oxipng + Artifact Upload | Integriert: automatisch bei Fehler + Artifact Upload |
| Datenbanken | SQLite + PostgreSQL (2 Jobs) | SQLite (1 Job) |
| Testdaten-Cleanup | Django-TestCase (Transaktion-Rollback) | API-Aufrufe in `beforeEach` |
| Tests auch in Nightly? | Ja (`schedule_tests.yml`) | Nein (Tests laufen in Sekunden) |

### On-Demand-Konzept

Django setzt Selenium-Tests bewusst **nicht** bei jedem PR ein.

Der Demonstrator übernimmt dieses Konzept. 
Während die Unit-Tests (Vitest) bei jedem PR laufen, werden E2E-Tests nur bei Bedarf ausgelöst: 
**ein Maintainer setzt das Label `e2e` auf den PR**, und der Workflow startet automatisch.

---

## 4. Security (`security.yml`)

**Konfigurationsdatei:** [`security.yml`](../../.github/workflows/security.yml)

**Trigger:** Push auf `main`, Pull Requests, **wöchentlicher Cron** (Montags 08:00 UTC), manuell auslösbar

```yaml
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: "0 8 * * 1"
  workflow_dispatch:
```

Dieser Workflow demonstriert zwei Django-Konzepte gleichzeitig:

### Supply-Chain-Security

Django sichert seine CI-Pipeline mit [zizmor](https://docs.zizmor.sh/) ab - einem Scanner für GitHub Actions Workflows.
Der Demonstrator wendet dasselbe Prinzip auf die Angriffsfläche **Abhängigkeiten** an.

[pip-audit](https://github.com/pypa/pip-audit) prüft alle installierten Python-Pakete gegen bekannte Schwachstellen (CVE-Datenbanken wie PyPI Advisory Database und OSV).

```yaml
dependency-audit:
  name: pip-audit (Dependency Scan)
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - uses: actions/checkout@v7
    - uses: astral-sh/setup-uv@v9
    - name: Install dependencies
      run: uv sync --frozen --group dev
    - name: Audit dependencies
      run: uv run pip-audit
```

### Scheduled Execution

Der `schedule`-Trigger ist von Djangos `schedules.yml` inspiriert.
Django nutzt nächtliche Cron-Jobs, um die vollständige Testmatrix gegen neue Python-Versionen zu prüfen.

Der Demonstrator nutzt einen wöchentlichen Cron-Job für den Dependency-Scan.
Neue Schwachstellen können jederzeit in bestehenden Paketen entdeckt werden, der wöchentliche Scan findet sie auch ohne Code-Änderungen.

**`workflow_dispatch`** erlaubt zusätzlich das manuelle Auslösen - analog zu Djangos `schedule_tests.yml`.

---

## 5. PR Checks (`pr_checks.yml`)

**Konfigurationsdatei:** [`pr_checks.yml`](../../.github/workflows/pr_checks.yml)

**Trigger:** Pull Requests (opened, edited, synchronize, reopened)

Django nutzt drei separate Workflows, um die Prozessqualität von Pull Requests sicherzustellen: `labels.yml`, `check_pr_quality.yml` und `check_commit_messages.yml`.
Ergänzend dazu definiert Djangos [`pull_request_template.md`](https://github.com/django/django/blob/main/.github/pull_request_template.md) ein PR-Template, das Entwicklern die erwarteten Felder vorgibt: Ticketnummer, Beschreibung, Checkliste.

Der Demonstrator übernimmt dieses Zusammenspiel: 
Das **PR-Template** leitet den Entwickler an, der **Workflow** prüft automatisch, ob die Vorgaben eingehalten wurden.

### PR-Template (`pull_request_template.md`)

**Konfigurationsdatei:** [`pull_request_template.md`](../../.github/pull_request_template.md)

Wird automatisch als Vorlage geladen, wenn ein neuer PR auf GitHub erstellt wird:

```markdown
#### Issue
<!-- Referenziere das zugehörige GitHub Issue (z.B. #42). -->
<!-- Falls kein Issue existiert: Erstelle zuerst eines oder schreibe "N/A" mit kurzer Begründung. -->

Closes #XXXX

#### Beschreibung
<!-- Was ändert dieser PR und warum? (mind. 5 Wörter, wird vom PR-Check geprüft) -->

#### Checkliste
- [ ] Dieser PR referenziert ein GitHub Issue.
- [ ] Dieser PR zielt auf den `main`-Branch.
- [ ] Ich habe relevante Tests hinzugefügt oder aktualisiert.
- [ ] Die CI-Pipeline (Linting, Tests) läuft erfolgreich.
```

Das Template enthält `Closes #XXXX` anstatt nur `#XXXX` - das Schlüsselwort `Closes` bewirkt, 
dass GitHub das referenzierte Issue **automatisch schließt**, wenn der PR gemerged wird.

### Workflow: Zwei parallele Jobs

### Job 1: Issue-Referenz (aus Djangos `labels.yml`)

Django prüft, ob der PR-Titel eine Trac-Ticketnummer enthält, und setzt automatisch ein Label `"no ticket"`, wenn nicht.
Der Demonstrator übernimmt dieses Konzept für **GitHub Issues**:

```yaml
ticket-reference:
  name: Issue Reference
  steps:
    - name: Check for issue reference and manage labels
      uses: actions/github-script@v9
      with:
        script: |
          const title = context.payload.pull_request.title;
          const body = context.payload.pull_request.body || '';
          const regex = /#[0-9]+/;
          const hasRef = regex.test(title) || regex.test(body);
          // Label "no ticket" hinzufügen oder entfernen
```

Der Check sucht nach `#123`-Referenzen sowohl im **Titel** als auch im **Body** des PRs.
Fehlt die Referenz, wird das Label `"no ticket"` gesetzt - der PR wird dadurch nicht blockiert, aber das fehlende Ticket ist sichtbar.

### Job 2: PR-Beschreibung (aus Djangos `check_pr_quality.yml`)

Django prüft unter anderem, ob eine aussagekräftige Beschreibung vorhanden ist (mindestens 5 Wörter).
Der Demonstrator übernimmt genau diesen Check:

```yaml
pr-description:
  name: PR Description
  steps:
    - name: Check PR description
      uses: actions/github-script@v9
      with:
        script: |
          const body = context.payload.pull_request.body || '';
          const wordCount = body.trim().split(/\s+/).filter(w => w.length > 0).length;
          if (wordCount < 5) {
            core.setFailed(`PR description is too short (${wordCount} words).`);
          }
```

Dieser Check **blockiert** den PR, wenn die Beschreibung fehlt oder zu kurz ist.
Das erzwingt, dass Teammitglieder dokumentieren, **was** und **warum** sie ändern.

---

## 6. Deployment: CD (`cd.yml`)

**Konfigurationsdatei:** [`cd.yml`](../../.github/workflows/cd.yml)

**Trigger:** Push auf `main`

Das [GitHub Ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) ([`.github/rulesets/branch-protection.json`](../../.github/rulesets/branch-protection.json)) schützt den main-Branch davor, dass fehlerhafter oder ungeprüfter Code gemerged wird, indem es einen Merge erst zulässt, wenn alle 8 definierten Required Status Checks (Linting, Tests, Security) und ein Code Review bestanden sind.
Der Deployment-Workflow braucht daher keinen expliziten Verweis auf die CI-Workflows,
weil GitHub selbst den Merge blockiert, solange diese Checks nicht bestanden sind.


Der Workflow enthält drei Jobs mit `needs:`-Verkettung:

```
build-api ──┐
            ├──→ deploy (needs: [build-api, build-frontend])
build-frontend ┘
```

`needs:` ist GitHubs Mechanismus für Job-Abhängigkeiten innerhalb eines Workflows. 
Der Deploy-Job startet so erst, wenn **beide** Build-Jobs erfolgreich abgeschlossen sind. 
Schlägt ein Build fehl, wird nicht deployed.

### Docker-Builds (2 parallele Jobs)

Der Workflow baut **zwei Images parallel** - API und Frontend:

```yaml
build-api:
  name: Build & Push API Image
  permissions:
    contents: read
    packages: write
  steps:
    - uses: actions/checkout@v7
    - name: Set image name (lowercase)
      run: echo "IMAGE_NAME=$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV
    - uses: docker/login-action@v4
    - uses: docker/build-push-action@v7
      with:
        context: .
        tags: |
          ghcr.io/${{ env.IMAGE_NAME }}:latest
          ghcr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
```



| Image | Dockerfile | Inhalt |
|---|---|---|
| `ghcr.io/<repo>:latest` | `./Dockerfile` | FastAPI + Python-Pakete (uv) |
| `ghcr.io/<repo>-frontend:latest` | `./frontend/Dockerfile` | React-Build + nginx |

Jedes Image bekommt zwei Tags:

- **`latest`** - Immer die aktuellste Version auf `main`.
- **`<commit-sha>`** - Eindeutige, unveränderliche Referenz auf genau diesen Build.

### Dockerfile mit Health Check

```dockerfile
# Stage 1: Builder - hat uv, installiert Abhängigkeiten
FROM python:3.14-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /build
COPY pyproject.toml uv.lock* ./
RUN uv pip install --system --prefix=/install ".[postgres]"

# Stage 2: Runtime - hat kein uv, nur die fertigen Pakete
FROM python:3.14-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY app/ app/

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Kein `uv run` im Container?**

Lokal und in der CI wird jeder Python-Befehl über `uv run` ausgeführt, weil uv dort eine virtuelle Umgebung (`.venv`) verwaltet.
Im Docker-Container ist das anders:

- Die **Builder-Stage** nutzt uv einmalig, um die Pakete zu installieren (`uv pip install --system --prefix=/install`). Das `--system`-Flag installiert direkt ins System-Python, nicht in eine `.venv`.
- Die **Runtime-Stage** kopiert nur die fertigen Pakete nach `/usr/local`. uv selbst wird **nicht** in das Runtime-Image kopiert.

Das Runtime-Image enthält bewusst **weder uv noch pip noch Build-Tools**:

| Was | Builder-Stage | Runtime-Stage |
|---|---|---|
| uv | Ja (zum Installieren) | Nein |
| pip | Ja (im Base-Image) | Nein (nicht kopiert) |
| setuptools / wheel | Ja | Nein |
| Installierte Pakete | In `/install` | In `/usr/local` (kopiert) |
| App-Code | Nein | Ja |

Weniger Tools im Runtime-Image bedeutet: kleineres Image, weniger Angriffsfläche, keine Möglichkeit zur Laufzeit Pakete nachzuinstallieren.

Das `HEALTHCHECK`-Directive prüft regelmäßig den `/health`-Endpoint der API.
Container-Orchestrierungstools (z.B. Docker Compose oder Kubernetes) nutzen diesen Check, um ungesunde Container automatisch neu zu starten.

### Deploy-Job (via `needs:`)

Der Deploy-Job ist im selben Workflow wie die Build-Jobs und nutzt `needs:` um erst nach erfolgreichem Build beider Images zu starten:

```yaml
deploy:
  name: Deploy to Swarm
  needs: [build-api, build-frontend]    # Wartet auf beide Builds
  steps:
    - uses: appleboy/scp-action@v0.1.7       # Compose-File auf Server kopieren
    - uses: appleboy/ssh-action@v1.2.5       # docker stack deploy ausführen
      with:
        envs: API_IMAGE,FRONTEND_IMAGE       # Variablen sicher übergeben
        script: |
          docker pull "$API_IMAGE"
          docker pull "$FRONTEND_IMAGE"
          docker stack deploy -c docker-compose.prod.yml todo-api
      env:
        API_IMAGE: ghcr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
        FRONTEND_IMAGE: ghcr.io/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
```

Die Image-Referenzen werden über `env:` und `envs:` an die SSH-Session übergeben, statt sie direkt im `script:`-Block zu expandieren. 
Das verhindert Code-Injection über Template-Expansion.

`needs:` ist GitHubs nativer Mechanismus für Job-Abhängigkeiten. 
Im Gegensatz zu `workflow_run` (das zwischen separaten Workflow-Dateien verkettet) funktioniert `needs:` innerhalb desselben Workflows und erzeugt eine echte Dependency-Kette im GitHub Actions UI.

Der Workflow benötigt drei **GitHub Secrets**:

| Secret | Beschreibung |
|---|---|
| `DEPLOY_HOST` | IP-Adresse oder Hostname des Swarm-Manager-Servers |
| `DEPLOY_USER` | SSH-Benutzername |
| `DEPLOY_SSH_KEY` | Privater SSH-Schlüssel |

### Docker Swarm als Orchestrierungstool

Docker Swarm ist Dockers eingebauter **Cluster- und Orchestrierungsmodus**. 
Er erweitert die Docker Engine um die Fähigkeit, Container nicht nur auf einem einzelnen Host zu starten, sondern über mehrere Server hinweg koordiniert zu verwalten — inklusive Load Balancing, Rolling Updates und automatischem Neustart bei Ausfällen.

Ein Swarm-Cluster besteht aus **Manager-Nodes** (steuern das Cluster) und **Worker-Nodes** (führen Container aus).
Im einfachsten Fall — wie beim Demonstrator — übernimmt ein einzelner Server beide Rollen.

**Warum Docker Swarm und nicht Kubernetes?**

| Kriterium | Docker Swarm | Kubernetes |
|---|---|---|
| Einrichtung | `docker swarm init` (ein Befehl) | Cluster-Setup mit kubeadm, Helm, etc. |
| Konfiguration | Standard `docker-compose.yml` mit `deploy:`-Sektion | Eigene Manifest-Dateien (Deployments, Services, Ingress) |
| Lernkurve | Gering — wer Docker Compose kennt, kann Swarm nutzen | Steil — eigenes Ökosystem mit vielen Konzepten |
| Skalierung | Dutzende Server, Hunderte Container | Tausende Server, Zehntausende Container |
| Geeignet für | Kleine bis mittlere Projekte | Große verteilte Systeme, Enterprise |

Für den Demonstrator ist Docker Swarm die richtige Wahl, weil es **die gesamte Orchestrierung mit bereits bekannten Werkzeugen** ermöglicht: Compose-Dateien definieren die Services, `docker stack deploy` rollt sie aus. 
Es gibt kein zusätzliches Tool zu lernen oder zu betreiben.

**Wie Docker Swarm im Demonstrator eingesetzt wird:**

1. **Deployment:** Der CD-Workflow kopiert `docker-compose.prod.yml` auf den Server und führt `docker stack deploy` aus — Swarm startet die definierten Services als Cluster-Tasks.
2. **Replicas:** Swarm verteilt mehrere Instanzen desselben Services und leitet Requests per internem Load Balancer (Layer 4) automatisch an verfügbare Container weiter.
3. **Rolling Updates:** Bei einem neuen Deployment ersetzt Swarm Container einzeln (`parallelism: 1`, `order: start-first`), sodass der Service durchgehend erreichbar bleibt.
4. **Self-Healing:** Fällt ein Container aus (z.B. Health-Check schlägt fehl), startet Swarm automatisch einen neuen, um die gewünschte Replica-Anzahl wiederherzustellen.

### Produktions-Compose (`docker-compose.prod.yml`)

Die Produktionsdatei [`docker-compose.prod.yml`](../../docker-compose.prod.yml) unterscheidet sich von der Entwicklungsdatei in vier Punkten:

| Aspekt | `docker-compose.yml` (Dev) | `docker-compose.prod.yml` (Prod) |
|---|---|---|
| API-Image | `build: .` (baut lokal) | `image: ghcr.io/<repo>:latest` (aus Registry) |
| Frontend-Image | `build: ./frontend` (baut lokal) | `image: ghcr.io/<repo>-frontend:latest` (aus Registry) |
| Replicas | 1 (implizit) | 2 (Load Balancing) |
| Update-Strategie | - | Rolling Update (`start-first`, `parallelism: 1`) |

Die `deploy`-Sektion konfiguriert Docker Swarm:

```yaml
deploy:
  replicas: 2                    # Zwei API-Instanzen
  update_config:
    parallelism: 1               # Ein Container nach dem anderen
    delay: 10s                   # 10s Pause zwischen Updates
    order: start-first           # Neuer Container startet VOR dem alten
  rollback_config:
    parallelism: 1               # Bei Fehler: einzeln zurückrollen
```

**`order: start-first`** ermöglicht Zero-Downtime-Deployments: 
Der neue Container wird gestartet und muss den Health-Check bestehen, bevor der alte Container gestoppt wird. 
Zu keinem Zeitpunkt gibt es null laufende Instanzen.

### Einrichtung auf dem Server (einmalig)

```bash
# Docker Swarm initialisieren
docker swarm init

# GHCR-Zugriff einrichten
docker login ghcr.io -u <github-user> -p <personal-access-token>
```

---

## 7. Smoke-Test (`smoke-test.yml`)

**Konfigurationsdatei:** [`smoke-test.yml`](../../.github/workflows/smoke-test.yml)

**Trigger:** Push auf `main`, Pull Requests die Infrastruktur-Dateien ändern (`Dockerfile`, `frontend/Dockerfile`, `frontend/nginx/**`, `docker-compose.yml`, `pyproject.toml`, `app/**`)

Während `cd.yml` die Images baut und pusht, testet dieser Workflow (als Smoke-Test) den **gesamten Multi-Container-Stack**: Frontend + API + PostgreSQL zusammen.

```yaml
paths:
  - "Dockerfile"
  - "frontend/Dockerfile"
  - "frontend/nginx/**"
  - "docker-compose.yml"
  - "pyproject.toml"
  - "app/**"
```

Der `paths`-Filter ist ein Konzept aus Djangos `check-migrations.yml` und `docs.yml`: 
Der Workflow läuft nur, wenn sich relevante Dateien geändert haben.
Reine Dokumentations- oder Test-Änderungen lösen keinen Docker-Compose-Build aus.

### Ablauf

```yaml
# 1. Stack hochfahren (--wait wartet auf alle Health-Checks)
- name: Build and start containers
  run: docker compose up --build --wait -d

# 2. Smoke-Tests gegen die laufende API
- name: Health check
  run: curl --fail --silent http://localhost:8000/health | grep '"ok"'

- name: API smoke test
  run: |
    curl --fail --silent -X POST http://localhost:8000/todos \
      -H "Content-Type: application/json" \
      -d '{"title": "Smoke Test", "priority": "high"}' | grep '"Smoke Test"'
    curl --fail --silent http://localhost:8000/todos | grep '"Smoke Test"'

# 3. Bei Fehler: Logs anzeigen, dann aufräumen
- name: Container logs (on failure)
  if: failure()
  run: docker compose logs

- name: Tear down
  if: always()
  run: docker compose down -v
```

Dieser Workflow prüft, was Unit-Tests nicht abdecken können: 
Ob die **reale Deployment-Konfiguration** funktioniert - Dockerfile, Umgebungsvariablen, Container-Networking, Health-Checks und die Verbindung zwischen API und Datenbank.

---

## Ergänzende DevOps-Maßnahmen

Neben den Workflows gehören weitere Dateien und Praktiken zur DevOps-Infrastruktur des Demonstrators.

### Dependabot (`dependabot.yml`)

**Konfigurationsdatei:** [`dependabot.yml`](../../.github/dependabot.yml)

GitHub Dependabot erstellt automatisch Pull Requests, wenn Abhängigkeiten veraltet sind.
Während `pip-audit` in `security.yml` bekannte **Schwachstellen** findet, sorgt Dependabot für **proaktive Updates** - auch bei Versionen ohne Sicherheitsprobleme.

Der Demonstrator konfiguriert Dependabot für vier Ökosysteme:

| Ökosystem | Prüft | Beispiel-PR |
|---|---|---|
| `pip` | Python-Abhängigkeiten (`pyproject.toml`) | "deps: Bump fastapi from 0.111.0 to 0.112.0" |
| `npm` | Frontend-Abhängigkeiten (`frontend/package.json`) | "deps(frontend): Bump react from 19.2.7 to 19.3.0" |
| `github-actions` | Action-Versionen in Workflows | "ci: Bump actions/checkout from v4 to v5" |
| `docker` | Base-Images (`Dockerfile`) | "docker: Bump python from 3.12 to 3.13" |

Alle vier laufen wöchentlich (Montags) und erstellen PRs mit automatischen Labels (`dependencies`, `frontend`, `ci`, `docker`), sodass sie in der PR-Liste sofort erkennbar sind.

### Makefile

**Konfigurationsdatei:** [`Makefile`](../../Makefile)

Das Makefile standardisiert häufige Befehle. 
Statt sich Befehle wie `python -m pytest --cov-report=term-missing` zu merken, reicht `make test`.

```
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

Django nutzt Makefiles im `docs/`-Verzeichnis (`make lint`, `make black`, `make spelling`).
Der Demonstrator wendet dasselbe Prinzip auf das gesamte Projekt an.

### Multi-Container-Architektur

In Production laufen Frontend und Backend als **separate Container**:

```
                    ┌─────────────────────────────────┐
  Browser :80  ──>  │  nginx (Frontend-Container)     │
                    │  ├── / → React Single Page App  │
                    │  ├── /todos       → proxy → api │
                    │  └── /health      → proxy → api │
                    └─────────────────┬───────────────┘
                                      │
                    ┌─────────────────▼───────────────┐
                    │  uvicorn (API-Container)        │
                    │  ├── /todos   (FastAPI)         │
                    │  └── /health                    │
                    └─────────────────┬───────────────┘
                                      │
                    ┌─────────────────▼───────────────┐
                    │  PostgreSQL (DB-Container)      │
                    └─────────────────────────────────┘
```

Jeder Container hat ein eigenes Dockerfile mit Multi-Stage Build:

| Container | Dockerfile | Stages | Ergebnis |
|---|---|---|---|
| **API** | `Dockerfile` | Python Builder → Runtime | Schlankes Python-Image ohne Build-Tools |
| **Frontend** | `frontend/Dockerfile` | Node.js Build → nginx | Statische Dateien in nginx, kein Node.js zur Laufzeit |
| **DB** | (offizielles Image) | - | `postgres:16-alpine` |

Die nginx-Konfiguration (`frontend/nginx/default.conf`) übernimmt zwei Aufgaben:

1. **Static Serving**: React-Build direkt ausliefern (`try_files` für SPA-Routing)
2. **Reverse Proxy**: API-Requests (`/todos`, `/health`, `/docs`) an den Backend-Container weiterleiten

---
