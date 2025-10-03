from core.config import env
from core.database import server_url
from sqlalchemy import create_engine, text

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    print("Creating database...")
    connection.execute(text(f"CREATE DATABASE {env.POSTGRES_DATABASE}"))

print("Database successfully created")
