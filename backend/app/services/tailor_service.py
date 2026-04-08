import os
import json
from typing import Any, Dict, Optional, List
from dotenv import load_dotenv

load_dotenv()

try:
    from crewai import Agent, Task, Crew, Process
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False
    print("WARNING: CrewAI not installed. Tailoring feature will be disabled.")

try:
    from langchain_groq import ChatGroq
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    try:
        from langchain_openai import ChatOpenAI
        LANGCHAIN_AVAILABLE = True
    except ImportError:
        LANGCHAIN_AVAILABLE = False
        print("WARNING: Neither langchain-groq nor langchain-openai installed.")


# --- The exact JSON schema the frontend builder expects ---
BUILDER_SCHEMA = """{
  "personal": { "firstName": "", "lastName": "", "phone": "", "email": "", "linkedin": "", "github": "", "website": "" },
  "summary": "",
  "objective": "",
  "experience": [{ "role": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "projects": [{ "name": "", "tech": "", "description": "", "url": "", "startDate": "", "endDate": "", "current": false }],
  "education": [{ "school": "", "degree": "", "minor": "", "gpa": "", "location": "", "startDate": "", "endDate": "" }],
  "skills": [{ "name": "Technical Skills", "skills": ["Python", "React"] }],
  "certifications": [{ "name": "", "issuer": "", "dateObtained": "", "expirationDate": "", "credentialId": "", "url": "" }],
  "leadership": [],
  "research": [],
  "awards": [],
  "publications": []
}"""


def _get_llm():
    """Initialize the best available LLM (Groq preferred, OpenAI fallback)."""
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            return ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=groq_key,
                temperature=0.2
            )
        except Exception:
            pass

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=openai_key,
                temperature=0.2
            )
        except Exception:
            pass

    return None


async def tailor_resume_to_jd(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None,
    job_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tailor a resume to a job description using AI agents.
    
    Strategy:
    1. Analyze the JD to extract requirements, priorities, and terminology
    2. Map the candidate's existing experience to JD requirements
    3. Rewrite sections using JD language — NEVER fabricate experience
    4. Return tailored data + match score + changelog + gap report
    """
    llm = _get_llm() if CREWAI_AVAILABLE and LANGCHAIN_AVAILABLE else None

    if not llm:
        # Rule-based fallback when no LLM is available
        return _rule_based_fallback(resume_data, job_description or "")

    try:
        return await _tailor_with_crew(resume_data, job_description or "", llm)
    except Exception as e:
        print(f"CrewAI tailoring failed, using fallback: {e}")
        import traceback
        traceback.print_exc()
        return _rule_based_fallback(resume_data, job_description or "")


async def _tailor_with_crew(
    resume_data: Dict[str, Any],
    job_description: str,
    llm: Any
) -> Dict[str, Any]:
    """Full CrewAI-powered tailoring pipeline."""

    resume_json = json.dumps(resume_data, indent=2)

    # --- Agent 1: JD Analyst ---
    jd_analyst = Agent(
        role="Job Description Analyst",
        goal="Extract the core requirements, priorities, and terminology from the job description.",
        backstory=(
            "You are an expert recruiter who reads job descriptions and instantly identifies "
            "the must-have skills, nice-to-have skills, seniority level, and the specific "
            "language/terminology the company uses. You understand what ATS systems look for."
        ),
        verbose=False,
        llm=llm,
        allow_delegation=False,
    )

    # --- Agent 2: Resume Strategist ---
    strategist = Agent(
        role="Resume Tailoring Strategist",
        goal="Rewrite the resume to align with the job description while preserving absolute factual accuracy.",
        backstory=(
            "You are a career coach who specializes in tailoring resumes for specific roles. "
            "You NEVER invent experience or skills. You reframe existing achievements using "
            "the job description's language. You reorder bullet points to front-load relevance. "
            "You craft targeted professional summaries. You know how to pass ATS systems."
        ),
        verbose=False,
        llm=llm,
        allow_delegation=False,
    )

    # --- Task 1: Analyze JD ---
    jd_task = Task(
        description=(
            f"Analyze this job description thoroughly:\n\n{job_description}\n\n"
            "Extract and return a JSON object with:\n"
            "1. 'required_skills': array of must-have skills\n"
            "2. 'preferred_skills': array of nice-to-have skills\n"
            "3. 'key_responsibilities': array of main duties\n"
            "4. 'seniority_level': junior/mid/senior/lead\n"
            "5. 'industry_terms': array of specific terminology used\n"
            "6. 'impact_focus': what kind of achievements they value (metrics, scale, leadership, etc.)\n\n"
            "Return ONLY valid JSON. No markdown fences."
        ),
        expected_output="A structured JSON analysis of the job requirements.",
        agent=jd_analyst,
    )

    # --- Task 2: Tailor Resume ---
    tailor_task = Task(
        description=(
            f"You have the candidate's current resume:\n\n{resume_json}\n\n"
            "Using the JD analysis, rewrite this resume following these rules:\n\n"
            "RULES:\n"
            "1. NEVER invent skills, experience, or education the candidate doesn't have\n"
            "2. Rewrite the 'summary' to directly address the target role\n"
            "3. Reframe experience bullet points using the JD's terminology where the candidate has relevant experience\n"
            "4. Reorder skills within each category to put the most JD-relevant ones first\n"
            "5. If bullet points lack metrics, suggest quantified versions (but only if plausible from context)\n"
            "6. Keep all dates, company names, school names, and factual details EXACTLY as-is\n\n"
            f"OUTPUT FORMAT — Return a single valid JSON object with exactly TWO keys:\n"
            "A. 'tailored_resume': The full rewritten resume matching EXACTLY this schema:\n"
            f"{BUILDER_SCHEMA}\n\n"
            "B. 'report': An object with:\n"
            "   - 'match_score': integer 0-100 representing how well the candidate fits\n"
            "   - 'changes': array of strings describing each change made (e.g., 'Rewrote summary to emphasize cloud architecture experience')\n"
            "   - 'missing_skills': array of skills from the JD that the candidate genuinely does NOT have\n"
            "   - 'matched_skills': array of skills from the JD that the candidate DOES have\n\n"
            "Return ONLY the JSON. No markdown fences, no explanation."
        ),
        expected_output="A JSON object with 'tailored_resume' and 'report' keys.",
        agent=strategist,
        context=[jd_task],
    )

    # --- Run Crew ---
    crew = Crew(
        agents=[jd_analyst, strategist],
        tasks=[jd_task, tailor_task],
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

    parsed = json.loads(result_str)

    tailored = parsed.get("tailored_resume", parsed)
    report = parsed.get("report", {})

    return {
        "tailored_data": tailored,
        "match_score": report.get("match_score", 75),
        "explanation": f"Matched {len(report.get('matched_skills', []))} skills, {len(report.get('missing_skills', []))} gaps found.",
        "changes": report.get("changes", []),
        "missing_skills": report.get("missing_skills", []),
        "matched_skills": report.get("matched_skills", []),
    }


def _rule_based_fallback(
    resume_data: Dict[str, Any],
    job_description: str
) -> Dict[str, Any]:
    """
    Rule-based fallback when no LLM is available.
    Uses keyword extraction to provide basic matching.
    """
    import re

    jd_lower = job_description.lower()
    # Extract meaningful words from JD
    words = set(re.findall(r'\b[a-zA-Z][a-zA-Z+#.]{1,30}\b', job_description))
    stopwords = {
        "and", "the", "to", "a", "of", "in", "for", "is", "on", "that", "by",
        "this", "with", "you", "it", "not", "or", "be", "are", "will", "we",
        "our", "your", "have", "has", "from", "an", "can", "all", "been",
        "would", "should", "could", "about", "their", "them", "they", "who",
        "which", "what", "when", "where", "how", "more", "some", "any", "also",
        "than", "other", "into", "over", "such", "after", "before", "between",
        "through", "during", "must", "each", "may", "well", "including",
        "ability", "experience", "work", "working", "strong", "knowledge",
        "understanding", "team", "role", "position", "responsible", "looking",
    }
    jd_keywords = [w for w in words if w.lower() not in stopwords and len(w) > 2]

    # Extract existing skills from resume
    existing_skills: List[str] = []
    skills_data = resume_data.get("skills", [])
    if isinstance(skills_data, list):
        for cat in skills_data:
            if isinstance(cat, dict):
                items = cat.get("skills", cat.get("items", []))
                if isinstance(items, list):
                    existing_skills.extend([str(s).lower() for s in items])
    elif isinstance(skills_data, dict):
        for k, v in skills_data.items():
            if isinstance(v, list):
                existing_skills.extend([str(s).lower() for s in v])
            elif isinstance(v, str):
                existing_skills.extend([s.strip().lower() for s in v.split(",")])

    # Compute matches
    matched = [kw for kw in jd_keywords if kw.lower() in " ".join(existing_skills)]
    missing = [kw for kw in jd_keywords if kw.lower() not in " ".join(existing_skills)][:15]

    # Calculate match score
    total_kw = len(jd_keywords) if jd_keywords else 1
    match_score = min(int((len(matched) / total_kw) * 100), 100)

    # Return the resume as-is (no modification without AI) but with analysis
    return {
        "tailored_data": resume_data,
        "match_score": match_score,
        "explanation": f"Rule-based analysis: {len(matched)} keywords matched, {len(missing)} gaps found. AI tailoring unavailable — install langchain-groq for full rewriting.",
        "changes": ["No AI rewriting available — showing keyword analysis only."],
        "missing_skills": missing[:10],
        "matched_skills": matched[:10],
    }
