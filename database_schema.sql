-- Job Genie Database Schema (Exported Accurate Schema)
-- Generated for future reference and knowledge base.

-- Table: course_skills
CREATE TABLE course_skills (
    course_id INTEGER PRIMARY KEY NOT NULL REFERENCES courses(id),
    skill_id INTEGER PRIMARY KEY NOT NULL REFERENCES skills(id)
);

-- Table: courses
CREATE TABLE courses (
    id SERIAL PRIMARY KEY NOT NULL,
    title VARCHAR(200),
    platform VARCHAR(50),
    url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    rating DOUBLE PRECISION
);

-- Table: interview_questions
CREATE TABLE interview_questions (
    id SERIAL PRIMARY KEY NOT NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(50),
    difficulty_level VARCHAR(20),
    associated_skill_id INTEGER REFERENCES skills(id),
    ideal_answer_points TEXT
);

-- Table: interview_responses
CREATE TABLE interview_responses (
    id SERIAL PRIMARY KEY NOT NULL,
    session_id INTEGER REFERENCES interview_sessions(id),
    question_id INTEGER REFERENCES interview_questions(id),
    user_answer TEXT,
    ai_feedback TEXT,
    score INTEGER
);

-- Table: interview_sessions
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY NOT NULL,
    user_id INTEGER REFERENCES users(id),
    job_id INTEGER REFERENCES jobs(id),
    score INTEGER,
    conducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: job_skills
CREATE TABLE job_skills (
    job_id INTEGER PRIMARY KEY NOT NULL REFERENCES jobs(id),
    skill_id INTEGER PRIMARY KEY NOT NULL REFERENCES skills(id),
    importance_weight INTEGER DEFAULT 1
);

-- Table: jobs
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY NOT NULL,
    title VARCHAR(150),
    company VARCHAR(150),
    description TEXT,
    url VARCHAR(500),
    source VARCHAR(50) DEFAULT 'manual'::character varying,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: resume_job_scores
CREATE TABLE resume_job_scores (
    id SERIAL PRIMARY KEY NOT NULL,
    resume_id INTEGER REFERENCES resumes(id),
    job_id INTEGER REFERENCES jobs(id),
    match_score INTEGER,
    missing_keywords JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: resume_sections
CREATE TABLE resume_sections (
    id SERIAL PRIMARY KEY NOT NULL,
    resume_id INTEGER REFERENCES resumes(id),
    section_type VARCHAR(50),
    content TEXT,
    order INTEGER DEFAULT 0
);

-- Table: resume_skills
CREATE TABLE resume_skills (
    resume_id INTEGER PRIMARY KEY NOT NULL REFERENCES resumes(id),
    skill_id INTEGER PRIMARY KEY NOT NULL REFERENCES skills(id)
);

-- Table: resumes
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY NOT NULL,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(100) DEFAULT 'My Resume'::character varying,
    file_path VARCHAR(255),
    parsed_content TEXT,
    ats_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: skills
CREATE TABLE skills (
    id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100),
    category VARCHAR(50)
);

-- Table: smart_sentences
CREATE TABLE smart_sentences (
    id SERIAL PRIMARY KEY NOT NULL,
    skill_id INTEGER REFERENCES skills(id),
    weak_phrase VARCHAR(255),
    strong_phrase VARCHAR(255)
);

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic_url TEXT,
    role VARCHAR(20) DEFAULT 'user'::character varying,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_code VARCHAR,
    reset_code_expire TIMESTAMP
);

