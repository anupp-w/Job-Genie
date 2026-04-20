import os
import json
import logging
from typing import Any, Dict, Optional, List, TypedDict, Annotated, Literal
from dotenv import load_dotenv

import operator
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# --- Graphite Types ---
class AgentState(TypedDict):
    original_resume: Dict[str, Any]
    job_description: str
    extracted_requirements: Dict[str, Any]
    archaeology_notes: str
    tailored_resume: Dict[str, Any]
    match_score: int
    matched_skills: List[str]
    missing_skills: List[str]
    changes: List[str]
    revision_count: int
    revision_notes: Optional[str]

# --- LLM Factory ---
def _get_model(model_name="llama-3.3-70b-versatile", temperature=0.1):
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise ValueError("GROQ_API_KEY not found in environment")
    return ChatGroq(
        model=model_name,
        api_key=groq_key,
        temperature=temperature
    )

# --- Node 1: JD Forensic Expert ---
async def jd_forensic_analyst(state: AgentState) -> Dict[str, Any]:
    logger.info("--- NODE: JD Forensic Analyst ---")
    model = _get_model()
    
    prompt = f"""You are a JD Forensic Analyst. Analyze the DNA of this job description:
    {state['job_description']}
    
    Extract:
    1. Must-have technical skills.
    2. Preferred/Nice-to-have skills.
    3. Core responsibilities.
    4. Seniority markers (years, titles).
    5. Company culture keywords/vibe.
    
    Return ONLY a JSON object with keys: required_skills, preferred_skills, responsibilities, culture_terms."""
    
    response = await model.ainvoke([HumanMessage(content=prompt)])
    content = response.content.replace("```json", "").replace("```", "").strip()
    return {"extracted_requirements": json.loads(content)}

# --- Node 2: Resume Archeologist ---
async def resume_archeologist(state: AgentState) -> Dict[str, Any]:
    logger.info("--- NODE: Resume Archeologist ---")
    model = _get_model()
    
    prompt = f"""You are a Resume Archeologist. Your job is to scan the candidate's original resume:
    {json.dumps(state['original_resume'])}
    
    Compare it against these job requirements:
    {json.dumps(state['extracted_requirements'])}
    
    Find 'hidden gold': Achievements or experiences in the original resume that are highly relevant but might not be emphasized enough.
    Identify gaps: What is explicitly missing?
    
    Return a brief brief summary of 'Untapped Potential' and 'Gaps'."""
    
    response = await model.ainvoke([HumanMessage(content=prompt)])
    return {"archaeology_notes": response.content}

# --- Node 3: Tactical Writer (The Core Tailor) ---
async def tactical_rewriter(state: AgentState) -> Dict[str, Any]:
    logger.info("--- NODE: Tactical Writer ---")
    model = _get_model()
    
    context = f"""
    JD Analysis: {json.dumps(state['extracted_requirements'])}
    Archeology Notes: {state['archaeology_notes']}
    Revision Notes (if any): {state.get('revision_notes', 'None')}
    """
    
    prompt = f"""You are a Tactical Writer. Rewrite the candidate's resume to align with the JD.
    
    ORIGINAL RESUME:
    {json.dumps(state['original_resume'])}
    
    CONTEXT:
    {context}
    
    STRICT RULES:
    1. DO NOT fabricate experience, dates, or titles.
    2. Rewrite the professional summary to address the JD.
    3. Reframing existing bullet points using JD-relevant terminology.
    4. Reorder skills to prioritize what the JD wants.
    
    OUTPUT:
    Return ONLY a JSON object matching this schema exactly:
    {BUILDER_SCHEMA}"""
    
    response = await model.ainvoke([HumanMessage(content=prompt)])
    content = response.content.replace("```json", "").replace("```", "").strip()
    try:
        return {"tailored_resume": json.loads(content), "revision_count": state.get("revision_count", 0) + 1}
    except Exception:
        # Emergency JSON fix logic
        return {"tailored_resume": state['original_resume'], "revision_count": state.get("revision_count", 0) + 1}

# --- Node 4: ATS Optimization Engineer ---
async def ats_optimizer(state: AgentState) -> Dict[str, Any]:
    logger.info("--- NODE: ATS Optimizer ---")
    model = _get_model()
    
    prompt = f"""You are an ATS Optimization Engineer. Polish the tailored resume for maximum keyword matching.
    
    TAILORED RESUME:
    {json.dumps(state['tailored_resume'])}
    
    TARGET JD:
    {state['job_description']}
    
    Polish the descriptions for 'Action Verbs' and 'Semantic Density'.
    
    Return the finalized tailored resume in JSON format."""
    
    response = await model.ainvoke([HumanMessage(content=prompt)])
    content = response.content.replace("```json", "").replace("```", "").strip()
    try:
        return {"tailored_resume": json.loads(content)}
    except:
        return {"tailored_resume": state['tailored_resume']}

# --- Node 5: Quality Controller (The Auditor) ---
async def quality_controller(state: AgentState) -> Dict[str, Any]:
    logger.info("--- NODE: Quality Controller ---")
    # llama-3.3-70b-versatile is the most reliable stable model for auditing
    model = _get_model(model_name="llama-3.3-70b-versatile")
    
    prompt = f"""You are the Quality Controller. Audit the final result.
    
    ORIGINAL: {json.dumps(state['original_resume'])}
    TAILORED: {json.dumps(state['tailored_resume'])}
    JD: {state['job_description']}
    
    TASKS:
    1. Verify NO hallucination (did they add experience not in the original?).
    2. Calculate 'match_score' (0-100) based on JD requirements.
    3. List 'matched_skills' and 'missing_skills'.
    4. List 'changes' made.
    5. Decide if a REVISION IS NEEDED (if score < 85 and revision count < 2).
    
    Return ONLY a JSON object:
    {{
      "match_score": int,
      "matched_skills": [],
      "missing_skills": [],
      "changes": [],
      "revision_needed": bool,
      "revision_notes": "What to fix"
    }}"""
    
    response = await model.ainvoke([HumanMessage(content=prompt)])
    content = response.content.replace("```json", "").replace("```", "").strip()
    audit = json.loads(content)
    
    return {
        "match_score": audit.get("match_score", 70),
        "matched_skills": audit.get("matched_skills", []),
        "missing_skills": audit.get("missing_skills", []),
        "changes": audit.get("changes", []),
        "revision_notes": audit.get("revision_notes") if audit.get("revision_needed") else None
    }

# --- Routing Logic ---
def should_continue(state: AgentState) -> Literal["rewrite", "end"]:
    if state.get("revision_notes") and state.get("revision_count", 0) < 2:
        return "rewrite"
    return "end"

# --- Graph Assembly ---
def create_tailoring_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("analyst", jd_forensic_analyst)
    workflow.add_node("archeologist", resume_archeologist)
    workflow.add_node("writer", tactical_rewriter)
    workflow.add_node("optimizer", ats_optimizer)
    workflow.add_node("auditor", quality_controller)
    
    workflow.set_entry_point("analyst")
    workflow.add_edge("analyst", "archeologist")
    workflow.add_edge("archeologist", "writer")
    workflow.add_edge("writer", "optimizer")
    workflow.add_edge("optimizer", "auditor")
    
    workflow.add_conditional_edges(
        "auditor",
        should_continue,
        {
            "rewrite": "writer",
            "end": END
        }
    )
    
    return workflow.compile()

# --- Main Entry Point ---
async def tailor_resume_to_jd(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None,
    job_url: Optional[str] = None
) -> Dict[str, Any]:
    """Tailor a resume using a 5-agent cyclic LangGraph."""
    
    current_state: AgentState = {
        "original_resume": resume_data,
        "job_description": job_description or "",
        "extracted_requirements": {},
        "archaeology_notes": "",
        "tailored_resume": {},
        "match_score": 0,
        "matched_skills": [],
        "missing_skills": [],
        "changes": [],
        "revision_count": 0,
        "revision_notes": None
    }
    
    try:
        app = create_tailoring_graph()
        final_state = await app.ainvoke(current_state)
        
        return {
            "tailored_data": final_state["tailored_resume"],
            "match_score": final_state["match_score"],
            "original_match_score": 50, # Placeholder for UI comparison
            "explanation": f"Agents found {len(final_state['matched_skills'])} matches and {len(final_state['missing_skills'])} gaps.",
            "changes": final_state["changes"],
            "missing_skills": final_state["missing_skills"],
            "matched_skills": final_state["matched_skills"],
        }
    except Exception as e:
        logger.error(f"LangGraph failed: {e}")
        import traceback
        traceback.print_exc()
        return _rule_based_fallback(resume_data, job_description or "")

def _rule_based_fallback(resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    # Keeping basic fallback logic from previous version for safety
    return {
        "tailored_data": resume_data,
        "match_score": 0,
        "original_match_score": 0,
        "explanation": "AI agents encountered an error. Showing original resume.",
        "changes": ["Fallback mode activated due to system error."],
        "missing_skills": [],
        "matched_skills": [],
    }
