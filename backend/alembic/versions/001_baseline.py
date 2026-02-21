"""Baseline - existing schema from create_all + migrate_db

This migration is a no-op. It marks the current production schema as the
starting point. Tables are created by Base.metadata.create_all() in init_db().
Overrides columns were added by migrate_db(). Future schema changes go in
new migrations.

Revision ID: 001
Revises: 
Create Date: 2025-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: schema already exists via create_all() and migrate_db()."""
    pass


def downgrade() -> None:
    """No-op."""
    pass
