from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import json

from app.database import get_db
from app.auth import get_current_user
from app.models import Resume, Job, ResumeJobScore
from app.schemas import ScoreRequest, ScoreResponse, SubScore

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

@router.post("/{resume_id}/score", response_model=ScoreResponse)
async def score_resume(
    resume_id: int,
    body: ScoreRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    text = resume.parsed_content
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty")
        
    # Optional: if text is a JSON dump, try to get raw text or flatten
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            text = data.get("_raw_text", text)
            if text == resume.parsed_content:
                text = " ".join(str(v) for v in data.values())
    except:
        pass

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty after JSON extraction")

    # Run base scores
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
    job_id = body.job_id
    jd_text = ""
    
    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job and job.description:
            jd_text = job.description
            
            match_score, missing_kws, match_exp = compute_job_match_score(text, jd_text)
            exp_score, exp_exp = compute_experience_score(text, jd_text)
            
            scores_dict["job_match"] = match_score
            scores_dict["experience"] = exp_score
            
            response_scores["writing"].weight = 0.20
            response_scores["impact"].weight = 0.15
            
            response_scores["job_match"] = SubScore(
                score=match_score, weight=0.15, label=get_label(match_score), explanation=match_exp
            )
            
            if exp_score is not None:
                response_scores["experience"] = SubScore(
                    score=exp_score, weight=0.10, label=get_label(exp_score), explanation=exp_exp
                )
            else:
                response_scores["job_match"].weight = 0.25
                
            mode = "full"
            
            # Upsert into resume_job_scores
            stmt = insert(ResumeJobScore).values(
                resume_id=resume.id,
                job_id=job.id,
                match_score=match_score,
                missing_keywords=missing_kws
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=['resume_id', 'job_id'],
                set_={
                    'match_score': stmt.excluded.match_score,
                    'missing_keywords': stmt.excluded.missing_keywords
                }
            )
            db.execute(stmt)

    final, verdict = compute_final_score(scores_dict, has_jd=bool(job_id))
    
    resume.ats_score = ats_score
    resume.writing_score = writing_score
    resume.impact_score = impact_score
    resume.final_score = final
    
    db.commit()

    return ScoreResponse(
        resume_id=resume.id,
        final_score=final,
        verdict=verdict,
        mode=mode,
        scores=response_scores
    )
