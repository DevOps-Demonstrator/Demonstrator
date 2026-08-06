from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine
from app.routers import todos

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Todo API",
    description="CI/CT/CD Demonstrator -- Eine einfache Todo-API.",
    version="0.1.0",
)


@app.get("/health")
def health():
    """Health-Check-Endpoint für Container-Orchestrierung."""
    return {"status": "ok"}


app.include_router(todos.router)

# In Production: React-Build aus frontend/dist/ ausliefern.
# In Entwicklung: Vite Dev-Server mit Proxy nutzen (siehe frontend/vite.config.js).
STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="static")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Fallback: Alle nicht-API-Pfade liefern index.html (SPA-Routing)."""
        return FileResponse(STATIC_DIR / "index.html")
