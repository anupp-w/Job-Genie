
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
