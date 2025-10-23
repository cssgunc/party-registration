from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime

from ..entities.party_entity import Party
from ..models.party_model import PartyCreate, PartyUpdate

class PartyService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_party(self, party_data: PartyCreate) -> Party:
        try:
            db_party = Party(
                party_datetime=party_data.party_datetime,
                address_id=party_data.address_id,
                contact_one_id=party_data.contact_one_id,
                contact_two_id=party_data.contact_two_id
            )
            self.db.add(db_party)
            self.db.commit()
            self.db.refresh(db_party)
            return db_party
        except IntegrityError as e:
            self.db.rollback()
            raise ValueError(f"Failed to create party: {str(e)}")
    
    def get_party_by_id(self, party_id: int) -> Optional[Party]:
        return self.db.query(Party).filter(Party.id == party_id).first()
    
    def get_all_parties(self, skip: int = 0, limit: int = 100) -> List[Party]:
        return self.db.query(Party).offset(skip).limit(limit).all()
    
    def get_parties_by_address(self, address_id: int) -> List[Party]:
        return self.db.query(Party).filter(Party.address_id == address_id).all()
    
    def get_parties_by_contact(self, student_id: int) -> List[Party]:
        return self.db.query(Party).filter(
            (Party.contact_one_id == student_id) | 
            (Party.contact_two_id == student_id)
        ).all()
    
    def get_parties_by_date_range(self, start_date: datetime, end_date: datetime) -> List[Party]:
        return self.db.query(Party).filter(
            Party.party_datetime >= start_date,
            Party.party_datetime <= end_date
        ).all()
    
    def update_party(self, party_id: int, party_data: PartyUpdate) -> Optional[Party]:
        db_party = self.get_party_by_id(party_id)
        if not db_party:
            return None
        
        try:
            update_data = party_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_party, field, value)
            
            db_party.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_party)
            return db_party
        except IntegrityError as e:
            self.db.rollback()
            raise ValueError(f"Failed to update party: {str(e)}")
    
    def delete_party(self, party_id: int) -> bool:
        db_party = self.get_party_by_id(party_id)
        if not db_party:
            return False
        
        try:
            self.db.delete(db_party)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ValueError(f"Failed to delete party: {str(e)}")
    
    def party_exists(self, party_id: int) -> bool:
        return self.db.query(Party).filter(Party.id == party_id).first() is not None
    
    def get_party_count(self) -> int:
        return self.db.query(Party).count()
    
    def get_parties_by_student_and_date(self, student_id: int, target_date: datetime) -> List[Party]:
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return self.db.query(Party).filter(
            ((Party.contact_one_id == student_id) | (Party.contact_two_id == student_id)),
            Party.party_datetime >= start_of_day,
            Party.party_datetime <= end_of_day
        ).all()