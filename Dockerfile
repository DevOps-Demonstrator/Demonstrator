# --- Multi-Stage Build (API) ---
# Stage 1: Python-Abhängigkeiten mit uv installieren (schneller als pip)
# Stage 2: Schlankes Runtime-Image (nur fertige Pakete, ohne uv/pip/Build-Tools)

# Stage 1: Dependencies
FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /build
COPY pyproject.toml uv.lock* ./
RUN uv pip install --system --prefix=/install ".[postgres]"

# Stage 2: Runtime
FROM python:3.14-slim

WORKDIR /app

COPY --from=builder /install /usr/local
COPY app/ app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
