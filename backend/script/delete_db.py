from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url, validate_sql_identifier

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

db_name = validate_sql_identifier(env.MYSQL_DATABASE)

with engine.connect() as connection:
    print(f"Deleting database '{db_name}'...")
    connection.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`"))
    print("Database successfully deleted")
