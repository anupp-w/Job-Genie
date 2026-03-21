from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class InterviewSession(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_title = Column(String, nullable=False)
    job_description = Column(Text, nullable=False)
    status = Column(String, default="in_progress")
    round = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="interview_sessions")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    round = Column(Integer, nullable=False)
    question_number = Column(Integer, nullable=False)
    question_type = Column(String)
    question_text = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("InterviewSession", back_populates="questions")
    answers = relationship("InterviewAnswer", back_populates="question", cascade="all, delete-orphan")

class InterviewAnswer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    user_answer = Column(Text, nullable=True)
    ideal_answer = Column(Text)
    llm_feedback = Column(Text)
    final_score = Column(Numeric(4, 1))
    score_breakdown = Column(JSON)
    
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("InterviewQuestion", back_populates="answers")
