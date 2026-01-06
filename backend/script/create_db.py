from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    # Check if database already exists
    result = connection.execute(
        text(f"SELECT 1 FROM pg_database WHERE datname = '{env.POSTGRES_DATABASE}'")
    )
    if result.fetchone():
        print(f"Database '{env.POSTGRES_DATABASE}' already exists")
    else:
        print(f"Creating database '{env.POSTGRES_DATABASE}'...")
        connection.execute(text(f"CREATE DATABASE {env.POSTGRES_DATABASE}"))
        print("Database successfully created")
