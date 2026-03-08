from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="My Resume")
    file_path = Column(String, nullable=True)
    parsed_content = Column(Text, nullable=True)
    ats_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="resumes")
    sections = relationship("ResumeSection", back_populates="resume", cascade="all, delete-orphan")
    job_scores = relationship("ResumeJobScore", back_populates="resume", cascade="all, delete-orphan")
    skills = relationship("ResumeSkill", back_populates="resume", cascade="all, delete-orphan")

class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    section_type = Column(String)
    content = Column(Text)
    order = Column(Integer, default=0)

    resume = relationship("Resume", back_populates="sections")

class ResumeJobScore(Base):
    __tablename__ = "resume_job_scores"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    match_score = Column(Integer)
    missing_keywords = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resume = relationship("Resume", back_populates="job_scores")
    job = relationship("Job", back_populates="resume_scores")

class SmartSentence(Base):
    __tablename__ = "smart_sentences"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"))
    weak_phrase = Column(String)
    strong_phrase = Column(String)
    
    skill = relationship("Skill", back_populates="smart_sentences")
