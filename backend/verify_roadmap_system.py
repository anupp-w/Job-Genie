import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import SessionLocal
import backend.models as models
from backend.app.services.analysis_service import get_skill_gap, generate_roadmap

def verify():
    db = SessionLocal()
    try:
        course_count = db.query(models.Course).count()
        skill_count = db.query(models.Skill).count()
        course_skill_count = db.query(models.CourseSkill).count()
        
        print(f"Courses in DB: {course_count}")
        print(f"Skills in DB: {skill_count}")
        print(f"Course-Skill links: {course_skill_count}")
        
        if course_count > 0:
            print("Injection check: SUCCESS")
            
            # Simple check for a roadmap
            print("\nSample Roadmap for Skill ID 1 (if exists):")
            sample_skill = db.query(models.Skill).first()
            if sample_skill:
                roadmap = generate_roadmap(db, [{"id": sample_skill.id, "name": sample_skill.name, "importance": 1}])
                if roadmap:
                    print(f"Roadmap generated for {sample_skill.name}: {len(roadmap[0]['courses'])} courses found.")
                else:
                    print("No courses found for this skill.")
        else:
            print("Injection check: FAILED (No courses found)")

    except Exception as e:
        print(f"Verification error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
