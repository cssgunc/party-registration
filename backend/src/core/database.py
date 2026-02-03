from collections.abc import AsyncGenerator

from sqlalchemy import URL
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import env


def _mssql_query() -> dict[str, str]:
    return {
        "driver": env.MSSQL_DRIVER,
        "TrustServerCertificate": env.MSSQL_TRUST_SERVER_CERTIFICATE,
    }


def server_url(sync: bool = False) -> URL:
    """
    Gets the URL for the master database (used for CREATE/DROP DATABASE).

    :param sync: Whether to use synchronous or asynchronous database driver
    :type sync: bool
    """
    return URL.create(
        drivername="mssql+pyodbc" if sync else "mssql+aioodbc",
        username=env.MSSQL_USER,
        password=env.MSSQL_PASSWORD,
        host=env.MSSQL_HOST,
        port=env.MSSQL_PORT,
        database="master",
        query=_mssql_query(),
    )


def database_url(database: str = env.MSSQL_DATABASE) -> URL:
    """
    Gets the URL for the application database.

    :param database: The database name (default: ocsl)
    :type database: str
    """
    return URL.create(
        drivername="mssql+aioodbc",
        username=env.MSSQL_USER,
        password=env.MSSQL_PASSWORD,
        host=env.MSSQL_HOST,
        port=env.MSSQL_PORT,
        database=database,
        query=_mssql_query(),
    )


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
