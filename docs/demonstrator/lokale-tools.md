# Lokale Tools

Im Folgenden werden die lokalen Tools des Demonstrators beschrieben, also alles, was **auf dem Rechner des Entwicklers** läuft, bevor Code gepusht wird.
Jedes Tool wird im Vergleich zur Django-Analyse erläutert, um zu zeigen, wie die dort identifizierten Konzepte für ein (insbesondere im Vergleich zu Django) kleineres Projekt angepasst wurden.

---

## Übersicht

| Tool | Funktion | Lokal | CI | Django-Äquivalent |
|---|---|---|---|---|
| `.editorconfig` | Einheitliche Editor-Einstellungen | Ja | - | `.editorconfig` (identisch) |
| **Black** | Python-Formatierung | Pre-Commit | Job | Black (identisch) |
| **Ruff** | Python-Linting + Import-Sortierung | Pre-Commit | Job | flake8 + isort (2 → 1) |
| **oxlint** | JavaScript-Linting (Frontend) | Pre-Commit | Job | biome |
| **zizmor** | Workflow-Security (GitHub Actions) | Pre-Commit | Job | zizmor (identisch) |
| **uv** | Paketmanagement, venv, Lockfile | Ja | Ja | pip + virtualenv + pip-tools (3 → 1) |
| `pyproject.toml` | Zentrale Python-Tool-Konfiguration | - | - | `.flake8` + `tox.ini` + `pyproject.toml` (3 → 1) |

Wie der Übersicht entnommen werden kann, ist die zentrale Idee dieselbe Qualitätssicherung wie bei Django umzusetzen, aber mit **weniger Tools und weniger Konfigurationsdateien**. 
Das ist möglich, weil der Demonstrator modernere Tools einsetzt, die jeweils mehrere ältere ersetzen. 
Zusätzlich wird die Python-Tool-Konfiguration (Black, Ruff, pytest, Coverage) in `pyproject.toml` zentralisiert.

---

## 1. EditorConfig

**Konzept aus der Django-Analyse:** EditorConfig ist die erste "Verteidigungslinie" - sie verhindert Formatierungsprobleme, bevor Code geschrieben wird.

Dieses Konzept wird **genauso übernommen**, da es ohne großen Aufwand in jedem Projekt unabhängig der Größe sinnvoll ist.

**Konfigurationsdatei:** [`.editorconfig`](../../.editorconfig)

```ini
root = true                        

[*]                                # Standardregeln für alle Dateien
indent_style = space               # Spaces statt Tabs
indent_size = 4                    # 4 Spaces Einrückung
end_of_line = lf                   # Unix-Zeilenenden (kein \r\n)
charset = utf-8                    # Einheitliche Zeichenkodierung
trim_trailing_whitespace = true    # Leerzeichen am Zeilenende entfernen
insert_final_newline = true        # Datei endet mit Newline

[*.py]                             # Python spezifisch 
max_line_length = 88               # Max Zeilenlänge

[*.{yml,yaml,json,toml}]          
indent_size = 2                    # 2 Spaces (YAML-, JSON-Konvention)

[Makefile]
indent_style = tab

[Dockerfile]
indent_size = 4
```

**Relevanz**: 
In Softwareprojekten nutzen Teammitglieder häufig verschiedene Editoren (VS Code, PyCharm, Vim, ...).
Ohne EditorConfig entstehen Commits, die nur aus Whitespace-Änderungen bestehen.
Das erzeugt beispielsweise unnötige Merge-Konflikte und erschwert Code Reviews.
Mit der EditorConfig wird dies gelöst, indem für verschiedene Dateitypen (hier Python, YAML, JSON, Dockerfile) vordefinierte Konfigurationen (etwa die maximale Zeilenlänge) automatisch beim Öffnen und Speichern einer Datei übernommen werden.

---

## 2. Code-Qualität (Lokal + CI)

**Konzept aus der Django-Analyse:** 
Fehler so früh wie möglich finden, bestenfalls noch vor dem Commit (Shift-Left Prinzip). 
Django setzt dafür sechs Pre-Commit Hooks ein und führt dieselben Prüfungen nochmal in der CI aus ("Trust but verify").

Der Demonstrator nutzt vier Tools für Code-Qualität, aufgeteilt in zwei Ebenen:

| Tool | Lokal (Pre-Commit) | CI (`linters.yml`) | Prüft |
|---|---|---|---|
| **Black** | Ja (Hook) | Ja (Job) | Python-Formatierung |
| **Ruff** | Ja (Hook) | Ja (Job) | Python-Linting + Import-Sortierung |
| **oxlint** | Ja (Hook) | Ja (Job) | JavaScript-Linting (Frontend) |
| **zizmor** | Ja (Hook) | Ja (Job) | GitHub Actions Workflow-Security |

Alle Tools laufen **bei jedem Commit** als Pre-Commit Hooks. 
Der Entwickler bekommt so direkt Feedback, egal ob Python-, JavaScript- oder Workflow-Dateien geändert wurden. 
Dieselben Prüfungen laufen nochmal in der CI als Sicherheitsnetz ("Trust but verify").

### 2.1 Pre-Commit Hooks

**Konfigurationsdatei:** [`.pre-commit-config.yaml`](../../.pre-commit-config.yaml)

```yaml
repos:
  # Python: Code-Formatierung (Einrückung, Zeilenlänge, Klammern, ...)
  - repo: https://github.com/psf/black-pre-commit-mirror
    rev: 24.10.0
    hooks:
      - id: black

  # Python: Linting (statische Code-Analyse) + Import-Sortierung (ersetzt flake8 + isort)
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.7.4
    hooks:
      - id: ruff
        args: [--fix]

  # JavaScript: Linting (Frontend)
  - repo: https://github.com/oxc-project/mirrors-oxlint
    rev: v0.16.10
    hooks:
      - id: oxlint
        files: ^frontend/.*\.(js|jsx)$    # Nur Frontend-Dateien prüfen

  # GitHub Actions: Workflow-Security
  - repo: https://github.com/zizmorcore/zizmor-pre-commit
    rev: v1.26.1
    hooks:
      - id: zizmor
```

**Installation:**

```bash
uv sync --group dev       # Installiert pre-commit als Dev-Dependency
uv run pre-commit install # Hooks in .git/hooks/ einrichten
```

Nach der Installation laufen alle vier Hooks **automatisch bei jedem `git commit`**. Schlägt eine Prüfung fehl, wird der Commit abgelehnt und der Entwickler behebt das Problem sofort.

**Black** ist der gleiche Formatter, den auch Django verwendet.
Er formatiert Python-Code deterministisch - es gibt keine Konfiguration des Stils (nur die Zeilenlänge ist einstellbar). 
Das löst Diskussionen über Codestil ("Klammern in derselben Zeile?", "Leerzeichen um Operatoren?"), weil Black entscheidet und niemand manuell formatieren muss.

**[Ruff](https://docs.astral.sh/ruff/)** ist ein moderner Python-Linter, der flake8 und isort in einem einzigen Tool vereint:

- **Ein Tool statt zwei**: Weniger Konfiguration, weniger Abhängigkeiten, weniger Versionskonflikte.
- **Schneller**: In Rust geschrieben, typischerweise 10-100x schneller als flake8.
- **`--fix`**: Behebt viele Probleme automatisch (z.B. falsche Import-Reihenfolge).
- **Mehr Regeln**: Neben PEP 8 (Regeln `E`, `W`, `F`) aktiviert der Demonstrator zusätzlich:

| Regelgruppe | Prüft | Beispiel |
|---|---|---|
| `I` (isort) | Import-Sortierung | Imports in falscher Reihenfolge |
| `UP` (pyupgrade) | Veraltete Python-Syntax | `dict()` statt `{}` |
| `B` (bugbear) | Häufige Fehlerquellen | Mutable Default-Argumente |
| `SIM` (simplify) | Vereinfachbaren Code | Unnötige `if-else`-Ketten |

### Vergleich zu Django

| Funktion | Django | Demonstrator | Wo |
|---|---|---|---|
| Code-Formatierung | Black | Black | Pre-Commit + CI |
| Docs-Formatierung | blacken-docs | - (keine RST-Docs) | - |
| Import-Sortierung | isort | Ruff (Regel `I`) | Pre-Commit + CI |
| Python-Linting | flake8 | Ruff (Regeln `E`, `W`, `F`, `B`, `SIM`) | Pre-Commit + CI |
| JS-Linting | biome | oxlint | Pre-Commit + CI |
| CI-Security | zizmor | zizmor | Pre-Commit + CI |

Wie bei Django laufen alle Linting-Tools sowohl lokal als Pre-Commit Hook als auch in der CI. 
Lokal gibt es sofortiges Feedback, die CI dient als Sicherheitsnetz falls jemand Pre-Commit nicht installiert hat.

---

## 3. Zentralisierte Konfiguration (`pyproject.toml`)

**Konzept aus der Django-Analyse:** Django verteilt seine Tool-Konfiguration über mehrere Dateien (`.flake8`, `tox.ini`, `pyproject.toml`, `biome.json`, `zizmor.yml`).
Das ist bei einem Projekt mit vielen Tools und historisch gewachsener Konfiguration nachvollziehbar.

Der Demonstrator konfiguriert **alle Tools in einer einzigen Datei**: `pyproject.toml`.

**Konfigurationsdatei:** [`pyproject.toml`](../../pyproject.toml)

### Projekt-Metadaten + Abhängigkeiten

```toml
[project]
name = "todo-api"
version = "0.1.0"
description = "FastAPI Todo-API -- CI/CT/CD Demonstrator"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.111.0,<1.0.0",
    "uvicorn>=0.30.0,<1.0.0",
    "sqlalchemy>=2.0.0,<3.0.0",
]

# Dev-Dependencies (PEP 735 Dependency Groups)
[dependency-groups]
dev = [
    "pytest>=8.0.0,<9.0.0",
    "pytest-cov>=5.0.0,<6.0.0",
    "httpx>=0.27.0,<1.0.0",
    "pre-commit>=3.7.0,<4.0.0",
    "ruff>=0.5.0,<1.0.0",
    "black>=24.0.0,<25.0.0",
    "pip-audit>=2.7.0,<3.0.0",
]
```

Entwicklungs-Abhängigkeiten sind als **Dependency Group** (vgl. PEP 735) definiert.
[uv](https://docs.astral.sh/uv/) nutzt diese Gruppen nativ mit `uv sync --group dev`.

```bash
uv sync --group dev    # App + Entwicklungstools
uv sync                # Nur die App
```

### uv als Paketmanager

Der Demonstrator nutzt **uv** statt pip als Python-Paketmanager.
uv ist von [Astral](https://astral.sh/) (gleiche Firma wie Ruff) und 10-100x schneller als pip.
Es ersetzt pip, pip-tools, virtualenv und pyenv in einem einzigen Tool.

| Aspekt | pip | uv |
|---|---|---|
| Installation | `pip install ".[dev]"` | `uv sync --group dev` |
| Befehl ausführen | `pytest` | `uv run pytest` |
| Lockfile | - (kein Standard) | `uv.lock` (deterministisch) |
| Geschwindigkeit | Baseline | 10-100x schneller |
| CI-Integration | `actions/setup-python` | `astral-sh/setup-uv` |
| Docker | `pip install` | `uv pip install` (oder `COPY --from=ghcr.io/astral-sh/uv`) |

**Best Practices mit uv:**

1. **Nie die `.venv` manuell aktivieren.** Statt `source .venv/bin/activate && pytest` immer `uv run pytest` nutzen. `uv run` stellt bei jedem Aufruf automatisch sicher, dass die virtuelle Umgebung existiert und mit dem Lockfile synchron ist.

2. **`uv.lock` committen.** Das Lockfile enthält die exakt aufgelösten Versionen aller Abhängigkeiten. Es stellt sicher, dass alle Teammitglieder und die CI dieselben Versionen verwenden (vergleichbar mit `package-lock.json` bei npm).

3. **`--frozen` in CI.** In der CI wird `uv sync --frozen` statt `uv sync` verwendet. Der `--frozen`-Flag verbietet uv, das Lockfile neu zu berechnen. Wenn jemand Abhängigkeiten in `pyproject.toml` ändert aber vergisst `uv lock` auszuführen, schlägt die CI fehl, anstatt still eine andere Version zu installieren.

4. **`uvx` für Einmal-Tools.** `uvx black --check .` installiert Black temporär in einer isolierten Umgebung und führt es sofort aus. Best-Practice für CI-Linting-Jobs, die das Tool nicht dauerhaft brauchen.

### Black-Konfiguration

```toml
[tool.black]
target-version = ["py310"]
line-length = 88
```

### Ruff-Konfiguration

```toml
[tool.ruff]
target-version = "py310"
line-length = 88

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort (import sorting)
    "UP",  # pyupgrade
    "B",   # flake8-bugbear
    "SIM", # flake8-simplify
]

[tool.ruff.lint.isort]
known-first-party = ["app"]
```

### Pytest-Konfiguration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
```

### Coverage-Konfiguration

```toml
[tool.coverage.run]
source = ["app"]

[tool.coverage.report]
show_missing = true
fail_under = 80
```

Coverage misst nur den `app/`-Ordner und schlägt fehl, wenn die Abdeckung unter 80% fällt.

### Vergleich: Konfigurationsdateien

| Aspekt | Django | Demonstrator |
|---|---|---|
| Projekt-Metadaten | `pyproject.toml` | `pyproject.toml` |
| Black | `pyproject.toml` | `pyproject.toml` |
| isort | `pyproject.toml` | `pyproject.toml` (via Ruff) |
| Linter (flake8/Ruff) | `.flake8` | `pyproject.toml` |
| Test-Runner | `tox.ini` | `pyproject.toml` |
| JS-Linter | `biome.json` | `package.json` (oxlint) |
| CI-Security | `zizmor.yml` | In `linters.yml` (zizmor-Action) |

---

Weiter zur **[CI/CD-Pipeline](pipeline.md)** - die Pipeline-seitige Umsetzung der hier beschriebenen lokalen Tools.
