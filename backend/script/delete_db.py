from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    print("Deleting database...")
    connection.execute(
        text(f"""
            IF EXISTS (SELECT * FROM sys.databases WHERE name = '{env.MSSQL_DATABASE}')
            BEGIN
                ALTER DATABASE [{env.MSSQL_DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [{env.MSSQL_DATABASE}];
            END
        """)
    )

print("Database successfully deleted")
