import re
from collections.abc import AsyncGenerator

from sqlalchemy import URL
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import env


def validate_sql_identifier(name: str) -> str:
    """Validate database name identifier to prevent injection."""
    if not re.match(r"^[a-zA-Z0-9_]+$", name):
        raise ValueError(f"Invalid database name: {name}")
    if len(name) > 128:
        raise ValueError(f"Database name too long: {name}")
    return name


def server_url(sync: bool = False) -> URL:
    """
    Gets the URL for admin operations (CREATE/DROP DATABASE).

    :param sync: Whether to use synchronous or asynchronous database driver
    :type sync: bool
    """
    return URL.create(
        drivername="mysql+pymysql" if sync else "mysql+aiomysql",
        username=env.MYSQL_USER,
        password=env.MYSQL_PASSWORD,
        host=env.MYSQL_HOST,
        port=env.MYSQL_PORT,
    )


def database_url(database: str = env.MYSQL_DATABASE) -> URL:
    """
    Gets the URL for the application database.

    :param database: The database name (default: ocsl)
    :type database: str
    """
    return URL.create(
        drivername="mysql+aiomysql",
        username=env.MYSQL_USER,
        password=env.MYSQL_PASSWORD,
        host=env.MYSQL_HOST,
        port=env.MYSQL_PORT,
        database=database,
    )


engine = create_async_engine(
    database_url(),
    echo=env.SQLALCHEMY_ECHO,
    connect_args={"init_command": "SET time_zone = 'UTC'"},
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class EntityBase(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Generator function offering dependency injection of SQLAlchemy Sessions."""
    async with AsyncSessionLocal() as session:
        yield session
