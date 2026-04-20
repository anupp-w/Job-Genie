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
            # Extract meaningful resume text preserving bullet-point structure
            parts = []
            if data.get("summary"):
                parts.append(data["summary"])
            if data.get("objective"):
                parts.append(data["objective"])
            # Experience bullets
            for exp in data.get("experience", []):
                if exp.get("role"):
                    parts.append(exp["role"])
                if exp.get("description"):
                    for line in exp["description"].split("\n"):
                        line = line.strip()
                        if line:
                            # Ensure each bullet starts with a marker for the writing scorer
                            if not line.startswith(("•", "-", "*")):
                                line = "• " + line
                            parts.append(line)
            # Project bullets
            for proj in data.get("projects", []):
                if proj.get("name"):
                    parts.append(proj["name"])
                if proj.get("tech"):
                    parts.append(proj["tech"])
                if proj.get("description"):
                    for line in proj["description"].split("\n"):
                        line = line.strip()
                        if line:
                            if not line.startswith(("•", "-", "*")):
                                line = "• " + line
                            parts.append(line)
            # Education
            for edu in data.get("education", []):
                if edu.get("degree"):
                    parts.append(edu["degree"])
                if edu.get("school"):
                    parts.append(edu["school"])
            # Skills
            for cat in data.get("skills", []):
                if cat.get("skills"):
                    skills = cat["skills"] if isinstance(cat["skills"], list) else [cat["skills"]]
                    parts.append(", ".join(str(s) for s in skills))
            # Leadership, Research, Awards, etc.
            for section_key in ["leadership", "research"]:
                for item in data.get(section_key, []):
                    if item.get("description"):
                        for line in item["description"].split("\n"):
                            line = line.strip()
                            if line:
                                if not line.startswith(("•", "-", "*")):
                                    line = "• " + line
                                parts.append(line)
            # Certifications
            for cert in data.get("certifications", []):
                if cert.get("name"):
                    parts.append(cert["name"])
            text = "\n".join(parts)
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
        match_score, missing_kws, found_kws, match_exp = compute_job_match_score(text, jd_text)
        exp_score, exp_exp = compute_experience_score(text, jd_text)
        
        # Keep job match isolated from the core score weights!
        response_scores["job_match"] = SubScore(
            score=match_score, weight=0.0, label=get_label(match_score), explanation=match_exp,
            missing_keywords=missing_kws, found_keywords=found_kws
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
