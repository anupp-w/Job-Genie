from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app import schemas, models
from app.api import deps
from app.services.tailor_service import tailor_resume_to_jd

router = APIRouter()

@router.post("", response_model=schemas.TailorResponse)
async def tailor_resume(
    request: schemas.TailorRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Tailor a resume based on a job description using AI agents.
    """
    try:
        # If resume_id is provided, fetch it first
        resume_data = request.resume_data
        if request.resume_id:
            from app.crud.crud_resume import get_resume
            resume = get_resume(db, resume_id=request.resume_id, user_id=current_user.id)
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")
            
            # Convert DB model sections to structured JSON if resume_data is not provided
            if not resume_data:
                # Basic mapping (simplified for now)
                resume_data = {
                    "personal": {"name": current_user.full_name, "email": current_user.email},
                    "summary": "",
                    "experience": [],
                    "education": [],
                    "projects": [],
                    "skills": {"technical": "", "soft": ""},
                    "certifications": []
                }
                for section in resume.sections:
                    # In a real app, this would be more detailed parsing
                    if section.section_type == "experience":
                        resume_data["experience"].append({"role": "Parsed Role", "company": "Parsed Co", "description": section.content})
                    # Add other sections accordingly...

        if not resume_data:
            raise HTTPException(status_code=400, detail="No resume data provided")

        if not request.job_description and not request.job_url:
            raise HTTPException(status_code=400, detail="Provide either job description or job URL")

        # Call the CrewAI service
        result = await tailor_resume_to_jd(
            resume_data=resume_data,
            job_description=request.job_description,
            job_url=request.job_url
        )
        
        return result
    except Exception as e:
        print(f"Tailoring error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"AI Tailoring failed: {str(e)}"
        )
