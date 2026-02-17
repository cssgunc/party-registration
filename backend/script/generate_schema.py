"""
This script generates a SQL file containing all CREATE TABLE statements
for MS SQL Server, to be provided to the database manager for pre-loading tables.
"""

from datetime import datetime
from pathlib import Path

import src.modules  # noqa: F401
from sqlalchemy.dialects import mssql
from sqlalchemy.schema import CreateIndex, CreateTable
from src.core.database import EntityBase


def generate_schema_sql(output_file: str = "schema.sql"):
    """
    Generate a complete MS SQL Server schema script with all CREATE TABLE statements.

    :param output_file: Path to the output SQL file
    :type output_file: str
    """
    dialect = mssql.dialect()
    output_path = Path(__file__).parent / output_file

    with open(output_path, "w") as f:
        # Write header
        f.write("-- =====================================================\n")
        f.write("-- MS SQL Server Database Schema\n")
        f.write("-- Generated from SQLAlchemy models\n")
        f.write(f"-- Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- =====================================================\n\n")

        # Generate CREATE TABLE statements for each table in dependency order
        for table in EntityBase.metadata.sorted_tables:
            create_statement = CreateTable(table).compile(dialect=dialect)

            f.write(str(create_statement).strip())
            f.write(";\n\n")

            # Generate CREATE INDEX statements for all indexes
            for index in table.indexes:
                create_index = CreateIndex(index).compile(dialect=dialect)
                f.write(str(create_index).strip())
                f.write(";\n\n")

    print(f"✓ Schema SQL file generated: {output_path}")
    print(f"✓ Total tables: {len(EntityBase.metadata.sorted_tables)}")
    print("\nTables included:")
    for table in EntityBase.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    generate_schema_sql()
