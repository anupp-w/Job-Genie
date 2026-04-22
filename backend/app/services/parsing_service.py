import os
import json
import tempfile
import logging
from fastapi import UploadFile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- PDF Text Extraction (pypdf) ---
try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    try:
        from PyPDF2 import PdfReader
        PYPDF_AVAILABLE = True
    except ImportError:
        PYPDF_AVAILABLE = False
        logger.warning("pypdf/PyPDF2 not installed. PDF text extraction unavailable.")

logger.info("Using deterministic resume parsing; CrewAI-based parsing is disabled.")


def _extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file using pypdf."""
    if not PYPDF_AVAILABLE:
        return ""
    try:
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""


def _build_mock_resume(name: str, email: str, skills: list) -> dict:
    """Return a structured fallback resume when AI parsing is unavailable."""
    return {
        "personal": {
            "firstName": name.split(" ")[0] if name else "Candidate",
            "lastName": name.split(" ", 1)[1] if " " in name else "",
            "phone": "",
            "email": email,
            "linkedin": "",
            "github": "",
            "website": "",
        },
        "summary": f"Experienced professional with skills in {', '.join(skills[:4])}." if skills else "",
        "objective": "",
        "experience": [],
        "projects": [],
        "education": [],
        "skills": [{"category": "Technical Skills", "items": skills[:15]}],
        "certifications": [],
        "leadership": [],
        "research": [],
        "awards": [],
        "publications": [],
    }


def _extract_skills_from_text(text: str) -> list[str]:
    """Extract a broad set of likely technical skills from resume text."""
    if not text:
        return []

    skill_candidates = [
        "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "FastAPI", "Flask",
        "Django", "SQL", "PostgreSQL", "MySQL", "MongoDB", "AWS", "Azure", "GCP", "Docker", "Kubernetes",
        "Git", "CI/CD", "MLflow", "Kubeflow", "SageMaker", "Vertex AI", "Azure ML", "TensorFlow", "PyTorch",
        "Scikit-learn", "Pandas", "NumPy", "NLP", "Computer Vision", "Machine Learning", "Deep Learning",
        "LLM APIs", "OpenAI", "Groq", "LangChain", "LangGraph", "CrewAI", "LlamaIndex", "Embeddings",
        "Vector Databases", "RESTful APIs", "Microservices", "MLOps", "Data Pipelines", "Feature Engineering",
        "Regression", "Classification", "Clustering", "Linux", "Operating Systems", "Data Structures",
        "Algorithms", "System Design", "HTML", "CSS", "Tailwind CSS", "Uvicorn", "PyPDF", "Hugging Face",
        "Transformers"
    ]

    lowered = text.lower()
    found = []
    for candidate in skill_candidates:
        pattern = candidate.lower().replace(".", r"\\.")
        if pattern in lowered:
            found.append(candidate)

    # Keep ordering stable and remove duplicates.
    deduped = []
    seen = set()
    for skill in found:
        key = skill.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(skill)
    return deduped


async def parse_resume_upload(file: UploadFile) -> dict:
    """
        Parse an uploaded PDF resume into structured JSON using pypdf plus
        deterministic heuristics. This intentionally avoids CrewAI so parsing is
        predictable and does not depend on a hosted agent pipeline.
    """
    suffix = os.path.splitext(file.filename or "resume.pdf")[1].lower()

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Step 1: Extract raw text
        raw_text = _extract_text_from_pdf(tmp_path)
        if not raw_text:
            logger.warning("No text extracted from PDF — returning mock data.")
            return _build_mock_resume("Candidate Name", "candidate@example.com", ["Python", "React"])

        # Step 2: Deterministic fallback — extract name/email/skills with simple heuristics
        return _simple_heuristic_parse(raw_text, file.filename or "")

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def _parse_with_crewai(raw_text: str, groq_key: str) -> dict:
    """Compatibility shim preserved for older callers; no CrewAI dependency remains."""
    logger.info("CrewAI parsing shim invoked; using deterministic parser instead.")
    return _simple_heuristic_parse(raw_text, "resume.pdf")


def _simple_heuristic_parse(text: str, filename: str) -> dict:
    """Basic heuristic fallback when AI is unavailable — extracts name, email, phone."""
    import re

    email_match = re.search(r"[\w.+-]+@[\w-]+\.\w+", text)
    phone_match = re.search(r"[\+\(]?[\d\s\-\(\)]{7,15}", text)
    email = email_match.group(0) if email_match else ""
    phone = phone_match.group(0).strip() if phone_match else ""

    # Try to get name from first non-empty line
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    name = lines[0] if lines else filename.split(".")[0].replace("_", " ")

    # Detect skills by common keywords and technical phrases.
    found_skills = _extract_skills_from_text(text)

    # Add a few obvious extras from sections so PDF resumes are not empty when the text is noisy.
    section_headers = ["experience", "projects", "skills", "education", "certifications"]
    if not found_skills:
        for header in section_headers:
            if header in text.lower():
                found_skills.append(header.title())
                break

    return _build_mock_resume(name, email, found_skills)
