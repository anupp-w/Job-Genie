from groq import Groq
from fastapi import HTTPException
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

def call_groq(system: str, prompt: str, max_tokens: int = 2000) -> str:
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            temperature=0.7,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling Groq: {e}")
        raise e

def parse_json(raw: str) -> dict | list:
    try:
        # Remove markdown code blocks if present
        clean = re.sub(r"```json|```", "", raw).strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        # Fallback: try to find the start and end of JSON list or object
        try:
            if "[" in raw and "]" in raw:
                start = raw.find("[")
                end = raw.rfind("]") + 1
                return json.loads(raw[start:end])
            elif "{" in raw and "}" in raw:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                return json.loads(raw[start:end])
        except:
            pass
        raise ValueError("Could not parse JSON from response")

def generate_questions_llm(job_title: str, job_description: str):
    prompt = f"""Job Title: {job_title}
Job Description: {job_description}

Generate exactly 10 interview questions:
- 6 behavioral (STAR-format applicable, specific to this role)
- 4 technical (specific to the exact skills and stack in this JD)

Return ONLY this JSON array, nothing else:
[
  {{"number":1,"type":"behavioral","question":"..."}},
  {{"number":2,"type":"behavioral","question":"..."}},
  {{"number":3,"type":"behavioral","question":"..."}},
  {{"number":4,"type":"behavioral","question":"..."}},
  {{"number":5,"type":"behavioral","question":"..."}},
  {{"number":6,"type":"behavioral","question":"..."}},
  {{"number":7,"type":"technical","question":"..."}},
  {{"number":8,"type":"technical","question":"..."}},
  {{"number":9,"type":"technical","question":"..."}},
  {{"number":10,"type":"technical","question":"..."}}
]"""

    raw = call_groq("You are an expert technical recruiter. Return ONLY valid JSON.", prompt)
    return parse_json(raw)

def evaluate_answer_llm(job_title: str, question_type: str, question: str, user_answer: str):
    prompt = f"""Job Title: {job_title}
Question Type: {question_type}
Question: {question}
Candidate Answer: {user_answer}

Generate:
1. The ideal answer a top candidate would give — written in first person AS the candidate, specific with real examples/numbers/decisions. NOT a rubric. 2-4 sentences.
2. One sentence of feedback on what was strong or missing in this specific answer.
3. 6-8 important keywords a strong answer should contain.

Return ONLY this JSON:
{{"ideal_answer":"...","feedback":"...","keywords":["kw1","kw2","kw3","kw4","kw5","kw6"]}}"""

    raw = call_groq("You are a senior hiring manager. Return ONLY valid JSON.", prompt, max_tokens=1000)
    return parse_json(raw)
