import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging
import re

# Configure logging
logger = logging.getLogger(__name__)

# Download NLTK data (run once)
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('tokenizers/punkt_tab')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    logger.info("Downloading NLTK data...")
    nltk.download('punkt')
    nltk.download('punkt_tab')
    nltk.download('stopwords')
    nltk.download('wordnet')

def score_answer_nlp(user_answer: str, ideal_answer: str, keywords: list[str], question_type: str) -> dict:
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))
    
    # Preprocessing
    def clean_text(text: str) -> str:
        if not text: return ""
        tokens = word_tokenize(text.lower())
        return ' '.join([lemmatizer.lemmatize(w) for w in tokens if w.isalpha() and w not in stop_words])

    processed_user = clean_text(user_answer)
    processed_ideal = clean_text(ideal_answer)
    processed_kws = [lemmatizer.lemmatize(k.lower()) for k in keywords] if keywords else []

    # NLP Metric 1: Keyword Coverage (with lemmatization)
    matched = []
    # Check both raw and processed for better matching
    user_words = set(processed_user.split()) | set(user_answer.lower().split())
    
    for k in processed_kws:
        if k in user_words:
            matched.append(k)
        # Fallback: simple string match if lemmatization failed on specific terms
        elif k in processed_user:
            matched.append(k)
    
    kw_score = round((len(matched) / len(keywords)) * 10, 1) if keywords and len(keywords) > 0 else 5.0

    # NLP Metric 2: TF-IDF Cosine Similarity
    sem_score = 0.0
    if processed_user and processed_ideal:
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([processed_user, processed_ideal])
            # tfidf_matrix is (2, vocab_size). 
            # We want similarity between row 0 and row 1.
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            # Similarity is usually 0-1, so scale to 0-10. 
            # A similarity of 0.4+ is generally good for short text, so we'll be generous with scaling.
            sem_score = min(round(cosine_sim * 16, 1), 10.0)
        except ValueError:
            # Handle empty vocab or other tfidf errors (e.g. stop words removed everything)
            sem_score = 0.0

    # NLP Metric 3: Length (Basic)
    try:
        word_count = len(word_tokenize(user_answer))
    except:
        word_count = len(user_answer.split())
        
    len_score = min(round((word_count / 80) * 10, 1), 10.0)

    if question_type == "behavioral":
        w = {"s": 0.55, "k": 0.25, "l": 0.20}
    else:
        w = {"s": 0.40, "k": 0.45, "l": 0.15}

    final = float(round(w["s"] * sem_score + w["k"] * kw_score + w["l"] * len_score, 1))

    return {
        "final_score": float(final),
        "semantic_score": float(sem_score),
        "keyword_score": float(kw_score),
        "length_score": float(len_score),
        "matched_keywords": matched,
        "missing_keywords": [k for k in processed_kws if k not in matched],
    }
