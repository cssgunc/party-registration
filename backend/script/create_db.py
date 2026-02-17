from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url, validate_sql_identifier

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

db_name = validate_sql_identifier(env.MSSQL_DATABASE)

with engine.connect() as connection:
    # Check if database already exists
    result = connection.execute(
        text("SELECT database_id FROM sys.databases WHERE name = :dbname"),
        {"dbname": db_name},
    )
    if result.fetchone():
        print(f"Database '{db_name}' already exists")
    else:
        print(f"Creating database '{db_name}'...")
        connection.execute(text(f"CREATE DATABASE [{db_name}]"))
        print("Database successfully created")
