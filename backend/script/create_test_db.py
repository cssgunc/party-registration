from sqlalchemy import create_engine, text
from src.core.database import server_url

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    # Check if test database already exists
    result = connection.execute(
        text("SELECT database_id FROM sys.databases WHERE name = :dbname"),
        {"dbname": "ocsl_test"},
    )
    if result.fetchone():
        print("Test database 'ocsl_test' already exists")
    else:
        print("Creating test database 'ocsl_test'...")
        connection.execute(text("CREATE DATABASE [ocsl_test]"))
        print("Test database successfully created")
