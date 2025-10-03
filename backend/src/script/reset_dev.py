import asyncio

from core.config import env
from core.database import AsyncSessionLocal, EntityBase, server_url
from core.database import engine as async_engine
from sqlalchemy import create_engine, text
import modules # Ensure all modules are imported so their entities are registered # noqa: F401

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
        # No data yet

        await session.commit()

    print("Database successfully reset!")


if __name__ == "__main__":
    asyncio.run(reset_dev())
