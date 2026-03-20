import os
import pandas as pd
import math
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, MetaData
import urllib.parse
import sys

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from database import SessionLocal
from models import Course, Skill

def slugify(text):
    if not text or not isinstance(text, str):
        return ""
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = text.strip('-')
    return text

def inject_data():
    db = SessionLocal()
    metadata = MetaData()
    metadata.reflect(bind=db.get_bind())
    course_skills_table = metadata.tables['course_skills']

    try:
        # Load Coursera
        coursera_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Dataset', 'Coursera.csv'))
        if os.path.exists(coursera_path):
            print(f"Loading Coursera data from {coursera_path}...")
            df_coursera = pd.read_csv(coursera_path)
            for _, row in df_coursera.iterrows():
                course_title = str(row['course'])
                existing_course = db.query(Course).filter(Course.title == course_title, Course.platform == 'Coursera').first()
                
                if not existing_course:
                    course_name_slug = slugify(course_title)
                    new_course = Course(
                        title=course_title,
                        platform='Coursera',
                        url=f"https://www.coursera.org/learn/{course_name_slug}",
                        rating=float(row['rating']) if pd.notna(row['rating']) else 0.0,
                        level=str(row['level']) if pd.notna(row['level']) else "Beginner",
                        duration=str(row['duration']) if pd.notna(row['duration']) else "",
                        institution=str(row['partner']) if pd.notna(row['partner']) else "",
                        description=f"Course by {row['partner']}. {row['certificatetype']}" if pd.notna(row['certificatetype']) else f"Course by {row['partner']}",
                        category=str(row['certificatetype']) if pd.notna(row['certificatetype']) else "Course"
                    )
                    db.add(new_course)
                    db.flush()
                    
                    skills_str = str(row['skills']) if pd.notna(row['skills']) else ""
                    if skills_str:
                        skills_list = [s.strip() for s in skills_str.split(',')]
                        for skill_name in skills_list:
                            if not skill_name: continue
                            skill = db.query(Skill).filter(Skill.name.ilike(skill_name)).first()
                            if not skill:
                                skill = Skill(name=skill_name, category='General')
                                db.add(skill)
                                db.flush()
                            db.execute(course_skills_table.insert().values(course_id=new_course.id, skill_id=skill.id))
            print("Coursera data injected.")

        # Load edX
        edx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Dataset', 'edx.csv'))
        if os.path.exists(edx_path):
            print(f"Loading edX data from {edx_path}...")
            df_edx = pd.read_csv(edx_path)
            for _, row in df_edx.iterrows():
                course_title = str(row['title'])
                existing_course = db.query(Course).filter(Course.title == course_title, Course.platform == 'edX').first()
                
                if not existing_course:
                    # Corrected mapping for edX
                    description_val = ""
                    if 'course_full_description' in row and pd.notna(row['course_full_description']):
                        description_val = str(row['course_full_description'])[:1000]
                    elif 'description' in row and pd.notna(row['description']):
                        description_val = str(row['description'])[:1000]

                    new_course = Course(
                        title=course_title,
                        platform='edX',
                        url=str(row['link']) if pd.notna(row['link']) else "",
                        rating=0.0,
                        level=str(row['course_level']) if 'course_level' in row and pd.notna(row['course_level']) else "Informational",
                        duration=str(row['course_duration']) if 'course_duration' in row and pd.notna(row['course_duration']) else "",
                        institution=str(row['institution']) if pd.notna(row['institution']) else "",
                        description=description_val,
                        category=str(row['subcategory']) if 'subcategory' in row and pd.notna(row['subcategory']) else "General"
                    )
                    db.add(new_course)
                    db.flush()
                    
                    # Skills handling for edX
                    skills_str = str(row['associatedskills']) if 'associatedskills' in row and pd.notna(row['associatedskills']) else ""
                    if skills_str:
                        # Sometimes it's a JSON-like list or comma-separated
                        skills_list = []
                        if '[' in skills_str:
                            try:
                                import ast
                                skills_list = ast.literal_eval(skills_str)
                            except:
                                skills_list = [s.strip() for s in skills_str.replace('[','').replace(']','').replace("'",'').split(',')]
                        else:
                            skills_list = [s.strip() for s in skills_str.split(',')]
                        
                        for skill_name in skills_list:
                            if not skill_name: continue
                            skill = db.query(Skill).filter(Skill.name.ilike(skill_name)).first()
                            if not skill:
                                skill = Skill(name=skill_name, category='General')
                                db.add(skill)
                                db.flush()
                            db.execute(course_skills_table.insert().values(course_id=new_course.id, skill_id=skill.id))
            print("edX data injected.")

        db.commit()
        print("All data committed successfully.")

    except Exception as e:
        print(f"Error during injection: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    inject_data()
