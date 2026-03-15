
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, crud, auth

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Genie API", version="0.1.0")

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

@app.post("/api/v1/users/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/v1/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

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

from fastapi import UploadFile, File
@app.post("/api/v1/parse")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    from app.services.parsing_service import parse_resume_upload
    try:
        data = await parse_resume_upload(file)
        return {"parsed_data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to fix all localhost/network issues
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
