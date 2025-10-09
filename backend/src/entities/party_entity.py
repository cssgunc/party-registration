from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Party(Base):
    __tablename__ = 'parties'
    
    id = Column(Integer, primary_key=True, index=True)
    party_datetime = Column(DateTime, nullable=False)
    
    address_id = Column(Integer, ForeignKey('addresses.id'), nullable=False)
    contact_one_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    contact_two_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    
    address = relationship("Address", back_populates="parties")
    contact_one = relationship("Student", foreign_keys=[contact_one_id], back_populates="parties_as_contact_one")
    contact_two = relationship("Student", foreign_keys=[contact_two_id], back_populates="parties_as_contact_two")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)