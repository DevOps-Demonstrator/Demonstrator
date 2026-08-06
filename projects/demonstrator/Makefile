.PHONY: help install run test lint check format audit docker clean

help: ## Verfügbare Befehle anzeigen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Abhängigkeiten installieren (App + Dev-Tools)
	uv sync --group dev
	uv run pre-commit install

run: ## App lokal starten (SQLite)
	uv run uvicorn app.main:app --reload

test: ## Tests mit Coverage ausführen
	uv run pytest -v --cov --cov-report=term-missing

lint: ## Formatting + Linting prüfen
	uv run black --check --diff .
	uv run ruff check .

format: ## Code automatisch formatieren
	uv run black .
	uv run ruff check --fix .

check: lint test ## Lint + Tests (wie in CI)

audit: ## Abhängigkeiten auf Schwachstellen prüfen
	uv run pip-audit

docker: ## Docker Compose starten (PostgreSQL)
	docker compose up --build

clean: ## Caches und Build-Artefakte entfernen
	rm -rf __pycache__ .pytest_cache .ruff_cache .coverage *.db .venv
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
