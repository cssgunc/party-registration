"""
Insert an already-expired invite token directly into the database.
Used by e2e tests to reproduce the expired-invite login-DoS bug without
waiting for a real token to expire.

Usage:
    python -m script.create_expired_invite <email> <role>

    role: "staff" | "admin"
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta

import src.modules as _  # noqa: F401 — registers all ORM entities
from src.core.database import AsyncSessionLocal
from src.modules.account.account_model import InviteTokenRole
from src.modules.account.invite_token_entity import InviteTokenEntity


async def main(email: str, role: str) -> None:
    async with AsyncSessionLocal() as session:
        invite = InviteTokenEntity(
            email=email,
            role=InviteTokenRole(role),
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )
        session.add(invite)
        await session.commit()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m script.create_expired_invite <email> <role>", file=sys.stderr)
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))
