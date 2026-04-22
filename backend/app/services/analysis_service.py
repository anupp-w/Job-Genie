from sqlalchemy.orm import Session
from sqlalchemy import func, case
import models
from typing import List, Dict, Any, Iterable
import json
import re


SKILL_ALIASES = {
    "aws": ["amazon web services"],
    "gcp": ["google cloud platform", "google cloud"],
    "azure": ["microsoft azure"],
    "fastapi": ["fast api"],
    "nextjs": ["next.js", "next js"],
    "nodejs": ["node.js", "node js"],
    "scikitlearn": ["scikit learn", "scikit-learn"],
    "pytorch": ["py torch", "torch"],
    "numpy": ["num py"],
    "mlops": ["ml ops"],
    "llmapis": ["llm api", "llm apis"],
    "vector databases": ["vector database", "vector db"],
    "restfulapis": ["rest api", "restful api", "rest apis"],
    "computervision": ["computer vision"],
    "machinelearning": ["machine learning"],
    "deeplearning": ["deep learning"],
    "datastructures": ["data structures"],
    "systemdesign": ["system design"],
    "versioncontrol": ["version control", "git"],
    "ci/cd": ["cicd", "ci cd"],
    "htmlcss": ["html", "css", "html / css"],
    "langchain": ["lang chain"],
    "langgraph": ["lang graph"],
    "crewai": ["crew ai"],
    "llamaindex": ["llama index"],
    "postgre sql": ["postgresql", "postgres"],
}


COMMON_SKILL_PHRASES = [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "FastAPI", "Flask",
    "Django", "SQL", "PostgreSQL", "MySQL", "MongoDB", "AWS", "Azure", "GCP", "Docker", "Kubernetes",
    "Git", "CI/CD", "MLflow", "Kubeflow", "SageMaker", "Vertex AI", "Azure ML", "TensorFlow", "PyTorch",
    "Scikit-learn", "Pandas", "NumPy", "NLP", "Computer Vision", "Machine Learning", "Deep Learning",
    "LLM APIs", "OpenAI", "Groq", "LangChain", "LangGraph", "CrewAI", "LlamaIndex", "Embeddings",
    "Vector Databases", "RESTful APIs", "Microservices", "MLOps", "Data Pipelines", "Feature Engineering",
    "Regression", "Classification", "Clustering", "Linux", "Operating Systems", "Data Structures",
    "Algorithms", "System Design", "HTML", "CSS", "Tailwind CSS", "Uvicorn", "PyPDF", "Hugging Face",
    "Transformers", "Agile", "Cyber Security", "Networking", "C++"
]


def _normalize_skill(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _skill_variants(value: str) -> set[str]:
    normalized = _normalize_skill(value)
    variants = {normalized}
    alias_variants = SKILL_ALIASES.get(normalized, [])
    for alias in alias_variants:
        variants.add(_normalize_skill(alias))
    # Also add a light alias lookup using the raw text keys so values like
    # "postgresql" and "postgre sql" still meet in the middle.
    for alias_key, alias_values in SKILL_ALIASES.items():
        if normalized == _normalize_skill(alias_key):
            for alias in alias_values:
                variants.add(_normalize_skill(alias))
    return variants


def _skill_matches(candidate: str, resume_skill_norms: set[str]) -> bool:
    candidate_norm = _normalize_skill(candidate)
    if candidate_norm in resume_skill_norms:
        return True

    candidate_variants = _skill_variants(candidate)
    if candidate_variants & resume_skill_norms:
        return True

    for resume_skill in resume_skill_norms:
        if candidate_norm and (candidate_norm in resume_skill or resume_skill in candidate_norm):
            return True
    return False


def _phrase_variants(phrase: str) -> set[str]:
    normalized = _normalize_skill(phrase)
    variants = {phrase.lower(), normalized}
    for alias in SKILL_ALIASES.get(normalized, []):
        variants.add(alias.lower())
        variants.add(_normalize_skill(alias))
    return variants


def _collect_text_from_resume_payload(payload: Any) -> str:
    if not payload:
        return ""
    if isinstance(payload, str):
        return payload
    if isinstance(payload, dict):
        parts: list[str] = []
        for key, value in payload.items():
            if key in {"summary", "objective", "title"}:
                parts.append(str(value))
            elif key in {"experience", "projects", "education", "leadership", "research", "certifications", "awards", "publications"}:
                parts.append(json.dumps(value, ensure_ascii=False))
            elif key == "skills":
                parts.append(json.dumps(value, ensure_ascii=False))
            elif isinstance(value, (dict, list)):
                parts.append(_collect_text_from_resume_payload(value))
        return "\n".join(p for p in parts if p)
    if isinstance(payload, list):
        return "\n".join(_collect_text_from_resume_payload(item) for item in payload)
    return str(payload)


def _extract_skills_from_text(text: str) -> list[str]:
    if not text:
        return []
    lowered = text.lower()
    found: list[str] = []
    for phrase in COMMON_SKILL_PHRASES:
        if any(variant in lowered for variant in _phrase_variants(phrase)):
            found.append(phrase)
    # Keep order stable and dedupe
    deduped: list[str] = []
    seen: set[str] = set()
    for skill in found:
        key = _normalize_skill(skill)
        if key not in seen:
            seen.add(key)
            deduped.append(skill)
    return deduped


def _extract_resume_skill_names(db: Session, resume_id: int) -> set[str]:
    resume_skill_names: set[str] = set()

    # Directly linked resume skills, if any
    linked_skills = db.query(models.Skill).join(models.ResumeSkill).filter(models.ResumeSkill.resume_id == resume_id).all()
    for skill in linked_skills:
        if skill.name:
            resume_skill_names.add(skill.name)

    # Saved resume payload and sections are the more reliable source for user-created resumes.
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        return resume_skill_names

    resume_payload = None
    if resume.parsed_content:
        try:
            resume_payload = json.loads(resume.parsed_content)
        except Exception:
            resume_payload = resume.parsed_content

    section_texts: list[str] = []
    for section in resume.sections or []:
        if getattr(section, "content", None):
            section_texts.append(section.content)
        if getattr(section, "section_type", "") == "structured_data" and getattr(section, "content", None):
            try:
                resume_payload = json.loads(section.content)
            except Exception:
                pass

    payload_text = _collect_text_from_resume_payload(resume_payload)
    resume_text_blob = "\n".join([payload_text, *section_texts])

    if resume_text_blob:
        for skill in _extract_skills_from_text(resume_text_blob):
            resume_skill_names.add(skill)

    # Also pull obvious explicit skills out of structured skill buckets.
    if isinstance(resume_payload, dict):
        skills_section = resume_payload.get("skills", [])
        if isinstance(skills_section, list):
            for item in skills_section:
                if isinstance(item, dict):
                    values = item.get("items") or item.get("skills") or []
                    if isinstance(values, list):
                        for value in values:
                            if isinstance(value, str) and value.strip():
                                resume_skill_names.add(value.strip())
                    elif isinstance(values, str) and values.strip():
                        resume_skill_names.add(values.strip())
                elif isinstance(item, str) and item.strip():
                    resume_skill_names.add(item.strip())
        elif isinstance(skills_section, dict):
            for _, values in skills_section.items():
                if isinstance(values, list):
                    for value in values:
                        if isinstance(value, str) and value.strip():
                            resume_skill_names.add(value.strip())
                elif isinstance(values, str) and values.strip():
                    resume_skill_names.add(values.strip())

    return resume_skill_names

def get_skill_gap(db: Session, resume_id: int, job_id: int) -> Dict[str, Any]:
    """
    Identifies matching skills and missing skills (gaps) between a resume and a job.
    """
    # Build a resilient set of resume skills from the stored resume payload,
    # section content, and any linked resume_skill rows.
    resume_skill_names = _extract_resume_skill_names(db, resume_id)
    resume_skill_norms = {_normalize_skill(name) for name in resume_skill_names if name}

    # Fetch Job Skills
    job_skills_assoc = db.query(models.JobSkill).filter(models.JobSkill.job_id == job_id).all()
    
    # Identify Matches and Gaps
    matches = []
    gaps = []
    
    for js in job_skills_assoc:
        skill = db.query(models.Skill).filter(models.Skill.id == js.skill_id).first()
        if not skill:
            continue
        if _skill_matches(skill.name or "", resume_skill_norms):
            matches.append({
                "id": skill.id,
                "name": skill.name,
                "importance": js.importance_weight
            })
        else:
            gaps.append({
                "id": skill.id,
                "name": skill.name,
                "importance": js.importance_weight
            })

    match_percentage = (len(matches) / (len(matches) + len(gaps)) * 100) if (len(matches) + len(gaps)) > 0 else 0

    return {
        "resume_id": resume_id,
        "job_id": job_id,
        "match_percentage": round(match_percentage, 2),
        "matches": matches,
        "gaps": gaps
    }

def generate_roadmap(db: Session, gap_skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates a sequenced learning roadmap based on missing skills.
    """
    roadmap = []
    
    # SQLAlchemy 2.0 case() syntax
    level_order = case(
        (models.Course.level == 'Beginner', 1),
        (models.Course.level == 'Intermediate', 2),
        (models.Course.level == 'Advanced', 3),
        else_=4
    )
    
    for skill_info in gap_skills:
        skill_id = skill_info["id"]
        skill_name = skill_info["name"]
        
        # Find courses for this skill
        courses = db.query(models.Course).join(models.CourseSkill).filter(
            models.CourseSkill.skill_id == skill_id
        ).order_by(
            level_order.asc(),
            models.Course.rating.desc()
        ).limit(3).all()  # Top 3 courses per skill
        
        if courses:
            roadmap.append({
                "skill_id": skill_id,
                "skill_name": skill_name,
                "courses": [
                    {
                        "id": c.id,
                        "title": c.title or "Untitled Course",
                        "platform": c.platform or "Unknown",
                        "url": c.url or "",
                        "level": c.level or "Unknown",
                        "rating": c.rating if c.rating is not None else 0.0,
                        "duration": c.duration or "N/A",
                        "institution": c.institution or "Unknown"
                    } for c in courses
                ]
            })
            
    return roadmap
