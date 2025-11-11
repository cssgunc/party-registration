from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference, Student, StudentData
from src.modules.student.student_service import (
    AccountNotFoundException,
    InvalidAccountRoleException,
    StudentAlreadyExistsException,
    StudentConflictException,
    StudentNotFoundException,
    StudentService,
)


@pytest.fixture()
def student_service(test_async_session: AsyncSession) -> StudentService:
    return StudentService(session=test_async_session)


@pytest_asyncio.fixture()
async def student_entity(
    test_async_session: AsyncSession, test_account: AccountEntity
) -> StudentEntity:
    data = StudentData(
        first_name="Test",
        last_name="User",
        contact_preference=ContactPreference.text,
        phone_number="9999999999",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)
    return entity


@pytest.mark.asyncio
async def test_get_students_empty(student_service: StudentService):
    students = await student_service.get_students(page_number=1, page_size=10)
    assert len(students.items) == 0


@pytest.mark.asyncio
async def test_create_student(
    student_service: StudentService, test_account: AccountEntity
) -> None:
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="1234567890",
    )
    student = await student_service.create_student(data, account_id=test_account.id)
    assert isinstance(student, Student)
    assert student.id == test_account.id
    assert student.first_name == "John"
    assert student.last_name == "Doe"
    assert student.phone_number == "1234567890"


@pytest.mark.asyncio
async def test_create_student_conflict(
    student_service: StudentService,
    test_account: AccountEntity,
    test_async_session: AsyncSession,
) -> None:
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="1234567890",
    )
    await student_service.create_student(data, account_id=test_account.id)

    second_account = AccountEntity(
        email="second@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(second_account)
    await test_async_session.commit()
    await test_async_session.refresh(second_account)

    with pytest.raises(StudentConflictException):
        await student_service.create_student(data, account_id=second_account.id)


@pytest.mark.asyncio
async def test_get_students(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    accounts = []
    for i in range(3):
        acc = AccountEntity(
            email=f"user{i}@example.com",
            hashed_password="$2b$12$test_hashed_password",
            role=AccountEntity.role.type.enums[0],
        )
        test_async_session.add(acc)
        accounts.append(acc)
    await test_async_session.commit()
    for idx, acc in enumerate(accounts):
        data = StudentData(
            first_name=["Alice", "Bob", "Charlie"][idx],
            last_name=["Smith", "Jones", "Brown"][idx],
            contact_preference=[
                ContactPreference.call,
                ContactPreference.text,
                ContactPreference.call,
            ][idx],
            phone_number=["1111111111", "2222222222", "3333333333"][idx],
        )
        entity = StudentEntity.from_model(data, acc.id)
        test_async_session.add(entity)
    await test_async_session.commit()

    students = await student_service.get_students(page_number=1, page_size=10)
    assert len(students.items) == 3

    expected = {
        "1111111111": "Alice Smith",
        "2222222222": "Bob Jones",
        "3333333333": "Charlie Brown",
    }
    phones = {s.phone_number for s in students.items}
    assert phones == set(expected.keys())

    for s in students.items:
        assert s.phone_number in expected
        assert f"{s.first_name} {s.last_name}" == expected[s.phone_number]
        assert isinstance(s.id, int)


@pytest.mark.asyncio
async def test_get_student_by_id(
    student_service: StudentService, student_entity: StudentEntity
):
    fetched = await student_service.get_student_by_id(student_entity.account_id)
    assert fetched.id == student_entity.account_id
    assert fetched.phone_number == "9999999999"
    assert f"{fetched.first_name} {fetched.last_name}" == "Test User"


@pytest.mark.asyncio
async def test_get_student_by_id_not_found(student_service: StudentService):
    with pytest.raises(StudentNotFoundException):
        await student_service.get_student_by_id(999)


@pytest.mark.asyncio
async def test_update_student(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="1234567890",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)

    update_data = StudentData(
        first_name="Jane",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="0987654321",
    )
    updated = await student_service.update_student(entity.account_id, update_data)
    assert entity.account_id == updated.id
    assert updated.first_name == "Jane"
    assert updated.phone_number == "0987654321"


@pytest.mark.asyncio
async def test_update_student_not_found(student_service: StudentService):
    update_data = StudentData(
        first_name="Jane",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="0987654321",
    )
    with pytest.raises(StudentNotFoundException):
        await student_service.update_student(999, update_data)


@pytest.mark.asyncio
async def test_update_student_conflict(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data1 = StudentData(
        first_name="Alice",
        last_name="Smith",
        contact_preference=ContactPreference.call,
        phone_number="1111111111",
    )
    data2 = StudentData(
        first_name="Bob",
        last_name="Jones",
        contact_preference=ContactPreference.text,
        phone_number="2222222222",
    )
    account2 = AccountEntity(
        email="second@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=test_account.role,
    )
    test_async_session.add(account2)
    await test_async_session.commit()
    await test_async_session.refresh(account2)

    entity1 = StudentEntity.from_model(data1, test_account.id)
    entity2 = StudentEntity.from_model(data2, account2.id)
    test_async_session.add(entity1)
    test_async_session.add(entity2)
    await test_async_session.commit()
    await test_async_session.refresh(entity1)
    await test_async_session.refresh(entity2)

    with pytest.raises(StudentConflictException):
        await student_service.update_student(
            entity2.account_id,
            StudentData(
                first_name="Bob",
                last_name="Jones",
                contact_preference=ContactPreference.text,
                phone_number=entity1.phone_number,
            ),
        )


@pytest.mark.asyncio
async def test_delete_student(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="1234567890",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)

    deleted = await student_service.delete_student(entity.account_id)
    assert deleted.phone_number == entity.phone_number
    with pytest.raises(StudentNotFoundException):
        await student_service.get_student_by_id(entity.account_id)


@pytest.mark.asyncio
async def test_delete_student_not_found(student_service: StudentService):
    with pytest.raises(StudentNotFoundException):
        await student_service.delete_student(999)


@pytest.mark.asyncio
async def test_create_student_with_datetime_timezone(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    last_reg = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
    data = StudentData(
        first_name="Jane",
        last_name="Smith",
        contact_preference=ContactPreference.call,
        phone_number="5551234567",
        last_registered=last_reg,
    )
    student = await student_service.create_student(data, account_id=test_account.id)
    assert student.last_registered == last_reg


@pytest.mark.asyncio
async def test_update_student_with_datetime_timezone(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="5559876543",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)

    last_reg = datetime(2024, 3, 20, 14, 45, 30, tzinfo=timezone.utc)
    update_data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="5559876543",
        last_registered=last_reg,
    )
    updated = await student_service.update_student(entity.account_id, update_data)
    assert updated.last_registered == last_reg


@pytest.mark.asyncio
async def test_create_student_with_nonexistent_account(
    student_service: StudentService,
):
    data = StudentData(
        first_name="Test",
        last_name="User",
        contact_preference=ContactPreference.text,
        phone_number="5551112222",
    )
    with pytest.raises(AccountNotFoundException):
        await student_service.create_student(data, account_id=99999)


@pytest.mark.asyncio
async def test_create_student_with_non_student_role(
    student_service: StudentService,
    test_async_session: AsyncSession,
):
    admin_account = AccountEntity(
        email="admin@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.ADMIN,
    )
    test_async_session.add(admin_account)
    await test_async_session.commit()
    await test_async_session.refresh(admin_account)

    data = StudentData(
        first_name="Test",
        last_name="User",
        contact_preference=ContactPreference.text,
        phone_number="5553334444",
    )
    with pytest.raises(InvalidAccountRoleException):
        await student_service.create_student(data, account_id=admin_account.id)


@pytest.mark.asyncio
async def test_create_student_duplicate_account_id(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data1 = StudentData(
        first_name="First",
        last_name="Student",
        contact_preference=ContactPreference.text,
        phone_number="5555555555",
    )
    await student_service.create_student(data1, account_id=test_account.id)

    data2 = StudentData(
        first_name="Second",
        last_name="Student",
        contact_preference=ContactPreference.call,
        phone_number="5556666666",
    )
    with pytest.raises(StudentAlreadyExistsException):
        await student_service.create_student(data2, account_id=test_account.id)


@pytest.mark.asyncio
async def test_update_student_with_non_student_role(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    data = StudentData(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.text,
        phone_number="5557778888",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()

    test_account.role = AccountRole.ADMIN
    test_async_session.add(test_account)
    await test_async_session.commit()

    update_data = StudentData(
        first_name="Jane",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="5557778888",
    )
    with pytest.raises(InvalidAccountRoleException):
        await student_service.update_student(test_account.id, update_data)
