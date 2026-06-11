"""make_incident_description_nullable

Revision ID: 123806024a92
Revises: 6315f52c93cf
Create Date: 2026-06-09 11:53:53.626482

"""

# ruff: noqa
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = "123806024a92"
down_revision: Union[str, None] = "6315f52c93cf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "incidents", "description", existing_type=mysql.VARCHAR(length=2000), nullable=True
    )
    incidents = sa.table("incidents", sa.column("description", sa.String(2000)))
    op.execute(incidents.update().where(incidents.c.description == "").values(description=None))


def downgrade() -> None:
    incidents = sa.table("incidents", sa.column("description", sa.String(2000)))
    op.execute(incidents.update().where(incidents.c.description.is_(None)).values(description=""))
    op.alter_column(
        "incidents", "description", existing_type=mysql.VARCHAR(length=2000), nullable=False
    )
