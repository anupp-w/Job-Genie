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

# --- CrewAI + LLM ---
try:
    from crewai import Agent, Task, Crew, Process
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False
    logger.warning("CrewAI not installed. Parsing will use basic text extraction fallback.")

try:
    from langchain_openai import ChatOpenAI
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False


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


async def parse_resume_upload(file: UploadFile) -> dict:
    """
    Parse an uploaded PDF resume into structured JSON using:
      1. pypdf for raw text extraction
      2. CrewAI agents (Extractor + Formatter) for structured parsing
      3. Fallback to basic mock if AI is unavailable
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

        # Step 2: Try CrewAI structured extraction
        openai_key = os.getenv("OPENAI_API_KEY")
        if CREWAI_AVAILABLE and LANGCHAIN_AVAILABLE and openai_key:
            try:
                return await _parse_with_crewai(raw_text, openai_key)
            except Exception as e:
                logger.error(f"CrewAI parsing failed, falling back to mock: {e}")

        # Step 3: Basic fallback — extract name/email/skills with simple heuristics
        return _simple_heuristic_parse(raw_text, file.filename or "")

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def _parse_with_crewai(raw_text: str, openai_key: str) -> dict:
    """Use CrewAI two-agent pipeline to extract structured resume JSON."""
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        openai_api_key=openai_key,
        temperature=0
    )

    extractor = Agent(
        role="Resume Data Extractor",
        goal="Extract every piece of information from the raw resume text into a precise JSON structure.",
        backstory=(
            "You are an expert resume analyst who reads raw resume text and accurately identifies "
            "all sections: personal info, summary, work experience, education, projects, skills, "
            "certifications, leadership, research, awards, and publications."
        ),
        verbose=False,
        llm=llm,
        allow_delegation=False,
    )

    formatter = Agent(
        role="Resume JSON Formatter",
        goal="Transform the extracted resume data into a clean, valid JSON matching the exact frontend schema.",
        backstory=(
            "You ensure JSON output is syntactically valid and exactly matches the required schema "
            "with correct field names and data types."
        ),
        verbose=False,
        llm=llm,
        allow_delegation=False,
    )

    extract_task = Task(
        description=(
            f"Extract ALL data from this resume text:\n\n{raw_text}\n\n"
            "Identify: full name, email, phone, LinkedIn URL, GitHub URL, website, summary, objective, "
            "work experiences (role, company, location, start date, end date, current?, description), "
            "education (school, degree, minor, GPA, location, start/end dates), "
            "projects (name, technologies, description, GitHub/live URL, start/end dates), "
            "skills (grouped into categories like Technical, Soft, Languages), "
            "certifications (name, issuer, date obtained, expiration, credential ID, URL), "
            "leadership roles, research, awards, publications."
        ),
        expected_output="A thorough textual extraction of all resume sections and fields.",
        agent=extractor,
    )

    format_task = Task(
        description=(
            "Using the extracted resume data, produce a single valid JSON object matching EXACTLY this schema:\n"
            "{\n"
            '  "personal": { "firstName": "", "lastName": "", "phone": "", "email": "", "linkedin": "", "github": "", "website": "" },\n'
            '  "summary": "",\n'
            '  "objective": "",\n'
            '  "experience": [{ "role": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],\n'
            '  "projects": [{ "name": "", "tech": "", "description": "", "url": "", "startDate": "", "endDate": "", "current": false }],\n'
            '  "education": [{ "school": "", "degree": "", "minor": "", "gpa": "", "location": "", "startDate": "", "endDate": "" }],\n'
            '  "skills": [{ "category": "Technical Skills", "items": [] }],\n'
            '  "certifications": [{ "name": "", "issuer": "", "dateObtained": "", "expirationDate": "", "credentialId": "", "url": "" }],\n'
            '  "leadership": [{ "role": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],\n'
            '  "research": [{ "name": "", "tech": "", "description": "", "url": "", "startDate": "", "endDate": "", "current": false }],\n'
            '  "awards": [{ "title": "", "issuer": "", "date": "", "description": "" }],\n'
            '  "publications": [{ "title": "", "publisher": "", "date": "", "url": "", "description": "" }]\n'
            "}\n"
            "Output ONLY the JSON with no markdown fences or extra text."
        ),
        expected_output="A single valid JSON object with all resume fields populated.",
        agent=formatter,
        context=[extract_task],
    )

    crew = Crew(
        agents=[extractor, formatter],
        tasks=[extract_task, format_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    result_str = str(result.raw if hasattr(result, "raw") else result).strip()

    # Strip markdown fences if present
    if "```json" in result_str:
        result_str = result_str.split("```json")[1].split("```")[0].strip()
    elif "```" in result_str:
        parts = result_str.split("```")
        if len(parts) >= 3:
            result_str = parts[1].strip()

    return json.loads(result_str)


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

    # Detect skills by common keywords
    skill_keywords = ["Python", "JavaScript", "TypeScript", "React", "Node", "SQL", "Java", "C++",
                      "AWS", "Docker", "Git", "Machine Learning", "FastAPI", "Next.js", "MongoDB"]
    found_skills = [s for s in skill_keywords if s.lower() in text.lower()]

    return _build_mock_resume(name, email, found_skills)
