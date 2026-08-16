# CI/CT/CD-Demonstrator (Studienarbeit)

Dieses Repository enthält sowohl den **Demonstrator** (FastAPI Todo-API mit React-Frontend und CI/CD-Pipeline) als auch die zugehörigen **Dokumentationen (Django-Analyse und Demonstrator-Doku)** (MkDocs).

## Repo-Aufbau

| Bereich | Pfad | Beschreibung |
|---|---|---|
| **App (Backend)** | `app/` | FastAPI REST-API + SQLAlchemy |
| **App (Frontend)** | `frontend/` | React + Vite + nginx |
| **Tests** | `tests/`, `frontend/src/**/*.test.*`, `frontend/tests/` | pytest, Vitest, Playwright |
| **CI/CD** | `.github/workflows/` | 7 Workflows (Linters, Tests, E2E, PR Checks, Security, CD, Smoke-Test) + Pages |
| **Dokumentation** | `docs/` | MkDocs-Dokumentation (Django-Analyse + Demonstrator) |
| **Infrastruktur** | `Dockerfile`, `docker-compose*.yml` | Docker Multi-Stage Builds + Swarm Deployment |

## Dokumentation

Die vollständige Dokumentation ist als MkDocs-Seite aufgebaut:

| Thema | Seite |
|---|---|
| **Django-Analyse** | [docs/django/übersicht.md](docs/django/übersicht.md) |
| **Demonstrator** | [docs/demonstrator/übersicht.md](docs/demonstrator/übersicht.md) |

Unter folgender URL ist die GitHub Pages aufrufbar: https://devops-demonstrator.github.io/Demonstrator/  

## Quick Start

Befehle: `make install`, `make test`, `make lint`, `make check`, `make docker` (siehe [CONTRIBUTING.md](CONTRIBUTING.md)).

## Repository-Einrichtung

Für die vollständige CI/CD-Pipeline müssen im GitHub Repository einmalig konfiguriert werden:

- **GitHub Secrets** (Settings > Secrets and variables > Actions): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
- **Label `e2e`** (Issues > Labels): Für On-Demand E2E-Tests per PR
- **Ruleset importieren** (Settings > Rulesets): [`.github/rulesets/branch-protection.json`](.github/rulesets/branch-protection.json)

Details: [Demonstrator-Übersicht](docs/demonstrator/übersicht.md#repository-einrichtung) 
bzw https://devops-demonstrator.github.io/Demonstrator/demonstrator/%C3%BCbersicht/
