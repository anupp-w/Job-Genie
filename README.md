# JobGenie AI Resume Engineer (Blueprint)

This repository outlines a full-stack AI web app that:
- Parses and engineers resumes.
- Tailors resumes to job descriptions and ensures ATS compatibility.
- Analyzes strengths/weaknesses and skill gaps, then generates an AI roadmap.
- Scores resume quality and job-fit.
- Provides a real-time chatbot that explains changes and answers questions.
- Delivers FAANG-style interview questions for practice with feedback.

The codebase is not scaffolded yet; below is a concrete plan and reference architecture to implement the app quickly.

## Product slices (build order)
1) Resume ingestion & parsing (PDF/DOCX -> structured JSON).  
2) JD ingestion & matcher (embedding-based similarity + keyword coverage).  
3) Tailored resume generator with ATS linting and quality scoring.  
4) Skill-gap analysis + roadmap generator.  
5) Chatbot for “why” explanations and resume Q&A.  
6) Interview prep mode with FAANG-style questions and feedback.  
7) Polished UI, persistence, and auth.

## Suggested stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Zustand/React Query, UploadThing for uploads.
- **Backend**: Next.js API routes or Fastify/FastAPI microservice; LangChain/LlamaIndex orchestration; Redis for caching; Postgres (via Prisma) for persistence.
- **AI**: OpenAI (GPT-4.1/4.1-mini for reasoning + o3-mini for coding feedback); embedding model (text-embedding-3-large/small) stored in Postgres pgvector.
- **RAG**: Vector store (pgvector) for resume sections, job descriptions, and interview Q&A prompts.
- **Observability**: LangSmith/Helicone; Pino logging.

## High-level architecture
- **Web app** calls **API layer** for: parse, tailor, score, analyze, roadmap, chatbot, interview-QA.
- **Pipelines**:
  - Parse: file upload -> text extraction (unstructured/pdfplumber/docx) -> sectionizer -> normalized JSON.
  - Tailor: embedding match to JD -> gap analysis -> rewrite bullets with role-specific verbs/metrics -> ATS lint.
  - Score: heuristics + LLM rubric (clarity, impact, metrics, keyword alignment).
  - Roadmap: map gaps to skills -> learning path (resources, estimated time, milestones).
  - Chatbot: tools for “show diff”, “why change”, “re-run tailoring with constraints”.
  - Interview: generate FAANG-style questions by domain + level; capture answers; critique with rubric.

## Data model (initial)
- `users`: auth id, profile, goals.
- `resumes`: id, user_id, original_file_url, parsed_json, current_version, scores.
- `job_descriptions`: id, user_id, text, metadata (role, level, location, skills).
- `tailored_resumes`: id, resume_id, jd_id, tailored_json, ats_report, fit_score, version.
- `roadmaps`: id, user_id, jd_id?, gaps, steps, resources, milestones.
- `sessions`: chat/interview threads with message history and tool calls.

## Core API surface (representative)
- `POST /api/ingest/resume` (file upload) -> parsed JSON.
- `POST /api/ingest/jd` -> normalized JD + embeddings.
- `POST /api/tailor` -> tailored resume, ATS lint, score, explanations.
- `POST /api/score` -> quality + job-fit scoring only.
- `POST /api/roadmap` -> skill-gap + roadmap.
- `POST /api/chat` -> conversational endpoint with tools (explain diff, regenerate).
- `POST /api/interview/ask` -> question generation + critique on user answer.

## Prompting/agents (outline)
- **Parser agent**: converts raw text to structured sections (summary, experience bullets with STAR, skills, edu).
- **Tailor agent**: uses JD embeddings + rules (metrics, action verbs, seniority cues) to rewrite bullets; returns diff + rationale.
- **ATS lint tool**: checks keyword coverage, formatting issues, contact/location, sections present, length.
- **Scoring rubric**: clarity, impact, metrics, alignment, ATS readiness (0-100 with subscores).
- **Roadmap agent**: gaps -> learning plan with milestones and resources.
- **Interview coach**: generates FAANG-style questions; grades answers using role-specific rubric; suggests improved answer.

## Frontend pages (MVP)
- `/` Landing with CTA.
- `/app` dashboard.
- `/app/resume`: upload, parse view, ATS lint, tailoring controls, diff viewer.
- `/app/job`: JD input, suggestions, target role selection.
- `/app/roadmap`: gaps + generated plan.
- `/app/chat`: universal assistant for “why” explanations and resume Q&A.
- `/app/interview`: question feed, record text/voice, feedback + score trend.

## Implementation notes
- Keep parsing/tailoring stateless; persist snapshots for auditability and user rollbacks.
- Use streaming responses for chatbot and long generations.
- Respect token/length limits; chunk resumes/JDs before embedding.
- Add guardrails: profanity/offensive filters, PII handling, and user data isolation.

## Next steps
- Pick runtime (Next.js fullstack vs. Next.js + FastAPI).
- Scaffold project and set up env vars and providers.
- Implement ingestion + tailoring pipeline end-to-end; stub AI calls for now.
- Add UI shells with mocked data; wire live endpoints progressively.

