import re

def compute_impact_score(text: str) -> tuple[int, str]:
    if not text or not text.strip():
        return 0, "Could not evaluate — resume text is empty."
        
    lines = text.split('\n')
    bullets = []
    
    # Extract bullets
    for line in lines:
        sline = line.strip()
        if not sline: continue
        if sline.startswith('-') or sline.startswith('•') or sline.startswith('*'):
            bullets.append(sline[1:].strip())
        elif line.startswith('  ') and len(sline) > 0 and sline[0].isupper():
            bullets.append(sline)
            
    if not bullets:
        return 0, "No standard bullet points detected to analyze."
        
    impactful = 0
    impact_patterns = [
        r"\d+",
        r"\d+\s*%",
        r"[$£€₹]\s*\d+|[\d,]+\s*(million|billion|USD|GBP|EUR|k\b)",
        r"\d+[xX]\s|\d+\s*times",
        r"from\s+\d+\s+to\s+\d+"
    ]
    combined_regex = re.compile("|".join(impact_patterns), re.IGNORECASE)
    
    for b in bullets:
        if combined_regex.search(b):
            impactful += 1
            
    impact_score = round((impactful / len(bullets)) * 100)
    
    explanation = f"{impactful} of {len(bullets)} bullets contain a quantified result. Target is 60%+ for a strong score."
    
    return int(min(impact_score, 100)), explanation
