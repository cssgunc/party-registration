"""
This script resets the database for development mode, including:
- Dropping and recreating the existing database
- Dropping and recreating all tables
- Populating tables with initial data
"""

import asyncio

import src.modules  # Ensure all modules are imported so their entities are registered # noqa: F401
from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import AsyncSessionLocal, EntityBase, server_url
from src.core.database import engine as async_engine


async def reset_dev():
    server_engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

    with server_engine.connect() as connection:
        print("Deleting database...")
        connection.execute(text(f"DROP DATABASE {env.POSTGRES_DATABASE}"))

        print("Recreating database...")
        connection.execute(text(f"CREATE DATABASE {env.POSTGRES_DATABASE}"))

    async with async_engine.begin() as connection:
        print("Dropping tables...")
        await connection.run_sync(EntityBase.metadata.drop_all)

        print("Recreating tables...")
        await connection.run_sync(EntityBase.metadata.create_all)

    print("Populating tables...")
    async with AsyncSessionLocal() as session:
        from src.modules.account.account_entity import AccountEntity, AccountRole
        from src.modules.police.police_entity import PoliceEntity
        from src.modules.student.student_entity import StudentEntity
        from src.modules.student.student_model import ContactPreference, StudentData

        student_account = AccountEntity(
            email="student@example.com",
            first_name="John",
            last_name="Doe",
            pid="111111111",
            role=AccountRole.STUDENT,
        )
        admin_account = AccountEntity(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            pid="222222222",
            role=AccountRole.ADMIN,
        )
        staff_account = AccountEntity(
            email="staff@example.com",
            first_name="Staff",
            last_name="Member",
            pid="333333333",
            role=AccountRole.STAFF,
        )

        session.add_all([student_account, admin_account, staff_account])
        await session.flush()

        student = StudentEntity.from_model(
            StudentData(
                contact_preference=ContactPreference.call,
                phone_number="1234567890",
            ),
            student_account.id,
        )

        session.add(student)

        police = PoliceEntity(
            id=1,
            email="police@example.com",
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7lCwEr0m6G",
        )
        session.add(police)

        await session.commit()

    print("Database successfully reset!")


if __name__ == "__main__":
    asyncio.run(reset_dev())
