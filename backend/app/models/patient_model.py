from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, nullable=True)
    patient_email = Column(String, nullable=True)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    symptoms = Column(Text, nullable=False)
    medical_history = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    confidence_score = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="patients")

# Add relationship to User model
from .user_model import User
User.patients = relationship("Patient", back_populates="user")