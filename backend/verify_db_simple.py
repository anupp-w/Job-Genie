import os
import sys
from sqlalchemy import text
from database import SessionLocal

def verify():
    db = SessionLocal()
    try:
        course_count = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
        skill_count = db.execute(text("SELECT COUNT(*) FROM skills")).scalar()
        link_count = db.execute(text("SELECT COUNT(*) FROM course_skills")).scalar()
        
        print(f"Courses: {course_count}")
        print(f"Skills: {skill_count}")
        print(f"Links: {link_count}")
        
        if course_count > 0:
            print("DATA INJECTION: SUCCESS")
        else:
            print("DATA INJECTION: FAILED")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
