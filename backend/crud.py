
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import models, schemas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
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
    db_user = get_user_by_email(db, email=email)
    if db_user:
        db_user.reset_code = code
        db_user.reset_code_expire = expire_time
        db.commit()
        db.refresh(db_user)
    return db_user

def reset_password(db: Session, email: str, new_password: str):
    db_user = get_user_by_email(db, email=email)
    if db_user:
        db_user.password_hash = get_password_hash(new_password)
        db_user.reset_code = None
        db_user.reset_code_expire = None
        db.commit()
        db.refresh(db_user)
    return db_user
