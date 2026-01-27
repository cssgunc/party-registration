"""
Package initializer for application modules.

Importing this package is an explicit way to make sure module
subpackages and their model files are imported.
This is important because SQLAlchemy only knows about mapped
classes that have been executed and registered with the project's
DeclarativeBase metadata. If model modules aren't imported, calling
`EntityBase.metadata.create_all()` may not create the corresponding
database tables (errors like "relation <table> does not exist").

Usage: import this package at startup or in scripts that create the DB:

        import modules  # ensures models are registered

This file's sole purpose is to trigger module imports
so table definitions are registered with SQLAlchemy.
"""

from .account.account_entity import AccountEntity
from .incident.incident_entity import IncidentEntity
from .location.location_entity import LocationEntity
from .party.party_entity import PartyEntity
from .police.police_entity import PoliceEntity
from .student.student_entity import StudentEntity

__all__ = [
    "AccountEntity",
    "IncidentEntity",
    "LocationEntity",
    "PartyEntity",
    "PoliceEntity",
    "StudentEntity",
]
