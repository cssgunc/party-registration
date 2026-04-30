"""remove_invite_token_string

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-04-29 00:00:00.000000

"""

# ruff: noqa
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_invite_tokens_token"), table_name="invite_tokens")
    op.drop_column("invite_tokens", "token")


def downgrade() -> None:
    op.add_column(
        "invite_tokens",
        sa.Column("token", sa.String(length=255), nullable=False, server_default=""),
    )
    op.create_index(op.f("ix_invite_tokens_token"), "invite_tokens", ["token"], unique=True)
