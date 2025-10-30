import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference, StudentData
from src.modules.student.student_service import (
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
        call_or_text_pref=ContactPreference.text,
        phone_number="9999999999",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)
    return entity


@pytest.mark.asyncio
async def test_get_students_empty(student_service: StudentService):
    students = await student_service.get_students()
    assert isinstance(students, list)
    assert len(students) == 0


@pytest.mark.asyncio
async def test_create_student(
    student_service: StudentService, test_account: AccountEntity
) -> None:
    data = StudentData(
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.text,
        phone_number="1234567890",
    )
    student = await student_service.create_student(data, account_id=test_account.id)
    assert student is not None
    assert student.id is not None
    assert student.first_name == "John"
    assert student.last_name == "Doe"
    assert student.full_name == "John Doe"
    assert student.phone_number == "1234567890"


@pytest.mark.asyncio
async def test_create_student_conflict(
    student_service: StudentService, test_account: AccountEntity
) -> None:
    data = StudentData(
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.text,
        phone_number="1234567890",
    )
    await student_service.create_student(data, account_id=test_account.id)
    with pytest.raises(StudentConflictException):
        await student_service.create_student(data, account_id=test_account.id)


@pytest.mark.asyncio
async def test_get_students(
    student_service: StudentService,
    test_async_session: AsyncSession,
    test_account: AccountEntity,
):
    students_data = [
        StudentData(
            first_name="Alice",
            last_name="Smith",
            call_or_text_pref=ContactPreference.call,
            phone_number="1111111111",
        ),
        StudentData(
            first_name="Bob",
            last_name="Jones",
            call_or_text_pref=ContactPreference.text,
            phone_number="2222222222",
        ),
        StudentData(
            first_name="Charlie",
            last_name="Brown",
            call_or_text_pref=ContactPreference.call,
            phone_number="3333333333",
        ),
    ]
    for data in students_data:
        entity = StudentEntity.from_model(data, test_account.id)
        test_async_session.add(entity)
    await test_async_session.commit()

    students = await student_service.get_students()
    assert len(students) == 3

    expected = {
        "1111111111": "Alice Smith",
        "2222222222": "Bob Jones",
        "3333333333": "Charlie Brown",
    }
    phones = {s.phone_number for s in students}
    assert phones == set(expected.keys())

    names = {s.full_name for s in students}
    assert names == set(expected.values())

    for s in students:
        assert s.phone_number in expected
        assert s.full_name == expected[s.phone_number]
        assert isinstance(s.id, int)
        assert getattr(s, "call_or_text_pref", None) in (
            ContactPreference.call,
            ContactPreference.text,
        )


@pytest.mark.asyncio
async def test_get_student_by_id(
    student_service: StudentService, student_entity: StudentEntity
):
    fetched = await student_service.get_student_by_id(student_entity.id)
    assert fetched.id == student_entity.id
    assert fetched.phone_number == "9999999999"
    assert fetched.full_name == "Test User"


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
        call_or_text_pref=ContactPreference.text,
        phone_number="1234567890",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)

    update_data = StudentData(
        first_name="Jane",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="0987654321",
    )
    updated = await student_service.update_student(entity.id, update_data)
    assert entity.id == updated.id
    assert updated.first_name == "Jane"
    assert updated.phone_number == "0987654321"


@pytest.mark.asyncio
async def test_update_student_not_found(student_service: StudentService):
    update_data = StudentData(
        first_name="Jane",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
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
        call_or_text_pref=ContactPreference.call,
        phone_number="1111111111",
    )
    data2 = StudentData(
        first_name="Bob",
        last_name="Jones",
        call_or_text_pref=ContactPreference.text,
        phone_number="2222222222",
    )
    entity1 = StudentEntity.from_model(data1, test_account.id)
    entity2 = StudentEntity.from_model(data2, test_account.id)
    test_async_session.add(entity1)
    test_async_session.add(entity2)
    await test_async_session.commit()
    await test_async_session.refresh(entity1)
    await test_async_session.refresh(entity2)

    with pytest.raises(StudentConflictException):
        await student_service.update_student(
            entity2.id,
            StudentData(
                first_name="Bob",
                last_name="Jones",
                call_or_text_pref=ContactPreference.text,
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
        call_or_text_pref=ContactPreference.text,
        phone_number="1234567890",
    )
    entity = StudentEntity.from_model(data, test_account.id)
    test_async_session.add(entity)
    await test_async_session.commit()
    await test_async_session.refresh(entity)

    deleted = await student_service.delete_student(entity.id)
    assert deleted.phone_number == entity.phone_number
    with pytest.raises(StudentNotFoundException):
        await student_service.get_student_by_id(entity.id)


@pytest.mark.asyncio
async def test_delete_student_not_found(student_service: StudentService):
    with pytest.raises(StudentNotFoundException):
        await student_service.delete_student(999)
