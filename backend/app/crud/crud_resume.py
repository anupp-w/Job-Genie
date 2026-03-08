from typing import List, Optional
from sqlalchemy.orm import Session
from app import models, schemas


def create_resume(db: Session, user_id: int, resume_in: schemas.ResumeCreate) -> models.Resume:
    resume = models.Resume(
        user_id=user_id,
        title=resume_in.title or "My Resume",
        file_path=resume_in.file_path,
        parsed_content=resume_in.parsed_content,
        ats_score=resume_in.ats_score or 0,
    )
    db.add(resume)
    db.flush()

    for section in resume_in.sections or []:
        db.add(
            models.ResumeSection(
                resume_id=resume.id,
                section_type=section.section_type,
                content=section.content,
                order=section.order or 0,
            )
        )

    db.commit()
    db.refresh(resume)
    return resume


def get_resume(db: Session, resume_id: int, user_id: int) -> Optional[models.Resume]:
    return (
        db.query(models.Resume)
        .filter(models.Resume.id == resume_id, models.Resume.user_id == user_id)
        .first()
    )


def list_resumes(db: Session, user_id: int) -> List[models.Resume]:
    return db.query(models.Resume).filter(models.Resume.user_id == user_id).order_by(models.Resume.created_at.desc()).all()
