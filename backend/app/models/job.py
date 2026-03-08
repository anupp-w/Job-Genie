from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    company = Column(String)
    description = Column(Text)
    url = Column(String)
    source = Column(String, default="manual")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resume_scores = relationship("ResumeJobScore", back_populates="job")
    job_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
