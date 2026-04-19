from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re

# Load model once at startup - will download ~80MB on first run
model = SentenceTransformer('all-MiniLM-L6-v2')

WEIGHTS = {
    'behavioral': { 'semantic': 0.55, 'keyword': 0.25, 'length': 0.20 },
    'technical':  { 'semantic': 0.40, 'keyword': 0.45, 'length': 0.15 }
}

def semantic_score(ideal_answer: str, user_answer: str) -> float:
    if not user_answer or not user_answer.strip():
        return 0.0
    embeddings = model.encode([ideal_answer, user_answer])
    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    similarity = max(float(similarity), 0.0)  # clamp negatives
    return round(similarity * 10, 2)           # scale to 0-10

def extract_tfidf_keywords(job_description: str, question: str, top_n: int = 12):
    corpus = [job_description, question]
    vectorizer = TfidfVectorizer(
        stop_words='english',
        ngram_range=(1, 2),
        max_features=100
    )
    vectorizer.fit(corpus)
    tfidf_matrix = vectorizer.transform(corpus)
    scores = np.asarray(tfidf_matrix.sum(axis=0)).flatten()
    top_indices = scores.argsort()[::-1][:top_n]
    return [vectorizer.get_feature_names_out()[i] for i in top_indices]

def keyword_coverage_score(keywords, user_answer):
    if not keywords:
        return 5.0, [], []
    answer_clean = re.sub(r'[^\w\s]', ' ', user_answer.lower())
    matched = [kw for kw in keywords if kw.lower() in answer_clean]
    missing = [kw for kw in keywords if kw.lower() not in answer_clean]
    coverage = len(matched) / len(keywords)
    return round(coverage * 10, 2), matched, missing

def hybrid_score(ideal_answer: str, user_answer: str, job_description: str, question: str, question_type: str):
    q_type = question_type.lower() if question_type else 'behavioral'
    if q_type not in WEIGHTS:
        q_type = 'behavioral'

    s = semantic_score(ideal_answer, user_answer)
    keywords = extract_tfidf_keywords(job_description, question)
    k, matched, missing = keyword_coverage_score(keywords, user_answer)
    
    # Length score proxy: assume 80 words is an optimal short concise answer
    word_count = len(user_answer.split())
    l = min(word_count / 80, 1.0) * 10
    
    w = WEIGHTS[q_type]
    final = w['semantic']*s + w['keyword']*k + w['length']*l
    return {
        'final_score': round(final, 1),
        'semantic_score': s, 
        'keyword_score': k, 
        'length_score': round(l, 2),
        'matched_keywords': matched, 
        'missing_keywords': missing
    }
