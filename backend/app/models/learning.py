from sqlalchemy import Column, Integer, String, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)

    job_skills = relationship("JobSkill", back_populates="skill")
    resume_skills = relationship("ResumeSkill", back_populates="skill")
    course_skills = relationship("CourseSkill", back_populates="skill")

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

class CourseSkill(Base):
    __tablename__ = "course_skills"
    
    course_id = Column(Integer, ForeignKey("courses.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)

    course = relationship("Course", back_populates="course_skills")
    skill = relationship("Skill", back_populates="course_skills")
