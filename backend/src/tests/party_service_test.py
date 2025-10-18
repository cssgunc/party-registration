import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..services.party_service import PartyService
from ..entities.party_entity import Party
from ..models.party_model import PartyCreate, PartyUpdate

class TestPartyService:
    
    @pytest.fixture
    def mock_db(self):
        return Mock(spec=Session)
    
    @pytest.fixture
    def party_service(self, mock_db):
        return PartyService(mock_db)
    
    @pytest.fixture
    def sample_party_data(self):
        return PartyCreate(
            party_datetime=datetime.now() + timedelta(days=1),
            address_id=1,
            contact_one_id=1,
            contact_two_id=2
        )
    
    @pytest.fixture
    def sample_party_entity(self):
        return Party(
            id=1,
            party_datetime=datetime.now() + timedelta(days=1),
            address_id=1,
            contact_one_id=1,
            contact_two_id=2,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

    def test_create_party_success(self, party_service, mock_db, sample_party_data, sample_party_entity):
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        with patch.object(Party, '__new__', return_value=sample_party_entity):
            result = party_service.create_party(sample_party_data)
        
        assert result == sample_party_entity
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    def test_create_party_integrity_error(self, party_service, mock_db, sample_party_data):
        mock_db.add.side_effect = IntegrityError("error", "error", "error")
        
        with pytest.raises(ValueError, match="Failed to create party"):
            party_service.create_party(sample_party_data)
        
        mock_db.rollback.assert_called_once()

    def test_get_party_by_id_success(self, party_service, mock_db, sample_party_entity):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        
        result = party_service.get_party_by_id(1)
        
        assert result == sample_party_entity
        mock_db.query.assert_called_with(Party)

    def test_get_party_by_id_not_found(self, party_service, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = party_service.get_party_by_id(999)
        
        assert result is None

    def test_get_all_parties(self, party_service, mock_db, sample_party_entity):
        expected_parties = [sample_party_entity]
        mock_db.query.return_value.offset.return_value.limit.return_value.all.return_value = expected_parties
        
        result = party_service.get_all_parties(skip=0, limit=100)
        
        assert result == expected_parties
        mock_db.query.assert_called_with(Party)

    def test_get_parties_by_address(self, party_service, mock_db, sample_party_entity):
        expected_parties = [sample_party_entity]
        mock_db.query.return_value.filter.return_value.all.return_value = expected_parties
        
        result = party_service.get_parties_by_address(1)
        
        assert result == expected_parties

    def test_get_parties_by_contact(self, party_service, mock_db, sample_party_entity):
        expected_parties = [sample_party_entity]
        mock_db.query.return_value.filter.return_value.all.return_value = expected_parties
        
        result = party_service.get_parties_by_contact(1)
        
        assert result == expected_parties

    def test_get_parties_by_date_range(self, party_service, mock_db, sample_party_entity):
        start_date = datetime.now()
        end_date = datetime.now() + timedelta(days=7)
        expected_parties = [sample_party_entity]
        mock_db.query.return_value.filter.return_value.all.return_value = expected_parties
        
        result = party_service.get_parties_by_date_range(start_date, end_date)
        
        assert result == expected_parties

    def test_update_party_success(self, party_service, mock_db, sample_party_entity):
        update_data = PartyUpdate(address_id=2)
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        result = party_service.update_party(1, update_data)
        
        assert result == sample_party_entity
        assert sample_party_entity.address_id == 2
        mock_db.commit.assert_called_once()

    def test_update_party_not_found(self, party_service, mock_db):
        update_data = PartyUpdate(address_id=2)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = party_service.update_party(999, update_data)
        
        assert result is None

    def test_update_party_integrity_error(self, party_service, mock_db, sample_party_entity):
        update_data = PartyUpdate(address_id=2)
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        mock_db.commit.side_effect = IntegrityError("error", "error", "error")
        
        with pytest.raises(ValueError, match="Failed to update party"):
            party_service.update_party(1, update_data)
        
        mock_db.rollback.assert_called_once()

    def test_delete_party_success(self, party_service, mock_db, sample_party_entity):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        mock_db.delete.return_value = None
        mock_db.commit.return_value = None
        
        result = party_service.delete_party(1)
        
        assert result is True
        mock_db.delete.assert_called_once_with(sample_party_entity)
        mock_db.commit.assert_called_once()

    def test_delete_party_not_found(self, party_service, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = party_service.delete_party(999)
        
        assert result is False

    def test_delete_party_exception(self, party_service, mock_db, sample_party_entity):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        mock_db.delete.side_effect = Exception("Database error")
        
        with pytest.raises(ValueError, match="Failed to delete party"):
            party_service.delete_party(1)
        
        mock_db.rollback.assert_called_once()

    def test_party_exists_true(self, party_service, mock_db, sample_party_entity):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_party_entity
        
        result = party_service.party_exists(1)
        
        assert result is True

    def test_party_exists_false(self, party_service, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = party_service.party_exists(999)
        
        assert result is False

    def test_get_party_count(self, party_service, mock_db):
        mock_db.query.return_value.count.return_value = 5
        
        result = party_service.get_party_count()
        
        assert result == 5

    def test_get_parties_by_student_and_date(self, party_service, mock_db, sample_party_entity):
        target_date = datetime.now()
        expected_parties = [sample_party_entity]
        mock_db.query.return_value.filter.return_value.all.return_value = expected_parties
        
        result = party_service.get_parties_by_student_and_date(1, target_date)
        
        assert result == expected_parties