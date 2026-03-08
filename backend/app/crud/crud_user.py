
from sqlalchemy.orm import Session
from app import models, schemas
from app.core import security

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password,
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def set_reset_code(db: Session, email: str, code: str, expire_time):
    user = get_user_by_email(db, email)
    if user:
        user.reset_code = code
        user.reset_code_expire = expire_time
        db.commit()
        db.refresh(user)
    return user

def reset_password(db: Session, email: str, new_password: str):
    user = get_user_by_email(db, email)
    if user:
        user.password_hash = security.get_password_hash(new_password)
        user.reset_code = None
        user.reset_code_expire = None
        db.commit()
        db.refresh(user)
    return user

def get_multi(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def remove_user(db: Session, id: int):
    user = db.query(models.User).filter(models.User.id == id).first()
    if user:
        db.delete(user)
        db.commit()
    return user
