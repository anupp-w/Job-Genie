import re

def compute_ats_score(text: str) -> tuple[int, str]:
    if not text or not text.strip():
        return 0, "Could not evaluate — resume text is empty."
        
    points = 0
    failures = []
    
    # 1. Text length
    if len(text.strip()) < 100:
        failures.append("Resume text too short to evaluate")
    else:
        points += 12
        
    # 2. Standard sections
    sections = [
        r"\bexperience\b", r"\bwork experience\b", r"\beducation\b", 
        r"\bskills\b", r"\btechnical skills\b", r"\bprojects\b", 
        r"\bcertifications\b", r"\bsummary\b", r"\bobjective\b", r"\bachievements\b"
    ]
    found_sections = sum(1 for sec in sections if re.search(sec, text, re.IGNORECASE))
    if found_sections < 3:
        failures.append("Missing standard sections")
    else:
        points += 12
        
    # 3. No table artifacts
    pipe_count = text.count('|')
    lines = [line.strip() for line in text.split('\n')]
    short_lines_count = sum(1 for line in lines if 1 <= len(line) <= 2)
    
    if pipe_count >= 3 or short_lines_count >= 5:
        failures.append("Contains table artifacts or column bleed")
    else:
        points += 12
        
    # 4. No multi-column bleed
    content_lines = [line for line in text.split('\n') if line.strip()]
    if not content_lines:
        short_line_ratio = 1
    else:
        short_line_ratio = sum(1 for line in content_lines if len(line.strip()) < 40) / len(content_lines)
        
    if short_line_ratio > 0.25:
        failures.append("Possible multi-column bleed detected")
    else:
        points += 12
        
    # 5. Contact info
    has_email = bool(re.search(r"[\w.-]+@[\w.-]+\.\w{2,}", text))
    has_phone = bool(re.search(r"\+?[\d\s\-().]{8,}", text))
    if not has_email or not has_phone:
        failures.append("Missing email or phone number")
    else:
        points += 12
        
    # 6. Non-ASCII overuse
    non_ascii_count = sum(1 for char in text if ord(char) > 127)
    if non_ascii_count / max(len(text), 1) > 0.02:
        failures.append("Overuse of non-ASCII characters")
    else:
        points += 12
        
    # 7. Word count
    word_count = len(text.split())
    if word_count < 200 or word_count > 1200:
        failures.append("Word count outside recommended range")
    else:
        points += 12
        
    # 8. Date consistency
    date_pattern1 = r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b"
    date_pattern2 = r"\d{4}\s*[-–]\s*(\d{4}|present|current)"
    
    dates1 = len(re.findall(date_pattern1, text, re.IGNORECASE))
    dates2 = len(re.findall(date_pattern2, text, re.IGNORECASE))
    
    if dates1 >= 2 or dates2 >= 2:
        points += 12
    else:
        failures.append("Inconsistent or missing dates")
        
    final_score = points
    if final_score == 96:
        final_score = 100
        
    explanation = ", ".join(failures) + "." if failures else "All ATS checks passed."
    
    return int(final_score), explanation
