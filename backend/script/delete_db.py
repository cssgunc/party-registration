from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import server_url

engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

with engine.connect() as connection:
    print("Deleting database...")
    connection.execute(text(f"DROP DATABASE {env.POSTGRES_DATABASE}"))

print("Database successfully deleted")
