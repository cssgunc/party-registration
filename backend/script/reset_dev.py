"""
This script resets the database for development mode, including:
- Dropping and recreating the existing database
- Dropping and recreating all tables
- Populating tables with initial data
"""

import asyncio
import json
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import src.modules as entities
from sqlalchemy import create_engine, text
from src.core.config import env
from src.core.database import AsyncSessionLocal, EntityBase, server_url
from src.core.database import engine as async_engine
from src.modules.account.account_model import AccountRole
from src.modules.incident.incident_model import IncidentSeverity
from src.modules.student.student_model import ContactPreference, StudentData


def parse_date(date_str: str | None) -> datetime | None:
    """Parse a date string in ISO format or relative format (e.g., NOW-7d, NOW+3h, NOW+5d@20:30)."""
    if not date_str or date_str == "null":
        return None

    now = datetime.now(UTC)

    if date_str.startswith("NOW"):
        match = re.match(r"NOW([+-])(\d+)([hdwmy])(?:@(\d{2}):(\d{2}))?", date_str)
        if match:
            sign, amount, unit, hour, minute = match.groups()
            amount = int(amount)
            if sign == "-":
                amount = -amount

            if unit == "h":
                result = now + timedelta(hours=amount)
            elif unit == "d":
                result = now + timedelta(days=amount)
            elif unit == "w":
                result = now + timedelta(weeks=amount)
            elif unit == "m":
                result = now + timedelta(days=amount * 30)
            elif unit == "y":
                result = now + timedelta(days=amount * 365)
            else:
                return now

            # Apply static time if provided (e.g., @20:30) - interpreted as local time
            if hour is not None and minute is not None:
                local_tz = ZoneInfo("America/New_York")
                # Convert to local, set the time, then convert back to UTC
                local_result = result.astimezone(local_tz)
                local_result = local_result.replace(
                    hour=int(hour), minute=int(minute), second=0, microsecond=0
                )
                result = local_result.astimezone(UTC)

            return result

        return now

    # Parse ISO format string and ensure it's timezone-aware
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


async def reset_dev():
    server_engine = create_engine(server_url(sync=True), isolation_level="AUTOCOMMIT")

    with server_engine.connect() as connection:
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

        print("Recreating database...")
        connection.execute(text(f"CREATE DATABASE [{env.MSSQL_DATABASE}]"))

    async with async_engine.begin() as connection:
        print("Dropping tables...")
        await connection.run_sync(EntityBase.metadata.drop_all)

        print("Recreating tables...")
        await connection.run_sync(EntityBase.metadata.create_all)

    print("Populating tables...")
    async with AsyncSessionLocal() as session:
        with open(
            str(Path(__file__).parent.parent.parent / "frontend" / "shared" / "mock_data.json"),
        ) as f:
            data = json.load(f)

        police = entities.PoliceEntity(
            email=data["police"]["email"],
            hashed_password=data["police"]["hashed_password"],
        )
        session.add(police)

        for account_data in data["accounts"]:
            account = entities.AccountEntity(
                pid=account_data["pid"],
                email=account_data["email"],
                first_name=account_data["first_name"],
                last_name=account_data["last_name"],
                onyen=account_data["onyen"],
                role=AccountRole(account_data["role"]),
            )
            session.add(account)

        await session.flush()

        for student_data in data["students"]:
            account = entities.AccountEntity(
                pid=student_data["pid"],
                email=student_data["email"],
                first_name=student_data["first_name"],
                last_name=student_data["last_name"],
                onyen=student_data["onyen"],
                role=AccountRole.STUDENT,
            )
            session.add(account)
            await session.flush()

            student = entities.StudentEntity.from_data(
                StudentData(
                    contact_preference=ContactPreference(student_data["contact_preference"]),
                    phone_number=student_data["phone_number"],
                    last_registered=parse_date(student_data.get("last_registered")),
                ),
                account.id,
            )
            session.add(student)

        for location_data in data["locations"]:
            location = entities.LocationEntity(
                hold_expiration=parse_date(location_data.get("hold_expiration")),
                formatted_address=location_data["formatted_address"],
                google_place_id=location_data["google_place_id"],
                street_number=location_data["street_number"],
                street_name=location_data["street_name"],
                unit=location_data.get("unit"),
                city=location_data["city"],
                state=location_data["state"],
                country=location_data["country"],
                zip_code=location_data["zip_code"],
                latitude=location_data["latitude"],
                longitude=location_data["longitude"],
            )
            session.add(location)

        await session.flush()

        for incident_data in data.get("incidents", []):
            incident_datetime = parse_date(incident_data["incident_datetime"])
            assert incident_datetime is not None, (
                f"incident_datetime required for incident {incident_data['id']}"
            )

            incident = entities.IncidentEntity(
                location_id=incident_data["location_id"],
                incident_datetime=incident_datetime,
                severity=IncidentSeverity(incident_data["severity"]),
                description=incident_data.get("description", ""),
            )
            session.add(incident)

        for party_data in data["parties"]:
            party_datetime = parse_date(party_data["party_datetime"])
            assert party_datetime is not None, (
                f"party_datetime required for party {party_data['id']}"
            )

            party = entities.PartyEntity(
                party_datetime=party_datetime,
                location_id=party_data["location_id"],
                contact_one_id=party_data["contact_one_id"],
                contact_two_first_name=party_data["contact_two"]["first_name"],
                contact_two_last_name=party_data["contact_two"]["last_name"],
                contact_two_email=party_data["contact_two"]["email"],
                contact_two_phone_number=party_data["contact_two"]["phone_number"],
                contact_two_contact_preference=ContactPreference(
                    party_data["contact_two"]["contact_preference"]
                ),
            )
            session.add(party)

        await session.commit()

    await async_engine.dispose()
    print("Database successfully reset!")


if __name__ == "__main__":
    asyncio.run(reset_dev())
