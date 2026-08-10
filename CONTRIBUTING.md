# Contributing

## Einrichtung

```bash
# uv installieren (falls noch nicht vorhanden)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Repository klonen
git clone <repo-url>
cd demonstrator

# Abhängigkeiten + Pre-Commit Hooks installieren
make install

# App starten
make run
```

## Entwicklungsworkflow

1. **Issue erstellen** - Beschreibe was du ändern willst und warum.
2. **Branch erstellen** - `git checkout -b feature/<kurze-beschreibung>`
3. **Code schreiben** - Pre-Commit Hooks (Black, Ruff) prüfen automatisch bei jedem Commit.
4. **Tests schreiben** - Neue Funktionalität braucht Tests. Coverage-Minimum: 80%.
5. **Lokal prüfen** - `make check` (Lint + Tests).
6. **PR erstellen** - Das PR-Template wird automatisch geladen. Issue referenzieren, Beschreibung ausfüllen.

## Befehle

| Befehl | Funktion |
|---|---|
| `make install` | Abhängigkeiten + Pre-Commit installieren |
| `make run` | App lokal starten (SQLite) |
| `make test` | Tests mit Coverage |
| `make lint` | Formatting + Linting prüfen |
| `make format` | Code automatisch formatieren |
| `make check` | Lint + Tests (wie in CI) |
| `make audit` | Dependency-Schwachstellenscan |
| `make docker` | Docker Compose starten (PostgreSQL) |

## Konventionen

- **Formatting**: Black (automatisch via Pre-Commit)
- **Linting**: Ruff (automatisch via Pre-Commit)
- **Tests**: pytest - in `tests/` ablegen, Fixtures aus `conftest.py` nutzen
- **Commits**: Aussagekräftige Messages, Issue-Referenz wenn möglich (`#42`)
- **PRs**: Immer gegen `main`, Beschreibung ausfüllen, Issue verlinken
