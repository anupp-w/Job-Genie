from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import spacy

embeddings = OpenAIEmbeddings()
nlp = spacy.load("en_core_web_sm")

def compute_job_match_score(resume_text: str, jd_text: str) -> tuple[int, list[str], str]:
    if not resume_text or not resume_text.strip() or not jd_text or not jd_text.strip():
        return 0, [], "Could not evaluate — resume or JD text is empty."
        
    try:
        resume_vec = embeddings.embed_query(resume_text)
        jd_vec = embeddings.embed_query(jd_text)
        similarity = cosine_similarity([resume_vec], [jd_vec])[0][0]
        job_match_score = round(float(similarity) * 100)
    except Exception as e:
        print(f"Error computing JD match: {e}")
        return 0, [], "Error computing job match similarity."
        
    # Missing keywords
    doc_jd = nlp(jd_text)
    jd_keywords = set()
    for token in doc_jd:
        if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.text) > 3:
            jd_keywords.add(token.text.lower())
            
    resume_text_lower = resume_text.lower()
    missing_keywords = []
    
    for kw in jd_keywords:
        if kw not in resume_text_lower:
            missing_keywords.append(kw)
            
    # Sort or just take top 5 (currently arbitrary order from set)
    missing_keywords = list(missing_keywords)[:5]
                
    explanation = f"Semantic similarity with the job description is {job_match_score}/100."
    if missing_keywords:
         explanation += f" Top missing terms: {', '.join(missing_keywords)}."
         
    return job_match_score, missing_keywords, explanation
