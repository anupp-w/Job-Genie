from typing import List, Optional
from pydantic import BaseModel


class ResumeSectionBase(BaseModel):
    section_type: str
    content: str
    order: int | None = 0


class ResumeSectionCreate(ResumeSectionBase):
    pass


class ResumeSectionResponse(ResumeSectionBase):
    id: int

    class Config:
        from_attributes = True


class ResumeCreate(BaseModel):
    title: Optional[str] = "My Resume"
    file_path: Optional[str] = None
    parsed_content: Optional[str] = None
    ats_score: int | None = 0
    sections: List[ResumeSectionCreate] = []


class ResumeResponse(BaseModel):
    id: int
    title: str
    file_path: Optional[str] = None
    parsed_content: Optional[str] = None
    ats_score: int
    sections: List[ResumeSectionResponse] = []

    class Config:
        from_attributes = True


class TailorRequest(BaseModel):
    resume_id: Optional[int] = None
    resume_data: Optional[dict] = None  # Raw structured JSON
    job_description: Optional[str] = None
    job_url: Optional[str] = None


class TailorResponse(BaseModel):
    tailored_data: dict  # Matches frontend structured format
    match_score: int
    explanation: str
