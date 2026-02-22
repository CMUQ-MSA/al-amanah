from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# Import app config and models so Alembic uses our DB URL and sees schema
from app.config import get_settings
from app.database import Base
import app.models  # noqa: F401 - register all models in Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use app's DATABASE_URL instead of alembic.ini placeholder
settings = get_settings()
url = settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connect_args = {}
    if "sqlite" in url:
        connect_args["check_same_thread"] = False

    connectable = create_engine(
        url,
        connect_args=connect_args,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
