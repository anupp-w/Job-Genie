from typing import Dict, Any, List
import re
import subprocess
import sys
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import spacy
import logging

logger = logging.getLogger(__name__)

# Load spacy once
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    try:
        subprocess.run(
            [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        logger.warning("spaCy model en_core_web_sm unavailable, using blank English pipeline")
        nlp = spacy.blank("en")

class ScoreResult:
    def __init__(self, total_score: float, section_scores: Dict[str, float], matched_keywords: List[str], missing_keywords: List[str]):
        self.total_score = total_score
        self.section_scores = section_scores
        self.matched_keywords = matched_keywords
        self.missing_keywords = missing_keywords

    def to_dict(self):
        return {
            "total": round(self.total_score, 2),
            "sections": {k: round(v, 2) for k, v in self.section_scores.items()},
            "matched_keywords": self.matched_keywords,
            "missing_keywords": self.missing_keywords
        }

class ResumeMatchScorer:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ResumeMatchScorer, cls).__new__(cls)
            try:
                cls._instance.model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                logger.warning(f"SentenceTransformer unavailable, falling back to TF-IDF only: {e}")
                cls._instance.model = None
            cls._instance.tfidf = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        return cls._instance

    @staticmethod
    def _to_text(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return " ".join(ResumeMatchScorer._to_text(v) for v in value)
        if isinstance(value, dict):
            return " ".join(ResumeMatchScorer._to_text(v) for v in value.values())
        return str(value)

    @staticmethod
    def _normalize_skill_items(raw: Any) -> List[str]:
        if raw is None:
            return []
        if isinstance(raw, list):
            return [str(x).strip() for x in raw if str(x).strip()]
        if isinstance(raw, str):
            return [x.strip() for x in re.split(r"[,;\n]", raw) if x.strip()]
        if isinstance(raw, dict):
            return [str(v).strip() for v in raw.values() if str(v).strip()]
        text = str(raw).strip()
        return [text] if text else []

    def _extract_keywords_from_jd(self, jd_text: str) -> List[str]:
        """Extracts technical entities and important nouns using spaCy."""
        doc = nlp(jd_text)
        keywords = set()
        for token in doc:
            if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.text) > 2:
                keywords.add(token.text.lower())
        for ent in doc.ents:
            if ent.label_ in ("ORG", "PRODUCT", "GPE", "NORP"):
                keywords.add(ent.text.lower())
        return sorted(list(keywords))

    def _compute_section_score(self, resume_text: str, jd_text: str) -> float:
        if not resume_text.strip() or not jd_text.strip():
            return 0.0
        try:
            tfidf_vecs = self.tfidf.fit_transform([resume_text, jd_text])
            sparse_sim = float(cosine_similarity(tfidf_vecs[0:1], tfidf_vecs[1:2])[0][0])
            if self.model is not None:
                embeddings = self.model.encode([resume_text, jd_text])
                dense_sim = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
                score = (0.5 * sparse_sim + 0.5 * dense_sim) * 100
            else:
                score = sparse_sim * 100
            return max(0.0, min(100.0, score))
        except Exception as e:
            logger.error(f"Error computing section score: {e}")
            return 0.0

    def score(self, resume_dict: Dict[str, Any], jd_text: str) -> ScoreResult:
        """
        Computes weighted match score using strict 70/30 skill weightage.
        Handles multi-schema resume data (category/items vs name/skills).
        """
        sections = { "skills": "", "experience": "", "summary": "", "education": "" }

        # Flatten sections
        sections["summary"] = f"{self._to_text(resume_dict.get('summary', ''))} {self._to_text(resume_dict.get('objective', ''))}".strip()
        
        # SCHEMA-AGNOSTIC SKILLS FLATTENING
        skills_raw = []
        skills_section = resume_dict.get("skills", [])
        if isinstance(skills_section, dict):
            # Legacy shape: {"technical": "Python, FastAPI", "soft": "Communication"}
            for cat_name, cat_skills in skills_section.items():
                normalized = self._normalize_skill_items(cat_skills)
                if normalized:
                    skills_raw.append(f"{str(cat_name).title()}: {', '.join(normalized)}")
        elif isinstance(skills_section, list):
            for cat in skills_section:
                if isinstance(cat, dict):
                    # Check for both 'name' and 'category'
                    cat_name = cat.get("name") or cat.get("category") or "General"
                    # Check for both 'skills' and 'items'
                    cat_skills = cat.get("skills") or cat.get("items") or cat.get("keywords") or []
                    normalized = self._normalize_skill_items(cat_skills)
                    if normalized:
                        skills_raw.append(f"{cat_name}: {', '.join(normalized)}")
                elif isinstance(cat, str) and cat.strip():
                    skills_raw.append(cat.strip())
        elif isinstance(skills_section, str):
            normalized = self._normalize_skill_items(skills_section)
            if normalized:
                skills_raw.append(f"General: {', '.join(normalized)}")
        
        sections["skills"] = " ".join(skills_raw)
        
        exp_raw = []
        experience_section = resume_dict.get("experience", [])
        if isinstance(experience_section, dict):
            experience_section = [experience_section]
        elif not isinstance(experience_section, list):
            experience_section = []

        for exp in experience_section:
            if isinstance(exp, dict):
                exp_raw.append(
                    f"{self._to_text(exp.get('role'))} at {self._to_text(exp.get('company'))}: {self._to_text(exp.get('description'))}"
                )
            elif isinstance(exp, str) and exp.strip():
                exp_raw.append(exp.strip())
        sections["experience"] = " ".join(exp_raw)
        
        edu_raw = []
        education_section = resume_dict.get("education", [])
        if isinstance(education_section, dict):
            education_section = [education_section]
        elif not isinstance(education_section, list):
            education_section = []

        for edu in education_section:
            if isinstance(edu, dict):
                edu_raw.append(
                    f"{self._to_text(edu.get('degree'))} from {self._to_text(edu.get('school'))} {self._to_text(edu.get('minor', ''))}"
                )
            elif isinstance(edu, str) and edu.strip():
                edu_raw.append(edu.strip())
        sections["education"] = " ".join(edu_raw)

        # Compute scores
        scores = {}
        for key, text in sections.items():
            scores[key] = self._compute_section_score(text, jd_text)

        # Keywords
        jd_keywords = self._extract_keywords_from_jd(jd_text)
        full_resume_text = " ".join(sections.values()).lower()
        matched = []
        missing = []
        for kw in jd_keywords:
            if kw.lower() in full_resume_text:
                matched.append(kw)
            else:
                missing.append(kw)

        # FINAL CALCULATION: 70% Skills, 30% Context
        context_score = (
            scores["experience"] * 0.50 +
            scores["summary"] * 0.35 +
            scores["education"] * 0.15
        )
        total_score = (scores["skills"] * 0.70) + (context_score * 0.30)

        # Fallback for empty skills (ensure it's not a complete penalty if other sections are amazing)
        if not sections["skills"].strip() and total_score < 10:
             total_score = context_score * 0.8 # Give some credit for experience/summary

        return ScoreResult(total_score, scores, matched, missing)
