from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class InterviewSessionCreate(BaseModel):
    job_title: str
    job_description: str

class InterviewQuestionBase(BaseModel):
    id: int
    round: Optional[int] = 1
    question_number: Optional[int] = 1
    question_type: Optional[str] = "behavioral"
    question_text: Optional[str] = ""

    class Config:
        from_attributes = True

class InterviewSessionResponse(BaseModel):
    id: int
    job_title: Optional[str] = "Unknown Role"
    job_description: Optional[str] = ""
    status: Optional[str] = "in_progress"
    round: Optional[int] = 1
    created_at: Optional[datetime] = None
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
