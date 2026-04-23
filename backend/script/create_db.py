from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url, validate_sql_identifier

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

db_name = validate_sql_identifier(env.MYSQL_DATABASE)

with engine.connect() as connection:
    result = connection.execute(
        text("SELECT SCHEMA_NAME FROM information_schema.schemata WHERE SCHEMA_NAME = :dbname"),
        {"dbname": db_name},
    )
    if result.fetchone():
        print(f"Database '{db_name}' already exists")
    else:
        print(f"Creating database '{db_name}'...")
        connection.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}`"))
        print("Database successfully created")
