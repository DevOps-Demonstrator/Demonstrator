# CI/CT/CD - Demonstrator (Studienarbeit) 

Die Studienarbeit untersucht und demonstriert DevOps-Prozesse, schwerpunktmäßig **Continuous Integration**, **Continuous Testing** und **Continuous Delivery/Deployment**, anhand eines Open-Source-Projektes als Fallbeispiel und eines Demonstrators.

## Aufbau

### 1. Analyse: Django 

Das [Django-Projekt (Python Web-Framework)](https://github.com/django/django) dient als Fallbeispiel. 
Es zeigt, wie ein großes Open-Source-Projekt mit >2.000 Contributors seine CI/CD-Prozesse organisiert.

Die Analyse zeigt den **Weg des Codes von der lokalen Entwicklung bis zum Deployment** auf:

| Thema | Analyse |
|---|---|
| Übersicht | [Django Analyse](django/übersicht.md) |
| Lokale Entwicklung (Pre-Commit, Tox, Linter) | [Lokale Tools](django/lokale-tools.md) |
| CI/CT Workflows (GitHub Actions) | [Workflows](django/workflows.md) |

### 2. Demonstrator: CI/CT/CD anhand Python-Webapp 

Die relevantesten Konzepte aus der Django-Analyse werden auf ein **Studenten-Projekt** übertragen: Eine FastAPI Todo-API mit vollständiger CI/CD-Pipeline.

| Thema | Dokumentation |
|---|---|
| Übersicht (Konzeptauswahl, App, Vergleich) | [Demonstrator Übersicht](demonstrator/übersicht.md) |
| Lokale Tools (EditorConfig, Pre-Commit, Ruff) | [Lokale Tools](demonstrator/lokale-tools.md) |
| CI/CD-Pipeline (GitHub Actions, Docker) | [CI/CD-Pipeline](demonstrator/pipeline.md) |

### 3. Cheat-Sheets

> TBD

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **CI** (Continuous Integration) | Jede Code-Änderung wird automatisch gebaut und getestet |
| **CT** (Continuous Testing) | Automatisierte Qualitätssicherung auf allen Ebenen (Unit, Integration, Security, ...) |
| **CD** (Continuous Delivery - Deployment) | Software ist jederzeit in einem auslieferbaren Zustand |

> **Hinweis:** Wenn in der Dokumentation der Einfachheit halber nur von **CI/CD** gesprochen wird, ist Continuous Testing (CT) dabei immer implizit als Teil der CI/CD-Prozesse zu verstehen.

