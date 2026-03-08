from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    category = Column(String)
    difficulty_level = Column(String)
    associated_skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True)
    ideal_answer_points = Column(Text)

    skill = relationship("Skill", back_populates="questions")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    score = Column(Integer, nullable=True)
    conducted_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interview_sessions")
    responses = relationship("InterviewResponse", back_populates="session", cascade="all, delete-orphan")

class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    question_id = Column(Integer, ForeignKey("interview_questions.id"))
    user_answer = Column(Text)
    ai_feedback = Column(Text)
    score = Column(Integer)

    session = relationship("InterviewSession", back_populates="responses")
    question = relationship("InterviewQuestion")
