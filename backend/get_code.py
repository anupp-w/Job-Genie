from app.db.session import SessionLocal
from app.crud.crud_user import get_user_by_email

db = SessionLocal()
u = get_user_by_email(db, "test2@example.com")
print(f"RESET_CODE={u.reset_code}")
