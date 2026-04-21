import os
import json
import logging
import operator
from typing import Annotated, Any, Dict, List, TypedDict
from datetime import datetime
from dotenv import load_dotenv
from pydantic import SecretStr

# Prevent transformers from importing torch in this process (avoids WinError 1455 on low pagefile).
os.environ.setdefault("TRANSFORMERS_NO_TORCH", "1")

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from app.services.scoring_service import ResumeMatchScorer

logger = logging.getLogger(__name__)

# Ensure .env values are available even when using legacy backend entrypoints.
load_dotenv()


def get_groq_api_key() -> str:
    """Return GROQ API key or raise a clear configuration error."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Add it to backend/.env or your environment variables."
        )
    return api_key


def create_groq_client(temperature: float) -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=temperature,
        api_key=SecretStr(get_groq_api_key()),
    )

# --- State Definitions ---
class TailoringState(TypedDict):
    original_resume: dict
    current_resume: dict
    jd_text: str
    jd_parsed: dict
    baseline_score: dict
    current_score: dict
    score_history: Annotated[List[float], operator.add]
    iteration: int
    # State key to collect parallel outputs
    tailored_sections: Annotated[dict, operator.ior]
    final_resume: dict
    stop_reason: str

# --- Helper: Robust JSON Extraction ---
def extract_json(text: str) -> Any:
    try:
        # Step 1: Remove common LLM conversational fluff
        text = text.strip()
        if text.startswith("Here is the updated JSON:"):
            text = text.replace("Here is the updated JSON:", "").strip()
        
        # Step 2: Try finding markdown code block
        if "```json" in text:
            content = text.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        elif "```" in text:
            content = text.split("```")[1].split("```")[0].strip()
            return json.loads(content)
            
        # Step 3: Try raw braces
        start = text.find("[") if text.strip().startswith("[") else text.find("{")
        end = text.rfind("]") + 1 if text.strip().startswith("[") else text.rfind("}") + 1
        if start != -1 and end != 0:
            return json.loads(text[start:end])
            
        return json.loads(text)
    except Exception as e:
        logger.error(f"FATAL: JSON extraction failed. Content: {text[:200]}... Error: {e}")
        return None


def normalize_llm_content(content: Any) -> str:
    """Normalize provider-specific content payloads into plain text for parsers."""
    if isinstance(content, str):
        return content
    try:
        return json.dumps(content)
    except Exception:
        return str(content)


def coerce_multiline_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        lines: List[str] = []
        for item in value:
            text = coerce_multiline_text(item).strip()
            if text:
                lines.append(text)
        return "\n".join(lines)
    if isinstance(value, dict):
        for key in ("description", "text", "bullet", "content"):
            if key in value:
                return coerce_multiline_text(value.get(key))
        parts = [coerce_multiline_text(v).strip() for v in value.values()]
        parts = [p for p in parts if p]
        return "\n".join(parts)
    return "" if value is None else str(value)


def normalize_resume_for_ui(resume: dict) -> dict:
    normalized = dict(resume or {})

    # Normalize bullets to multiline strings expected by the preview renderer.
    for section in ("experience", "projects", "research", "leadership"):
        items = normalized.get(section, [])
        if isinstance(items, dict):
            items = [items]
        if not isinstance(items, list):
            items = []

        fixed_items = []
        for item in items:
            if isinstance(item, dict):
                entry = dict(item)
                if "description" in entry:
                    entry["description"] = coerce_multiline_text(entry.get("description"))
                fixed_items.append(entry)
            elif isinstance(item, str) and item.strip():
                fixed_items.append({"description": item.strip()})
        normalized[section] = fixed_items

    # Normalize skills to list[{name, skills[]}] for frontend compatibility.
    skills = normalized.get("skills", [])
    normalized_skills = []
    if isinstance(skills, dict):
        for name, value in skills.items():
            if isinstance(value, list):
                items = [str(v).strip() for v in value if str(v).strip()]
            elif isinstance(value, str):
                items = [v.strip() for v in value.replace(";", ",").split(",") if v.strip()]
            else:
                text = str(value).strip()
                items = [text] if text else []
            if items:
                normalized_skills.append({"name": str(name).title(), "skills": items})
    elif isinstance(skills, list):
        for item in skills:
            if isinstance(item, dict):
                name = str(item.get("name") or item.get("category") or "General")
                values = item.get("skills") or item.get("items") or []
                if isinstance(values, list):
                    skill_items = [str(v).strip() for v in values if str(v).strip()]
                elif isinstance(values, str):
                    skill_items = [v.strip() for v in values.replace(";", ",").split(",") if v.strip()]
                else:
                    text = str(values).strip()
                    skill_items = [text] if text else []
                normalized_skills.append({"name": name, "skills": skill_items})
            elif isinstance(item, str) and item.strip():
                normalized_skills.append({"name": "General", "skills": [item.strip()]})
    normalized["skills"] = normalized_skills

    return normalized

# --- Helper: Semantic Constraint Guard ---
def constraint_guard(original_resume: dict, tailored_sections: dict) -> dict:
    """Pass-through guard: Allows aggressive tailoring by the LLM without strict keyword grounding."""
    # User requested to remove guardrails to maximize ATS score matching
    checked = {}

    if "skills" in tailored_sections and tailored_sections["skills"]:
        checked["skills"] = tailored_sections["skills"]
    if "experience" in tailored_sections and tailored_sections["experience"]:
        checked["experience"] = tailored_sections["experience"]
    if "summary" in tailored_sections and tailored_sections["summary"]:
        checked["summary"] = tailored_sections["summary"]
    
    return checked

# --- Agent Nodes ---

def jd_parser_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: JD Parser ---")
    llm = create_groq_client(temperature=0)
    prompt = f"""Extract core technical requirements and soft skills from this Job Description.
    Return a JSON object with keys: 'hard_skills', 'soft_skills', 'primary_responsibilities'.
    JD: {state['jd_text']}"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    parsed = extract_json(normalize_llm_content(response.content)) or {}
    return {"jd_parsed": parsed}

async def skills_mapper_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: Skills Mapper ---")
    llm = create_groq_client(temperature=0.3)
    prompt = f"""You are an ATS Keyword Optimization Expert.
    Task: Rewrite the 'skills' JSON to maximize match for the JD.
    
    REQUIREMENTS FOR JD: {json.dumps(state['jd_parsed'].get('hard_skills', []))}
    CURRENT SKILLS: {json.dumps(state['current_resume'].get('skills', []))}
    RESUME BACKGROUND: {state['current_resume'].get('experience', [])}

    RULES:
    1. MAINTAIN THE SAME FORMAT: List of objects with 'name' (category) and 'skills' (array).
    2. Aggressively add relevant keywords from the JD to ensure maximum ATS matching.
    3. Remove fluff.
    
    Return ONLY the new 'skills' JSON array."""
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    result = extract_json(normalize_llm_content(response.content))
    if not result:
        logger.warning("Skills Mapper failed to return valid JSON - using original.")
        result = state['current_resume'].get('skills', [])
    return {"tailored_sections": {"skills": result}}

async def experience_rewriter_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: Experience Rewriter ---")
    llm = create_groq_client(temperature=0.4)
    prompt = f"""You are a High-Performance Career Coach.
    Task: Rewrite the 'experience' section to highlight impact and perfectly match the JD responsibilities.
    
    JD TARGET RESPONSIBILITIES: {json.dumps(state['jd_parsed'].get('primary_responsibilities', []))}
    CURRENT EXPERIENCE: {json.dumps(state['current_resume'].get('experience', []))}

    RULES:
    1. EXTREMELY IMPORTANT: USE THE STAR METHOD for bullets.
    2. Aggressively incorporate JD keywords, responsibilities, and technologies into the bullets to maximize the ATS match score.
    3. KEEP titles, dates, and companies IDENTICAL.
    4. REWRITE the 'description' field specifically.
    
    Return ONLY the updated 'experience' JSON array."""
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    result = extract_json(normalize_llm_content(response.content))
    if not result:
        logger.warning("Experience Rewriter failed to return valid JSON - using original.")
        result = state['current_resume'].get('experience', [])
    return {"tailored_sections": {"experience": result}}

async def summary_writer_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: Summary Writer ---")
    llm = create_groq_client(temperature=0.4)
    prompt = f"""Write a compelling 3-sentence summary for this role.
    Target Job: {state['jd_text'][:300]}
    Candidate Bio: {json.dumps(state['current_resume'].get('summary', ''))}
    Experience Snippet: {json.dumps(state['current_resume'].get('experience', [])[:2])}
    
    Return ONLY the summary string."""
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    content_text = normalize_llm_content(response.content)
    content = content_text.strip().split("\n")[-1].replace("\"", "") # Get last line to avoid chat fluff
    return {"tailored_sections": {"summary": content}}

# --- Assembler Node ---
def assembler_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: Assembler ---")
    # merge the sections collected in tailored_sections
    sections = state.get("tailored_sections", {})
    
    # Run guard
    checked_sections = constraint_guard(state["original_resume"], sections)
    
    new_resume = state["current_resume"].copy()
    
    # FORCED ASSIGNMENT - LOGGING
    if "skills" in checked_sections and checked_sections["skills"]:
        new_resume["skills"] = checked_sections["skills"]
        logger.info("Assembler: Updated Skills")
    
    if "experience" in checked_sections and checked_sections["experience"]:
        new_resume["experience"] = checked_sections["experience"]
        logger.info("Assembler: Updated Experience")
        
    if "summary" in checked_sections and checked_sections["summary"]:
        new_resume["summary"] = checked_sections["summary"]
        logger.info("Assembler: Updated Summary")
    
    normalized_resume = normalize_resume_for_ui(new_resume)

    return {
        "current_resume": normalized_resume,
        "final_resume": normalized_resume,
        "iteration": state["iteration"] + 1,
        # CLEAR the update buffer for next loop
        "tailored_sections": {} 
    }

def scorer_node(state: TailoringState) -> Dict[str, Any]:
    logger.info("--- NODE: Scorer ---")
    scorer = ResumeMatchScorer()
    res = scorer.score(state["current_resume"], state["jd_text"])
    logger.info(f"Iteration {state['iteration']} Score: {res.total_score}")
    return {
        "current_score": res.to_dict(),
        "score_history": [res.total_score]
    }

def should_continue(state: TailoringState):
    # FORCE 2 ITERATIONS as requested
    if state["iteration"] < 2:
        return "rewrite"
    
    if state["current_score"]["total"] >= 80 or state["iteration"] >= 4:
        state["stop_reason"] = "optimized"
        return "end"
    
    # Check for improvement
    if len(state["score_history"]) >= 2:
        if state["score_history"][-1] <= state["score_history"][-2]:
            state["stop_reason"] = "plateau"
            return "end"
            
    return "rewrite"

# --- Graph Construction ---
def create_tailoring_graph():
    workflow = StateGraph(TailoringState)
    
    workflow.add_node("jd_parser", jd_parser_node)
    workflow.add_node("skills_mapper", skills_mapper_node)
    workflow.add_node("experience_rewriter", experience_rewriter_node)
    workflow.add_node("summary_writer", summary_writer_node)
    workflow.add_node("assembler", assembler_node)
    workflow.add_node("scorer", scorer_node)
    
    workflow.set_entry_point("jd_parser")
    
    workflow.add_edge("jd_parser", "skills_mapper")
    workflow.add_edge("jd_parser", "experience_rewriter")
    workflow.add_edge("jd_parser", "summary_writer")
    
    # Convergence at Assembler
    workflow.add_edge("skills_mapper", "assembler")
    workflow.add_edge("experience_rewriter", "assembler")
    workflow.add_edge("summary_writer", "assembler")
    
    workflow.add_edge("assembler", "scorer")
    
    workflow.add_conditional_edges("scorer", should_continue, {"rewrite": "skills_mapper", "end": END})
    
    return workflow.compile()

async def tailor_resume(resume_dict: dict, jd_text: str) -> dict:
    resume_dict = normalize_resume_for_ui(resume_dict)
    scorer = ResumeMatchScorer()
    baseline = scorer.score(resume_dict, jd_text)
    
    initial_state: TailoringState = {
        "original_resume": resume_dict,
        "current_resume": resume_dict,
        "jd_text": jd_text,
        "jd_parsed": {},
        "baseline_score": baseline.to_dict(),
        "current_score": baseline.to_dict(),
        "score_history": [baseline.total_score],
        "iteration": 0,
        "tailored_sections": {},
        "final_resume": resume_dict,
        "stop_reason": "ongoing"
    }
    
    app = create_tailoring_graph()
    final_state = await app.ainvoke(initial_state)
    
    from difflib import unified_diff
    def get_diff(old, new):
        return list(unified_diff(
            json.dumps(old, indent=2).splitlines() if isinstance(old, (dict, list)) else str(old).splitlines(),
            json.dumps(new, indent=2).splitlines() if isinstance(new, (dict, list)) else str(new).splitlines()
        ))

    comparison = {
        "score_improvement": round(final_state["current_score"]["total"] - final_state["baseline_score"]["total"], 2),
        "section_improvements": {
            k: round(final_state["current_score"]["sections"][k] - final_state["baseline_score"]["sections"][k], 2)
            for k in final_state["current_score"]["sections"]
        },
        "added_keywords": list(set(final_state["current_score"]["matched_keywords"]) - set(final_state["baseline_score"]["matched_keywords"])),
        "still_missing_keywords": final_state["current_score"]["missing_keywords"],
        "section_diffs": {} # Not needed by UI anymore as per user request
    }
    
    return {
        "tailored_data": final_state["final_resume"],
        "match_score": final_state["current_score"]["total"],
        "original_match_score": final_state["baseline_score"]["total"],
        "explanation": f"Optimization finished after {final_state['iteration']} cycles.",
        "changes": [],
        "missing_skills": comparison["still_missing_keywords"],
        "matched_skills": final_state["current_score"]["matched_keywords"],
        "iterations_run": final_state["iteration"],
        "stop_reason": final_state.get("stop_reason", "optimized"),
        "comparison": comparison,
        "section_scores": final_state["current_score"]["sections"]
    }


async def tailor_resume_to_jd(resume_dict: dict, jd_text: str) -> dict:
    """Backward-compatible alias for legacy callers."""
    return await tailor_resume(resume_dict, jd_text)
