from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

nlp = spacy.load("en_core_web_sm")

def compute_job_match_score(resume_text: str, jd_text: str) -> tuple[int, list[str], list[str], str]:
    if not resume_text or not resume_text.strip() or not jd_text or not jd_text.strip():
        return 0, [], [], "Could not evaluate — resume or JD text is empty."

    # ── Semantic similarity via TF-IDF + Cosine ──
    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf = vectorizer.fit_transform([resume_text, jd_text])
        similarity = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        job_match_score = min(100, max(0, round(float(similarity) * 100)))
    except Exception as e:
        print(f"Error computing similarity: {e}")
        job_match_score = 0

    # ── Keyword gap analysis via spaCy (always runs) ──
    doc_jd = nlp(jd_text)
    jd_keywords = set()
    for token in doc_jd:
        if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.text) > 3:
            jd_keywords.add(token.text.lower())

    resume_text_lower = resume_text.lower()
    missing_keywords = []
    found_keywords = []

    for kw in jd_keywords:
        if kw in resume_text_lower:
            found_keywords.append(kw)
        else:
            missing_keywords.append(kw)

    missing_keywords = sorted(missing_keywords)[:10]
    found_keywords = sorted(found_keywords)[:15]

    # ── Build explanation ──
    explanation = f"Semantic similarity: {job_match_score}%."
    if missing_keywords:
        explanation += f" Missing: {', '.join(missing_keywords)}."
    if found_keywords:
        explanation += f" Matched: {len(found_keywords)} keywords."

    return job_match_score, missing_keywords, found_keywords, explanation
