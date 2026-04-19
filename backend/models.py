
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Float, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    profile_pic_url = Column(String, nullable=True)
    role = Column(String, default="user")
    reset_code = Column(String, nullable=True)
    reset_code_expire = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="My Resume")
    file_path = Column(String, nullable=True)
    parsed_content = Column(Text, nullable=True)
    ats_score = Column(Integer, default=0)
    writing_score = Column(Integer, default=0)
    impact_score = Column(Integer, default=0)
    final_score = Column(Integer, default=0)
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

class ResumeJobScore(Base):
    __tablename__ = "resume_job_scores"
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    match_score = Column(Integer)
    missing_keywords = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('resume_id', 'job_id', name='uq_resume_job'),
    )
    resume = relationship("Resume", back_populates="job_scores")
    job = relationship("Job", back_populates="resume_scores")

class JobSkill(Base):
    __tablename__ = "job_skills"
    job_id = Column(Integer, ForeignKey("jobs.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    importance_weight = Column(Integer, default=1)
    job = relationship("Job", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_skills")

class ResumeSkill(Base):
    __tablename__ = "resume_skills"
    resume_id = Column(Integer, ForeignKey("resumes.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    resume = relationship("Resume", back_populates="skills")
    skill = relationship("Skill", back_populates="resume_skills")

class CourseSkill(Base):
    __tablename__ = "course_skills"
    course_id = Column(Integer, ForeignKey("courses.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    course = relationship("Course", back_populates="course_skills")
    skill = relationship("Skill", back_populates="course_skills")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)
    job_skills = relationship("JobSkill", back_populates="skill")
    resume_skills = relationship("ResumeSkill", back_populates="skill")
    course_skills = relationship("CourseSkill", back_populates="skill")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    platform = Column(String)
    url = Column(String)
    thumbnail_url = Column(String)
    rating = Column(Float)
    level = Column(String)
    duration = Column(String)
    institution = Column(String)
    description = Column(Text)
    category = Column(String)
    course_skills = relationship("CourseSkill", back_populates="course", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"
    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    category = Column(String)
    difficulty_level = Column(String)
    associated_skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True)
    ideal_answer_points = Column(Text)

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
