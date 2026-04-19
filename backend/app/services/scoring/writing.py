import re
import spacy

nlp = spacy.load("en_core_web_sm")

def compute_writing_score(text: str) -> tuple[int, str]:
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
        
    # Strong verbs
    strong_verbs_list = [
        "achieved", "built", "created", "designed", "developed", "delivered", "drove", 
        "engineered", "generated", "grew", "implemented", "improved", "increased", 
        "launched", "led", "managed", "optimised", "reduced", "resolved", "scaled", 
        "shipped", "streamlined", "automated", "architected", "deployed", "executed", 
        "integrated", "migrated", "refactored", "spearheaded"
    ]
    strong_verbs = set(strong_verbs_list)
    
    action_bullets = 0
    for b in bullets:
        doc = nlp(b)
        if len(doc) > 0:
            first_token = doc[0]
            if first_token.pos_ == "VERB" and first_token.lemma_.lower() in strong_verbs:
                action_bullets += 1
            elif first_token.text.lower() in strong_verbs:
                action_bullets += 1
                
    action_ratio = (action_bullets / len(bullets)) * 100
    
    # Passive checking
    doc_full = nlp(text)
    sentences = list(doc_full.sents)
    passive_count = 0
    passive_regex = re.compile(r"\b(was|were|been|being)\s+\w+ed\b", re.IGNORECASE)
    
    for sent in sentences:
        has_passive = False
        if passive_regex.search(sent.text):
            has_passive = True
        else:
            for token in sent:
                if token.dep_ in ("auxpass", "nsubjpass"):
                    has_passive = True
                    break
        if has_passive:
            passive_count += 1
            
    passive_score = max(0, 100 - (passive_count / max(len(sentences), 1)) * 200)
    
    # Filler phrases
    fillers = [
        "responsible for", "worked on", "helped with", "assisted in", "involved in", 
        "participated in", "duties included", "contributed to", "exposure to"
    ]
    filler_count = sum(1 for filler in fillers if filler in text.lower())
    filler_score = max(0, 100 - filler_count * 15)
    
    writing_score = round((action_ratio + passive_score + filler_score) / 3)
    
    explanation = f"{action_bullets} of {len(bullets)} bullets use strong action verbs. {passive_count} passive constructions and {filler_count} filler phrases detected."
    
    return int(writing_score), explanation
