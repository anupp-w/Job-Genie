
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from dotenv import load_dotenv
from database import engine, Base, get_db
import models, schemas, crud, auth

load_dotenv()

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

from app.routers.scoring import router as scoring_router
app.include_router(scoring_router, prefix="/api/v1/resumes", tags=["scoring"])

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

@app.post("/api/v1/auth/forgot-password")
def forgot_password(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    import random
    
    # Always return success to avoid leaking which emails are registered
    user = crud.get_user_by_email(db, email=payload.email)
    if user:
        reset_code = f"{random.randint(100000, 999999)}"
        # Expire in 15 minutes
        expire_time = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        crud.set_reset_code(db, email=payload.email, code=reset_code, expire_time=expire_time)
        try:
            from app.utils.email import send_reset_code_email
            send_reset_code_email(email_to=user.email, reset_code=reset_code)
        except Exception as e:
            print(f"Failed to send reset email: {e}")
        
    return {"message": "If an account exists, reset instructions were sent."}

@app.post("/api/v1/auth/reset-password")
def reset_password(payload: schemas.PasswordResetVerify, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    user = crud.get_user_by_email(db, email=payload.email)
    
    if not user or user.reset_code != payload.reset_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")
    
    if user.reset_code_expire and user.reset_code_expire.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code has expired")

    crud.reset_password(db, email=payload.email, new_password=payload.new_password)
    
    return {"message": "Password successfully reset."}

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
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File, Form

# ──── Resumes Endpoints ────
@app.get("/api/v1/resumes")
def list_resumes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    resumes = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).order_by(models.Resume.updated_at.desc()).all()
    results = []
    for r in resumes:
        sections = db.query(models.ResumeSection).filter(models.ResumeSection.resume_id == r.id).all()
        results.append({
            "id": r.id,
            "title": r.title,
            "ats_score": r.ats_score or 0,
            "file_path": r.file_path,
            "parsed_content": r.parsed_content,
            "sections": [{"id": s.id, "section_type": s.section_type, "content": s.content, "order": s.order} for s in sections],
            "updated": r.updated_at.isoformat() if r.updated_at else None
        })
    return results

@app.post("/api/v1/resumes")
def create_resume(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    import json
    resume = models.Resume(
        user_id=current_user.id,
        title=payload.get("title", "Untitled Resume"),
    )
    db.add(resume)
    db.flush()
    
    for sec in payload.get("sections", []):
        section = models.ResumeSection(
            resume_id=resume.id,
            section_type=sec.get("section_type", "general"),
            content=sec.get("content", ""),
            order=sec.get("order", 0)
        )
        db.add(section)
    
    db.commit()
    db.refresh(resume)
    sections = db.query(models.ResumeSection).filter(models.ResumeSection.resume_id == resume.id).all()
    return {
        "id": resume.id,
        "title": resume.title,
        "ats_score": resume.ats_score or 0,
        "file_path": resume.file_path,
        "parsed_content": resume.parsed_content,
        "sections": [{"id": s.id, "section_type": s.section_type, "content": s.content, "order": s.order} for s in sections],
        "updated": resume.updated_at.isoformat() if resume.updated_at else None
    }

@app.put("/api/v1/resumes/{resume_id}")
def update_resume(
    resume_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if "title" in payload:
        resume.title = payload["title"]
        
    # Delete old sections
    db.query(models.ResumeSection).filter(models.ResumeSection.resume_id == resume.id).delete()
    
    # Add new sections
    for sec in payload.get("sections", []):
        section = models.ResumeSection(
            resume_id=resume.id,
            section_type=sec.get("section_type", "general"),
            content=sec.get("content", ""),
            order=sec.get("order", 0)
        )
        db.add(section)
        
    # Update timestamp
    resume.updated_at = func.now()
    
    db.commit()
    db.refresh(resume)
    
    sections = db.query(models.ResumeSection).filter(models.ResumeSection.resume_id == resume.id).all()
    return {
        "id": resume.id,
        "title": resume.title,
        "ats_score": resume.ats_score or 0,
        "file_path": resume.file_path,
        "parsed_content": resume.parsed_content,
        "sections": [{"id": s.id, "section_type": s.section_type, "content": s.content, "order": s.order} for s in sections],
        "updated": resume.updated_at.isoformat() if resume.updated_at else None
    }

@app.get("/api/v1/resumes/{resume_id}")
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    sections = db.query(models.ResumeSection).filter(models.ResumeSection.resume_id == resume.id).all()
    return {
        "id": resume.id,
        "title": resume.title,
        "ats_score": resume.ats_score or 0,
        "file_path": resume.file_path,
        "parsed_content": resume.parsed_content,
        "sections": [{"id": s.id, "section_type": s.section_type, "content": s.content, "order": s.order} for s in sections],
        "updated": resume.updated_at.isoformat() if resume.updated_at else None
    }

@app.delete("/api/v1/resumes/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(resume)
    db.commit()
    return {"detail": "deleted"}

@app.post("/api/v1/resumes/parse")
async def parse_resume_for_builder(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    from app.services.parsing_service import parse_resume_upload
    try:
        parsed_data = await parse_resume_upload(file)
        return {"parsed_data": parsed_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

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
    resume_id: int | None = Form(None),
    job_description: str = Form("Software Engineer"),
    current_user: models.User = Depends(auth.get_current_user)
):
    from app.services.parsing_service import parse_resume_upload, _extract_text_from_pdf
    from app.services.llm import extract_skills_from_text
    from sqlalchemy import func
    import json, re, tempfile, os, logging
    
    # SETUP FILE LOGGING FOR DEBUGGING
    logger = logging.getLogger("jobgenie.analysis.debug")
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        fh = logging.FileHandler("analysis_debug.log")
        fh.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
        logger.addHandler(fh)
        
    logger.info(f"--- NEW ANALYSIS REQUEST ---")
    logger.info(f"File provided: {file is not None}")
    logger.info(f"Resume ID provided: {resume_id}")
    logger.info(f"Job Description Length: {len(job_description)}")

    if not resume_id and not file:
        logger.error("analyze-new called without resume_id and without file")
        raise HTTPException(
            status_code=400,
            detail="Provide either resume_id (recommended) or a resume PDF file.",
        )
    
    # 1. Parse Resume if provided — extract BOTH structured data and raw text
    resume_data = {}
    raw_resume_text = ""
    source_resume = None
    if resume_id:
        source_resume = db.query(models.Resume).filter(
            models.Resume.id == resume_id,
            models.Resume.user_id == current_user.id,
        ).first()

        if not source_resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        if source_resume.parsed_content:
            try:
                resume_data = json.loads(source_resume.parsed_content)
            except Exception as e:
                logger.error(f"Stored resume parsed_content failed to load: {e}")
                resume_data = {}

        if not resume_data:
            structured_section = next(
                (section for section in source_resume.sections if section.section_type == "structured_data"),
                None,
            )
            if structured_section and structured_section.content:
                try:
                    resume_data = json.loads(structured_section.content)
                except Exception as e:
                    logger.error(f"Stored resume structured_data failed to load: {e}")
                    resume_data = {}

        if not resume_data:
            raise HTTPException(status_code=400, detail="Selected resume does not contain structured data")

        logger.info(f"Loaded existing resume data with keys: {list(resume_data.keys())}")
    elif file:
        # Save the file to a temp location so we can extract raw text directly
        file_bytes = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            # Extract raw text directly from PDF (this almost never fails)
            raw_resume_text = _extract_text_from_pdf(tmp_path)
            logger.info(f"Raw PDF text extracted: {len(raw_resume_text)} chars")
        except Exception as e:
            logger.error(f"Raw text extraction failed: {e}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        # Also try structured parsing (reset file position first)
        await file.seek(0)
        try:
            resume_data = await parse_resume_upload(file)
        except Exception as e:
            logger.error(f"Structured parsing failed: {e}")
            resume_data = {}
    
    # 2. Create Resume Record
    analysis_title = source_resume.title if source_resume else (file.filename if file else 'Input')
    new_resume = models.Resume(
        user_id=current_user.id,
        title=f"Analysis - {analysis_title}",
        parsed_content=json.dumps(resume_data) if resume_data else json.dumps({"_raw_text": raw_resume_text[:2000]})
    )
    db.add(new_resume)
    db.flush()
    
    # 3. Extract and Link Resume Skills (Using AI)
    # PRIORITY: Use raw PDF text for skill extraction (most reliable)
    # Only fall back to structured data if raw text is empty
    resume_text_for_ai = ""
    if raw_resume_text and len(raw_resume_text.strip()) > 50:
        resume_text_for_ai = raw_resume_text[:4000]
        logger.info("Using raw PDF text for resume skill extraction")
    elif resume_data and any(resume_data.get(k) for k in ["experience", "projects", "skills"]):
        resume_text_for_ai = json.dumps({
            "experience": resume_data.get("experience", []),
            "projects": resume_data.get("projects", []),
            "skills": resume_data.get("skills", [])
        })[:4000]
        logger.info("Using structured parse data for resume skill extraction")
    
    resume_skills_ai = []
    if resume_data and "skills" in resume_data:
        if isinstance(resume_data["skills"], list):
            for cat in resume_data["skills"]:
                if isinstance(cat, dict):
                    resume_skills_ai.extend(cat.get("items", []) or cat.get("skills", []))
                elif isinstance(cat, str):
                    resume_skills_ai.append(cat)
        elif isinstance(resume_data["skills"], dict):
            for cat, items in resume_data["skills"].items():
                if isinstance(items, list):
                    resume_skills_ai.extend(items)
                else:
                    resume_skills_ai.append(str(items))

    if resume_text_for_ai:
        resume_skills_ai = extract_skills_from_text(resume_text_for_ai)
        logger.info(f"LLM extracted {len(resume_skills_ai)} resume skills: {resume_skills_ai}")

    # Merge in structured parse skills so uploaded PDF skills are never ignored.
    if resume_data and "skills" in resume_data:
        logger.info(f"Structured parse contributed {len(resume_skills_ai)} resume skills before dedupe")

    if resume_text_for_ai:
        structured_skills = []
        if resume_data and "skills" in resume_data:
            if isinstance(resume_data["skills"], list):
                for cat in resume_data["skills"]:
                    if isinstance(cat, dict):
                        structured_skills.extend(cat.get("items", []) or cat.get("skills", []))
                    elif isinstance(cat, str):
                        structured_skills.append(cat)
            elif isinstance(resume_data["skills"], dict):
                for cat, items in resume_data["skills"].items():
                    if isinstance(items, list):
                        structured_skills.extend(items)
                    else:
                        structured_skills.append(str(items))
        resume_skills_ai = list(dict.fromkeys([*structured_skills, *resume_skills_ai]))
    elif not resume_skills_ai:
        logger.info("No structured or extracted skills available from resume parsing")

    for skill_name in set(resume_skills_ai):
        if not skill_name or not isinstance(skill_name, str):
            continue
        skill_name = skill_name.strip()
        if not skill_name:
            continue
        skill = db.query(models.Skill).filter(func.lower(models.Skill.name) == skill_name.lower()).first()
        if not skill:
            skill = models.Skill(name=skill_name[:255])
            db.add(skill)
            db.flush()
        # Avoid duplicates
        existing = db.query(models.ResumeSkill).filter_by(resume_id=new_resume.id, skill_id=skill.id).first()
        if not existing:
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
    logger.info(f"LLM extracted {len(job_skills_ai)} job skills: {job_skills_ai}")
    
    # If LLM failed, fallback to word-boundary matching (not substring!)
    if not job_skills_ai:
        all_skills = db.query(models.Skill).all()
        jd_lower = job_description.lower()
        job_skills_ai = []
        for s in all_skills:
            # Use word boundary regex to avoid "Java" matching "JavaScript"
            pattern = r'\b' + re.escape(s.name.lower()) + r'\b'
            if re.search(pattern, jd_lower):
                job_skills_ai.append(s.name)
        logger.info(f"Fallback matched {len(job_skills_ai)} job skills from DB")

    for skill_name in set(job_skills_ai):
        if not skill_name or not isinstance(skill_name, str):
            continue
        skill_name = skill_name.strip()
        if not skill_name:
            continue
        skill = db.query(models.Skill).filter(func.lower(models.Skill.name) == skill_name.lower()).first()
        if not skill:
            skill = models.Skill(name=skill_name[:255])
            db.add(skill)
            db.flush()
        existing = db.query(models.JobSkill).filter_by(job_id=new_job.id, skill_id=skill.id).first()
        if not existing:
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
    logger.info(f"Analysis complete: resume #{new_resume.id}, job #{new_job.id}")
    
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

        # Skip legacy empty runs that were created without a resume source.
        if resume.title == "Analysis - Input" and (not resume.parsed_content or resume.parsed_content.strip() == '{"_raw_text": ""}'):
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

# trigger reload
