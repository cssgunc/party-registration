from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import EntityBase


class ResourceTestUtils[
    ResourceEntity: EntityBase,
    ResourceData: BaseModel,
    OtherModels: BaseModel,
](ABC):
    """Abstract base class for test utilities that manage resource creation and validation.

    This utility class provides a standardized interface for repeated
    logic across tests. It is responsible for:
    - Generating unique test data for resources, including dicts, Pydantic models, and SQLAlchemy entities.
    - Creating multiple resource instances in the database for testing purposes.
    - Validating that two resource instances match in their data fields.
    It uses an internal counter to ensure unique test data generation across multiple calls.

    The class primarily provides default implementations for utility methods, expecting subclasses to
    provide overrides for any logic that doesn't match the default behavior. The only method that must be
    overridden is `generate_defaults`, which is responsible for generating unique default test data. Each
    subsequent method builds upon this to provide dicts, models, and entities.

    Note on overrides typing:
        Overrides are typed as `Any` in this base class because python does not support generic type parameters
        that extend `TypedDict`, and the only way to perfectly type kwargs are with `TypedDict`. In order for overrides
        to have proper typing, subclasses must override all methods that use kwargs, specifying the correct `TypedDict` type,
        delegating directly to the base class if not changing default behavior.

    Type Parameters:
        ResourceEntity: The SQLAlchemy entity class that implements EntityProtocl.
        ResourceData: The Pydantic model representing the resource's data object used to create entities.
        OtherModels: Additional Pydantic models that may be used in assertions,
            represented by a union if multiple models are applicable. Primarily used for typing in the assert_matches method.

    Attributes:
        session (AsyncSession): The SQLAlchemy async database session.
        count (int): Internal counter for generating unique test data.

    Examples:
        ```python
        class PersonOverrides(TypedDict, total=False):
            account_id: int
            first_name: str
            last_name: str
            ...

        class PersonTestUtils(ResourceTestUtils[PersonEntity, PersonData, Person | DbPerson]):
            @staticmethod
            def generate_defaults(count: int) -> dict:
                return {"first_name": f"FPerson{count}", "last_name": f"LPerson{count}", ...}

            @override
            async def next_dict(self, **overrides: Unpack[PersonOverrides]) -> dict:
                if "account_id" not in overrides:
                    account = await self.account_utils.create_one()
                    overrides["account_id"] = account.id
                return await super().next_dict(**overrides)

            # =============================== Typing Overrides ================================

            @override
            async def next_data(self, **overrides: Unpack[PersonOverrides]) -> PersonData:
                return await super().next_data(**overrides)

            ...

        # Usage in tests
        async def test_person_get_by_id(person_utils: PersonTestUtils):
            # Arrange
            person1, person2 = await person_utils.create_many(i=2)

            # Act
            fetched_person = await person_utils.get_by_id(person1.id)

            # Assert
            person_utils.assert_matches(person1, fetched_person)
        ```
    """

    def __init__(
        self,
        session: AsyncSession,
        *,
        entity_class: type[ResourceEntity],
        data_class: type[ResourceData],
    ):
        """Initialize the ResourceTestUtils with a database session and resource classes.

        Args:
            session (AsyncSession): The SQLAlchemy async database session.
            entity_class (type[ResourceEntity]): The SQLAlchemy entity class, for instantiation at runtime
            data_class (type[ResourceData]): The Pydantic model class for resource data, for instantiation at runtime
        """
        self.session = session
        self._ResourceEntity = entity_class
        self._ResourceData = data_class
        self.count = 0

    @staticmethod
    @abstractmethod
    def generate_defaults(count: int) -> dict:
        """Uniquely generate default test data for the resource based on count.

        Static to allow for use in a constant context, such as parameterized test arguments.
        """
        ...

    @classmethod
    def get_sample_data(cls) -> dict:
        """Static method to get a sample data dict for the resource."""
        return cls.generate_defaults(0)

    def get_or_default(self, overrides: Any | None = None, fields: set[str] | None = None) -> dict:
        """Get a dict of all necessary fields, overriding defaults for any provided in overrides.

        Args:
            overrides (TypedDict | None): A dict of fields to override the defaults.
                If None, no overrides are applied.
            fields (set[str] | None): An optional set of specific fields to include in the result.
                If None, all fields will be included.
        """
        if overrides is None:
            overrides = {}

        defaults = self.generate_defaults(self.count)

        return (
            {field: overrides.get(field, defaults[field]) for field in fields}
            if fields
            else {**defaults, **overrides}
        )

    async def next_dict(self, **overrides: Any) -> dict:
        """Generate the next unique test data dict for the resource, applying any overrides.

        Args:
            **overrides: Fields to override in the generated dict.
        """
        data = self.get_or_default(overrides)
        self.count += 1
        return data

    async def next_data(self, **overrides: Any) -> ResourceData:
        """Generate the next unique Pydantic creation model for the resource, applying any overrides.

        Args:
            **overrides: Fields to override in the generated model.
        """
        data = await self.next_dict(**overrides)
        return self._ResourceData(**data)

    async def next_entity(self, **overrides: Any) -> ResourceEntity:
        """Generate the next unique SQLAlchemy entity for the resource, applying any overrides.

        Args:
            **overrides: Fields to override in the generated entity.
        """
        data = await self.next_data(**overrides)
        return self._ResourceEntity.from_model(data)

    async def create_many(self, *, i: int, **overrides: Any) -> list[ResourceEntity]:
        """Create multiple resource entities in the database, applying any overrides to every entity.

        Args:
            i (int): The number of resource entities to create.
            **overrides: Fields to override in each created entity.
        """
        resources = [await self.next_entity(**overrides) for _ in range(i)]

        self.session.add_all(resources)
        await self.session.flush()
        await self.session.commit()

        return resources

    async def create_one(self, **overrides: Any) -> ResourceEntity:
        """Create a single resource entity in the database, applying any overrides.

        Args:
            **overrides: Fields to override in the created entity.
        """
        results = await self.create_many(i=1, **overrides)
        return results[0]

    async def get_all(self) -> list[ResourceEntity]:
        """Get all resource entities from the database."""
        result = await self.session.execute(select(self._ResourceEntity))
        return list(result.scalars().all())

    def entity_to_dict(self, entity: ResourceEntity) -> dict:
        """Convert a resource entity to a dict via its model representation."""
        return entity.to_model().model_dump()

    def assert_matches(
        self,
        resource1: ResourceEntity | ResourceData | OtherModels | None,
        resource2: ResourceEntity | ResourceData | OtherModels | None,
    ) -> None:
        """Assert that two resource instances match in all their shared fields.

        Extra fields are ignored; only shared fields are compared.

        Args:
            resource1 (ResourceEntity | ResourceData | OtherModels | None): The first resource instance.
            resource2 (ResourceEntity | ResourceData | OtherModels | None): The second resource instance.
        """
        assert resource1 is not None, "First resource is None"
        assert resource2 is not None, "Second resource is None"

        dict1 = (
            resource1.model_dump()
            if isinstance(resource1, BaseModel)
            else self.entity_to_dict(resource1)
        )
        dict2 = (
            resource2.model_dump()
            if isinstance(resource2, BaseModel)
            else self.entity_to_dict(resource2)
        )

        shared_keys = dict1.keys() & dict2.keys()
        for key in shared_keys:
            val1 = dict1[key]
            val2 = dict2[key]

            if isinstance(val1, datetime) and isinstance(val2, datetime):
                val1 = val1.replace(tzinfo=timezone.utc)
                val2 = val2.replace(tzinfo=timezone.utc)

            assert val1 == val2, f"Mismatch on field '{key}': {val1} != {val2}"
