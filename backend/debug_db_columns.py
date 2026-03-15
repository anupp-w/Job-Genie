import sys
import os
from sqlalchemy import inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from app.models.resume import Resume

def check_resume_table():
    inspector = inspect(engine)
    columns = inspector.get_columns('resumes')
    print("Columns in 'resumes' table:")
    for col in columns:
        print(f" - {col['name']} ({col['type']})")
    
    print("-" * 50)
    sections_columns = inspector.get_columns('resume_sections')
    print("Columns in 'resume_sections' table:")
    for col in sections_columns:
        print(f" - {col['name']} ({col['type']})")

if __name__ == "__main__":
    check_resume_table()
