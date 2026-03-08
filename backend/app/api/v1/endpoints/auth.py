
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import random
from datetime import datetime, timezone

from app.utils.email import send_reset_code_email

from app import crud, schemas
from app.api import deps
from app.core import security
from app.core.config import settings

router = APIRouter()

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.crud_user.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(payload: schemas.PasswordResetRequest, db: Session = Depends(deps.get_db)):
    # Always return success to avoid leaking which emails are registered
    user = crud.crud_user.get_user_by_email(db, email=payload.email)
    if user:
        reset_code = f"{random.randint(100000, 999999)}"
        # Expire in 15 minutes
        expire_time = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        crud.crud_user.set_reset_code(db, email=payload.email, code=reset_code, expire_time=expire_time)
        send_reset_code_email(email_to=user.email, reset_code=reset_code)
        
    return {"message": "If an account exists, reset instructions were sent."}

@router.post("/reset-password")
def reset_password(payload: schemas.PasswordResetVerify, db: Session = Depends(deps.get_db)):
    user = crud.crud_user.get_user_by_email(db, email=payload.email)
    
    if not user or user.reset_code != payload.reset_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")
    
    if user.reset_code_expire and user.reset_code_expire.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code has expired")

    crud.crud_user.reset_password(db, email=payload.email, new_password=payload.new_password)
    
    return {"message": "Password successfully reset."}
