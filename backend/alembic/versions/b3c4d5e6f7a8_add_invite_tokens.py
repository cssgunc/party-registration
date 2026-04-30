"""add_invite_tokens

Revision ID: b3c4d5e6f7a8
Revises: a0853d102a0e
Create Date: 2026-04-28 00:00:00.000000

"""

# ruff: noqa
from typing import Sequence, Union

import sqlalchemy as sa
import src.core.types
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a0853d102a0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invite_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("STAFF", "ADMIN", name="invitetokenrole", native_enum=False, length=20),
            nullable=False,
        ),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("expires_at", src.core.types.UTCDateTime(fsp=6), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invite_tokens_email"), "invite_tokens", ["email"], unique=True)
    op.create_index(op.f("ix_invite_tokens_token"), "invite_tokens", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_invite_tokens_token"), table_name="invite_tokens")
    op.drop_index(op.f("ix_invite_tokens_email"), table_name="invite_tokens")
    op.drop_table("invite_tokens")
