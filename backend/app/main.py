from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.database import SessionLocal
from app.limiter import limiter
from app.config import get_settings
from app.models import User, Role
from app.middleware.auth import hash_password
from app.services.scheduler import start_scheduler, stop_scheduler
from app.routers import (
    auth_router,
    users_router,
    semesters_router,
    weeks_router,
    events_router,
    tasks_router,
    dashboard_router,
    templates_router,
    roster_router,
    teams_router,
    comments_router,
    audit_router,
    stats_router,
    export_router
)

settings = get_settings()

# Set log level from config (default: WARNING to save HDD)
import os
log_level_str = os.getenv("LOG_LEVEL", settings.LOG_LEVEL)
log_level = getattr(logging, log_level_str, logging.WARNING)
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Smart CORS: Allow the actual origin when it's HTTPS (Cloudflare) or localhost (dev)
def get_cors_config():
    """
    Get CORS config based on environment.
    - Local dev: specific localhost origins
    - Production: regex for any HTTPS origin (Cloudflare enforces HTTPS)
    """
    if settings.DEBUG:
        return {"allow_origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost"]}
    else:
        # allow_origins doesn't support wildcards; use regex for HTTPS
        return {"allow_origin_regex": r"https://.*"}


def run_alembic_upgrade():
    """Run Alembic migrations (creates tables on fresh DB)."""
    from alembic.config import Config
    from alembic import command
    _backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(_backend, "alembic.ini")
    alembic_cfg = Config(ini_path)
    command.upgrade(alembic_cfg, "head")
    logger.info("Alembic migrations applied")


def _validate_production_secrets():
    """Fail fast if production uses default secrets."""
    if settings.DEBUG:
        return
    if settings.SECRET_KEY == "change-me-in-production":
        raise RuntimeError(
            "SECRET_KEY must be set in .env for production. "
            "Generate with: openssl rand -hex 32"
        )
    if settings.ADMIN_PASSWORD == "changeme123":
        raise RuntimeError(
            "ADMIN_PASSWORD must be changed in .env for production."
        )


def init_db():
    """Initialize database tables and create admin user if needed."""
    _validate_production_secrets()
    run_alembic_upgrade()
    
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not admin:
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                display_name="Admin",
                discord_id=settings.ADMIN_DISCORD_ID or None,
                role=Role.ADMIN
            )
            db.add(admin)
            db.commit()
            logger.info(f"Created admin user: {settings.ADMIN_USERNAME}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    init_db()
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler()


app = FastAPI(
    title="MSA Task Tracker",
    description="CMU Qatar Muslim Student Association Task Tracker",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - allows requests from configured frontend
cors_config = get_cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight responses for 1 hour
    **cors_config
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(semesters_router)
app.include_router(weeks_router)
app.include_router(events_router)
app.include_router(tasks_router)
app.include_router(dashboard_router)
app.include_router(templates_router)
app.include_router(roster_router)
app.include_router(teams_router)
app.include_router(comments_router)
app.include_router(audit_router)
app.include_router(stats_router)
app.include_router(export_router)


@app.get("/api/health")
async def health_check():
    """Health check: basic status + DB connectivity."""
    from sqlalchemy import text
    from app.database import engine
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {"status": "healthy", "database": "ok" if db_ok else "error"}
