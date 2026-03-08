import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User

def check_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users in Database: {len(users)}")
        print("-" * 50)
        for u in users:
            print(f"ID: {u.id} | Name: {u.full_name} | Email: {u.email} | Created: {u.created_at}")
        print("-" * 50)
    except Exception as e:
        print(f"Database Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
