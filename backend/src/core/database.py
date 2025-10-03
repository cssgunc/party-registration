from typing import AsyncGenerator

from core.config import env
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


def server_url(sync: bool = False) -> str:
    """
    Gets the url for the base database server.

    :param sync: Whether to use synchronous or asynchronous database driver
    :type sync: bool
    """
    dialect = "postgresql+psycopg2" if sync else "postgresql+asyncpg"
    return f"{dialect}://{env.POSTGRES_USER}:{env.POSTGRES_PASSWORD}@{env.POSTGRES_HOST}:{env.POSTGRES_PORT}"


def database_url(database: str = env.POSTGRES_DATABASE) -> str:
    """
    Gets the url for the database.

    :param database: The database name (default: ocsl)
    :type database: str
    """
    return f"{server_url()}/{database}"


engine = create_async_engine(database_url(), echo=True)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class EntityBase(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Generator function offering dependency injection of SQLAlchemy Sessions."""
    async with AsyncSessionLocal() as session:
        yield session
