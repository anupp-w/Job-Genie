from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import json

from database import get_db
from auth import get_current_user
from models import Resume, Job, ResumeJobScore
from schemas import AnalyzeRequest, ScoreResponse, SubScore

from app.services.scoring import (
    compute_ats_score,
    compute_writing_score,
    compute_impact_score,
    compute_job_match_score,
    compute_experience_score,
    compute_final_score,
    get_label
)

router = APIRouter()

@router.post("/analyze", response_model=ScoreResponse)
async def analyze_resume(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    text = body.resume_text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty")
        
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            text = " ".join(str(v) for v in data.values())
    except:
        pass

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty after extraction")

    ats_score, ats_exp = compute_ats_score(text)
    writing_score, write_exp = compute_writing_score(text)
    impact_score, impact_exp = compute_impact_score(text)
    
    scores_dict = {
        "ats": ats_score,
        "writing": writing_score,
        "impact": impact_score
    }
    
    response_scores = {
        "ats": SubScore(score=ats_score, weight=0.40, label=get_label(ats_score), explanation=ats_exp),
        "writing": SubScore(score=writing_score, weight=0.35, label=get_label(writing_score), explanation=write_exp),
        "impact": SubScore(score=impact_score, weight=0.25, label=get_label(impact_score), explanation=impact_exp)
    }

    mode = "basic"
    jd_text = body.job_description
    
    if jd_text:
        match_score, missing_kws, match_exp = compute_job_match_score(text, jd_text)
        exp_score, exp_exp = compute_experience_score(text, jd_text)
        
        # Keep job match isolated from the core score weights!
        response_scores["job_match"] = SubScore(
            score=match_score, weight=0.0, label=get_label(match_score), explanation=match_exp
        )
        mode = "full"

    final, verdict = compute_final_score(scores_dict, has_jd=False)
    
    resume_id = body.resume_id
    if resume_id:
        resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
        if resume:
            resume.ats_score = ats_score
            resume.writing_score = writing_score
            resume.impact_score = impact_score
            resume.final_score = final
            db.commit()

    return ScoreResponse(
        resume_id=resume_id,
        final_score=final,
        verdict=verdict,
        mode=mode,
        scores=response_scores
    )
