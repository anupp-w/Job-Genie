from typing import Dict, Optional, Tuple

def compute_final_score(scores: Dict[str, Optional[int]], has_jd: bool) -> tuple[int, str]:
    weights = {"ats": 0.40, "writing": 0.35, "impact": 0.25}

    final = round(sum(scores[k] * w for k, w in weights.items() if scores.get(k) is not None))
    
    if final >= 85: verdict = "Excellent — this resume is highly competitive"
    elif final >= 75: verdict = "Good — a few targeted fixes away from strong"
    elif final >= 60: verdict = "Promising — meaningful improvements will make a real difference"
    elif final >= 45: verdict = "Needs work — several structural issues to address"
    else: verdict = "Significant revision needed — start with ATS and writing quality"
    
    return final, verdict

def get_label(score: int) -> str:
    if score >= 80: return "Good"
    if score >= 60: return "Fair"
    return "Weak"
