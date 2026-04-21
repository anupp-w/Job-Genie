from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app import schemas, models
from app.api import deps
from app.services.tailor_service import tailor_resume

router = APIRouter()

@router.post("", response_model=schemas.TailorResponse)
async def tailor_resume_endpoint(
    request: schemas.TailorRequest,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Tailor a resume based on a job description using a multi-agent LangGraph squad.
    """
    try:
        resume_data = request.resume_data
        
        # If resume_id is provided, fetch it (this is the legacy path)
        if request.resume_id:
            from app.crud.crud_resume import get_resume
            resume = get_resume(db, resume_id=request.resume_id, user_id=current_user.id)
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")
            
            if not resume_data:
                # Find the structured_data section
                for section in resume.sections:
                    if section.section_type == "structured_data":
                        import json
                        resume_data = json.loads(section.content)
                        break

        if not resume_data:
            raise HTTPException(status_code=400, detail="No resume data provided")

        # Run the advanced tailoring squad
        result = await tailor_resume(
            resume_dict=resume_data,
            jd_text=request.job_description or ""
        )

        # Service already returns the current response contract.
        if "tailored_data" in result and "match_score" in result:
            return result

        # Backward-compat path for any older service payload shape.
        if "tailored_resume" in result and "final_score" in result:
            final_score = result.get("final_score", {})
            baseline_score = result.get("baseline_score", {})
            comparison = result.get("comparison", {})
            return {
                "tailored_data": result.get("tailored_resume", {}),
                "match_score": final_score.get("total", 0.0),
                "original_match_score": baseline_score.get("total", 0.0),
                "explanation": f"Agents found {len(comparison.get('added_keywords', []))} new relevant keyword matches.",
                "changes": comparison.get("added_keywords", []),
                "missing_skills": comparison.get("still_missing_keywords", []),
                "matched_skills": final_score.get("matched_keywords", []),
                "iterations_run": result.get("iterations_run", 0),
                "stop_reason": result.get("stop_reason", ""),
                "comparison": comparison,
                "section_scores": final_score.get("sections", None),
            }

        raise ValueError("Tailor service returned unexpected payload format")
        
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"AI Tailoring squad failed: {str(e)}"
        )
