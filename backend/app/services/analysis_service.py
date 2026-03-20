from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from typing import List, Dict, Any

def get_skill_gap(db: Session, resume_id: int, job_id: int) -> Dict[str, Any]:
    """
    Identifies matching skills and missing skills (gaps) between a resume and a job.
    """
    # Fetch Resume Skills
    resume_skills = db.query(models.Skill).join(models.ResumeSkill).filter(models.ResumeSkill.resume_id == resume_id).all()
    resume_skill_ids = {s.id for s in resume_skills}
    resume_skill_names = {s.name for s in resume_skills}

    # Fetch Job Skills
    job_skills_assoc = db.query(models.JobSkill).filter(models.JobSkill.job_id == job_id).all()
    job_skill_ids = {js.skill_id for js in job_skills_assoc}
    
    # Identify Matches and Gaps
    matches = []
    gaps = []
    
    for js in job_skills_assoc:
        skill = db.query(models.Skill).filter(models.Skill.id == js.skill_id).first()
        if skill.id in resume_skill_ids:
            matches.append({
                "id": skill.id,
                "name": skill.name,
                "importance": js.importance_weight
            })
        else:
            gaps.append({
                "id": skill.id,
                "name": skill.name,
                "importance": js.importance_weight
            })

    match_percentage = (len(matches) / (len(matches) + len(gaps)) * 100) if (len(matches) + len(gaps)) > 0 else 0

    return {
        "resume_id": resume_id,
        "job_id": job_id,
        "match_percentage": round(match_percentage, 2),
        "matches": matches,
        "gaps": gaps
    }

def generate_roadmap(db: Session, gap_skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates a sequenced learning roadmap based on missing skills.
    """
    roadmap = []
    
    for skill_info in gap_skills:
        skill_id = skill_info["id"]
        skill_name = skill_info["name"]
        
        # Find courses for this skill
        courses = db.query(models.Course).join(models.CourseSkill).filter(models.CourseSkill.skill_id == skill_id).order_by(
            # Order by level (Beginner 1, Intermediate 2, Advanced 3)
            func.case(
                (models.Course.level == 'Beginner', 1),
                (models.Course.level == 'Intermediate', 2),
                (models.Course.level == 'Advanced', 3),
                else_=4
            ).asc(),
            models.Course.rating.desc()
        ).limit(3).all() # Top 3 courses per skill
        
        if courses:
            roadmap.append({
                "skill_id": skill_id,
                "skill_name": skill_name,
                "courses": [
                    {
                        "id": c.id,
                        "title": c.title,
                        "platform": c.platform,
                        "url": c.url,
                        "level": c.level,
                        "rating": c.rating,
                        "duration": c.duration,
                        "institution": c.institution
                    } for c in courses
                ]
            })
            
    return roadmap
