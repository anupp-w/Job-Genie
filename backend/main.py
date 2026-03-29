
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, crud, auth

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Genie API", version="0.1.0", redirect_slashes=False)

# CORS - Allow All for Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/")
def read_root():
    return {"status": "ok", "message": "Job Genie Backend is Running"}

from app.api.v1.endpoints import interviews
app.include_router(interviews.router, prefix="/api/v1/interviews", tags=["interviews"])

@app.post("/api/v1/users/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/v1/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    import traceback, logging
    logger = logging.getLogger("jobgenie.auth")

    # 1. Look up user — catch DB errors
    try:
        user = crud.get_user_by_email(db, email=form_data.username)
    except Exception as e:
        logger.error(f"Database error during login lookup: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is temporarily unavailable. Please try again.",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify password — catch bcrypt / passlib errors
    try:
        password_valid = crud.verify_password(form_data.password, user.password_hash)
    except Exception as e:
        logger.error(f"Password verification error for {form_data.username}: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password verification failed due to a server error.",
        )

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Create JWT — catch encoding errors
    try:
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
    except Exception as e:
        logger.error(f"Token creation error for {form_data.username}: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create authentication token.",
        )

    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- Admin-only dependency ---
def get_current_admin(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

from typing import Optional, List
from pydantic import BaseModel

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    profile_pic_url: Optional[str] = None

@app.get("/api/v1/users", response_model=List[schemas.UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100,
):
    """List all users. Admin only."""
    return db.query(models.User).offset(skip).limit(limit).all()

@app.patch("/api/v1/users/{user_id}", response_model=schemas.UserResponse)
def admin_update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """Update a user's role or profile. Admin only."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.profile_pic_url is not None:
        user.profile_pic_url = payload.profile_pic_url
    db.commit()
    db.refresh(user)
    return user

@app.delete("/api/v1/users/{user_id}", response_model=schemas.UserResponse)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """Delete a user. Admin only."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return user

@app.get("/api/v1/health")
def health_check():
    from database import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
    finally:
        db.close()

@app.post("/api/v1/tailor")
async def tailor_resume(request: schemas.TailorRequest):
    from app.services.tailor_service import tailor_resume_to_jd
    try:
        result = await tailor_resume_to_jd(request.resume_data, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File, Form
@app.post("/api/v1/parse")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    from app.services.parsing_service import parse_resume_upload
    try:
        data = await parse_resume_upload(file)
        return {"parsed_data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.get("/api/v1/analysis/skill-gap/{resume_id}/{job_id}", response_model=schemas.SkillGapResponse)
def get_skill_gap_endpoint(resume_id: int, job_id: int, db: Session = Depends(get_db)):
    from app.services.analysis_service import get_skill_gap
    return get_skill_gap(db, resume_id, job_id)

@app.get("/api/v1/analysis/roadmap/{resume_id}/{job_id}")
def get_roadmap_endpoint(resume_id: int, job_id: int, db: Session = Depends(get_db)):
    from app.services.analysis_service import get_skill_gap, generate_roadmap
    import traceback
    try:
        gap_data = get_skill_gap(db, resume_id, job_id)
        roadmap = generate_roadmap(db, gap_data["gaps"])
        return {
            "resume_id": resume_id,
            "job_id": job_id,
            "roadmap": roadmap
        }
    except Exception as e:
        print(f"ROADMAP ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analysis/analyze-new")
async def analyze_new_endpoint(
    db: Session = Depends(get_db),
    file: UploadFile = File(None),
    job_description: str = Form("Software Engineer"),
    current_user: models.User = Depends(auth.get_current_user)
):
    from app.services.parsing_service import parse_resume_upload
    from app.services.llm import extract_skills_from_text
    from sqlalchemy import func
    import json
    
    # 1. Parse Resume if provided
    resume_data = {}
    if file:
        resume_data = await parse_resume_upload(file)
    
    # 2. Create Resume Record
    new_resume = models.Resume(
        user_id=current_user.id,
        title=f"Analysis - {file.filename if file else 'Input'}",
        parsed_content=json.dumps(resume_data)
    )
    db.add(new_resume)
    db.flush()
    
    # 3. Extract and Link Resume Skills (Using AI)
    resume_text_for_ai = json.dumps({
        "experience": resume_data.get("experience", []),
        "projects": resume_data.get("projects", []),
        "skills": resume_data.get("skills", [])
    })[:4000]
    
    resume_skills_ai = extract_skills_from_text(resume_text_for_ai) if resume_text_for_ai else []

    # Fallback to existing parsed skills if AI fails
    if not resume_skills_ai and "skills" in resume_data:
        if isinstance(resume_data["skills"], list):
            for cat in resume_data["skills"]:
                resume_skills_ai.extend(cat.get("items", []))
        elif isinstance(resume_data["skills"], dict):
            for cat, items in resume_data["skills"].items():
                if isinstance(items, list): resume_skills_ai.extend(items)
                else: resume_skills_ai.append(str(items))

    for skill_name in set(resume_skills_ai):
        skill = db.query(models.Skill).filter(func.lower(models.Skill.name) == skill_name.lower()).first()
        if not skill:
            skill = models.Skill(name=skill_name[:255])
            db.add(skill)
            db.flush()
        rs = models.ResumeSkill(resume_id=new_resume.id, skill_id=skill.id)
        db.add(rs)

    # 4. Create Job Record
    new_job = models.Job(
        title="Target Career Path",
        description=job_description,
        source="analysis"
    )
    db.add(new_job)
    db.flush()
    
    # 5. Extract Job Skills (Using AI deeply against JD)
    job_skills_ai = extract_skills_from_text(job_description)
    
    # If LLM failed, fallback to basic keyword matching
    if not job_skills_ai:
        all_skills = db.query(models.Skill).all()
        job_skills_ai = [s.name for s in all_skills if s.name.lower() in job_description.lower()]

    for skill_name in set(job_skills_ai):
        skill = db.query(models.Skill).filter(func.lower(models.Skill.name) == skill_name.lower()).first()
        if not skill:
            skill = models.Skill(name=skill_name[:255])
            db.add(skill)
            db.flush()
        js = models.JobSkill(job_id=new_job.id, skill_id=skill.id, importance_weight=5)
        db.add(js)
    # 6. Create ResumeJobScore to permanently link this resume-job pair
    link = models.ResumeJobScore(
        resume_id=new_resume.id,
        job_id=new_job.id,
        match_score=0,  # Will be calculated on demand
        missing_keywords=[]
    )
    db.add(link)
    
    db.commit()
    
    return {
        "resume_id": new_resume.id,
        "job_id": new_job.id
    }

@app.get("/api/v1/analysis/history")
def get_analysis_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Returns the user's past roadmap analyses, newest first."""
    from app.services.analysis_service import get_skill_gap

    # Use ResumeJobScore to get reliably paired resume-job combos
    pairs = db.query(models.ResumeJobScore).join(
        models.Resume, models.ResumeJobScore.resume_id == models.Resume.id
    ).filter(
        models.Resume.user_id == current_user.id,
        models.Resume.title.like("Analysis -%")
    ).order_by(models.ResumeJobScore.created_at.desc()).all()
    
    history = []
    for pair in pairs:
        resume = db.query(models.Resume).filter(models.Resume.id == pair.resume_id).first()
        job = db.query(models.Job).filter(models.Job.id == pair.job_id).first()
        
        if not resume or not job:
            continue
        
        # Calculate match percentage
        try:
            gap_data = get_skill_gap(db, resume.id, job.id)
            match_pct = gap_data["match_percentage"]
            match_count = len(gap_data["matches"])
            gap_count = len(gap_data["gaps"])
        except:
            match_pct = 0
            match_count = 0
            gap_count = 0
        
        jd = job.description or ""
        history.append({
            "id": pair.id,
            "resume_id": resume.id,
            "job_id": job.id,
            "resume_title": resume.title,
            "job_title": job.title or "Target Role",
            "job_description_preview": jd[:120] + "..." if len(jd) > 120 else jd,
            "match_percentage": match_pct,
            "skills_matched": match_count,
            "skills_gap": gap_count,
            "created_at": resume.created_at.isoformat() if resume.created_at else None
        })
    
    return history

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to fix all localhost/network issues
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
