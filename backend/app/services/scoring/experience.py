import re
from datetime import datetime
from typing import Optional

def compute_experience_score(resume_text: str, jd_text: str) -> tuple[Optional[int], str]:
    if not resume_text or not resume_text.strip() or not jd_text or not jd_text.strip():
        return None, "Could not evaluate — resume or JD text is empty."
        
    req_exp_match = re.search(r"(\d+)\+?\s*(?:to\s*\d+\s*)?years?\s*(?:of\s+)?(?:experience|exp)", jd_text, re.IGNORECASE)
    if not req_exp_match:
        return None, "Required years of experience could not be extracted from JD."
        
    required_years = int(req_exp_match.group(1))
    
    current_year = datetime.now().year
    exp_matches = re.findall(r"(\d{4})\s*[-–—to]+\s*(\d{4}|present|current|now)", resume_text, re.IGNORECASE)
    
    calculated_intervals = []
    
    for start_str, end_str in exp_matches:
        start_year = int(start_str)
        if end_str.lower() in ("present", "current", "now"):
            end_year = current_year
        else:
            end_year = int(end_str)
            
        dur = end_year - start_year
        if dur > 0:
            calculated_intervals.append((start_year, end_year))
            
    # Combine overlapping intervals to get actual years of experience
    calculated_intervals.sort()
    merged_intervals = []
    for interval in calculated_intervals:
        if not merged_intervals:
            merged_intervals.append(interval)
        else:
            prev_start, prev_end = merged_intervals[-1]
            curr_start, curr_end = interval
            if curr_start <= prev_end:
                 merged_intervals[-1] = (prev_start, max(prev_end, curr_end))
            else:
                 merged_intervals.append(interval)
                 
    resume_years = sum(end - start for start, end in merged_intervals)
    
    delta = abs(resume_years - required_years)
    experience_score = max(0, round(100 - delta * 12))
    
    explanation = f"Resume shows ~{resume_years} years of experience. Role requires {required_years} years (delta: {delta})."
    
    return int(experience_score), explanation
