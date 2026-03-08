from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.api import deps

router = APIRouter()


@router.post("", response_model=schemas.ResumeResponse, status_code=status.HTTP_201_CREATED)
def create_resume(
    resume_in: schemas.ResumeCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    return crud.crud_resume.create_resume(db=db, user_id=current_user.id, resume_in=resume_in)


@router.get("", response_model=List[schemas.ResumeResponse])
def list_resumes(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    return crud.crud_resume.list_resumes(db=db, user_id=current_user.id)


@router.get("/{resume_id}", response_model=schemas.ResumeResponse)
def get_resume(
    resume_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    resume = crud.crud_resume.get_resume(db=db, resume_id=resume_id, user_id=current_user.id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume
