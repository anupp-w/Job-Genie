
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.api import deps

router = APIRouter()

@router.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(deps.get_db)):
    db_user = crud.crud_user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.crud_user.create_user(db=db, user=user)

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

@router.patch("/me", response_model=schemas.UserResponse)
def update_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.profile_pic_url is not None:
        current_user.profile_pic_url = payload.profile_pic_url
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("", response_model=list[schemas.UserResponse])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Retrieve all users. Admin only.
    """
    return crud.crud_user.get_multi(db, skip=skip, limit=limit)

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def admin_update_user(
    user_id: int,
    payload: schemas.UserAdminUpdate,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Update a user's details or role. Admin only.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.profile_pic_url is not None:
        user.profile_pic_url = payload.profile_pic_url
    if payload.role is not None:
        user.role = payload.role
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=schemas.UserResponse)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Delete a user. Admin only.
    """
    user = crud.crud_user.remove_user(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
