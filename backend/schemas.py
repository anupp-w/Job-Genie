
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    profile_pic_url: Optional[str] = None
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class TailorRequest(BaseModel):
    resume_data: dict
    job_description: Optional[str] = None
    job_url: Optional[str] = None
    resume_id: Optional[int] = None

class SkillItem(BaseModel):
    id: int
    name: str
    importance: int

class SkillGapResponse(BaseModel):
    resume_id: int
    job_id: int
    match_percentage: float
    matches: List[SkillItem]
    gaps: List[SkillItem]

class CourseItem(BaseModel):
    id: int
    title: str
    platform: str
    url: str
    level: str
    rating: float
    duration: str
    institution: str

class RoadmapItem(BaseModel):
    skill_id: int
    skill_name: str
    courses: List[CourseItem]

class RoadmapResponse(BaseModel):
    resume_id: int
    job_id: int
    roadmap: List[RoadmapItem]

# --- Interview Engine Schemas ---
from datetime import datetime

class InterviewSessionCreate(BaseModel):
    job_title: str
    job_description: str

class InterviewQuestionBase(BaseModel):
    id: int
    round: int
    question_number: int
    question_type: str
    question_text: str

    class Config:
        from_attributes = True

class InterviewSessionResponse(BaseModel):
    id: int
    job_title: str
    status: str
    round: int
    created_at: datetime
    questions: Optional[List[InterviewQuestionBase]] = []

    class Config:
        from_attributes = True

class InterviewAnswerCreate(BaseModel):
    user_answer: str

class InterviewAnswerResponse(BaseModel):
    id: int
    question_id: int
    user_answer: str
    ideal_answer: Optional[str] = None
    llm_feedback: Optional[str] = None
    final_score: Optional[float] = None
    score_breakdown: Optional[dict] = None

    class Config:
        from_attributes = True
