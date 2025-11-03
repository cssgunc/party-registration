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
        from src.modules.student.student_entity import StudentEntity
        from src.modules.student.student_model import ContactPreference

        student_account = AccountEntity(
            email="student@example.com",
            hashed_password="student",
            role=AccountRole.STUDENT,
        )
        admin_account = AccountEntity(
            email="admin@example.com",
            hashed_password="admin",
            role=AccountRole.ADMIN,
        )
        police_account = AccountEntity(
            email="police@example.com",
            hashed_password="police",
            role=AccountRole.POLICE,
        )

        session.add_all([student_account, admin_account, police_account])
        await session.flush()

        student = StudentEntity(
            first_name="John",
            last_name="Doe",
            call_or_text_pref=ContactPreference.call,
            phone_number="1234567890",
            account_id=student_account.id,
        )

        session.add(student)
        await session.commit()

    print("Database successfully reset!")


if __name__ == "__main__":
    asyncio.run(reset_dev())
