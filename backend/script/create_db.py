from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    # Check if database already exists
    result = connection.execute(
        text("SELECT database_id FROM sys.databases WHERE name = :dbname"),
        {"dbname": env.MSSQL_DATABASE},
    )
    if result.fetchone():
        print(f"Database '{env.MSSQL_DATABASE}' already exists")
    else:
        print(f"Creating database '{env.MSSQL_DATABASE}'...")
        connection.execute(text(f"CREATE DATABASE [{env.MSSQL_DATABASE}]"))
        print("Database successfully created")
