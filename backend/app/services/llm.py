import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_NAME = "llama-3.3-70b-versatile"

QUESTION_PROMPT = """You are a senior technical recruiter.
Job Title: {job_title}
Job Description: {job_description}

Generate EXACTLY 10 interview questions based on the job description.
- 6 behavioral (STAR-applicable, relevant to this role)
- 4 technical (specific to the skills and stack in the JD)

Return ONLY a JSON object with a "questions" array. No preamble. No explanation.
{{
  "questions": [
    {{"number": 1, "type": "behavioral", "question": "..."}},
    {{"number": 2, "type": "technical", "question": "...""}}
  ]
}}"""

IDEAL_ANSWER_PROMPT = """You are a senior hiring manager.
Job Title: {job_title}
Question Type: {question_type}
Question: {question}

Generate the ideal answer a top candidate would give. 
Also write one sentence of feedback on what makes a strong answer.

Return ONLY a JSON object. No preamble.
{{"ideal_answer": "...", "feedback": "..."}}"""

def generate_questions(job_title: str, job_description: str):
    prompt = QUESTION_PROMPT.format(job_title=job_title, job_description=job_description)
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=MODEL_NAME,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content).get("questions", [])
    except Exception as e:
        print(f"Error parsing LLM response for questions: {e}")
        return []

def generate_ideal_answer(job_title: str, question_type: str, question: str):
    prompt = IDEAL_ANSWER_PROMPT.format(
        job_title=job_title, 
        question_type=question_type, 
        question=question
    )
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=MODEL_NAME,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error parsing LLM response for ideal answer: {e}")
        return {"ideal_answer": "Ideal answer could not be generated.", "feedback": ""}
