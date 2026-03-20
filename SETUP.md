# JobGenie - Full Stack Setup Guide

## Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 13+
- Git

---

## Backend Setup (FastAPI)

### 1. Create Python Virtual Environment
```bash
cd backend
python -m venv .venv

# Activate Virtual Environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt

# For development (optional):
pip install -r requirements-dev.txt
```

### 3. Environment Variables
Create a `.env` file in the `backend` directory:
```
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=uniglobe@123
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jobgenie

# Security
SECRET_KEY=your-super-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (Optional - SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AI
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 4. Database Setup
```bash
# Run Alembic migrations
alembic upgrade head

# Or create tables directly:
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 5. Run Backend Server
```bash
# Development (with auto-reload):
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py entry point:
python main.py
```

Backend will be available at: **http://localhost:8000**
API Docs: **http://localhost:8000/docs**

---

## Frontend Setup (Next.js 16)

### 1. Install Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

### 2. Environment Variables
Create a `.env.local` file in the `frontend` directory:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
# or
yarn dev
```

Frontend will be available at: **http://localhost:3000**

---

## MongoDB Setup (Optional - If using MongoDB)
```bash
# Start MongoDB locally:
mongod

# Or use MongoDB Atlas cloud (update connection string in .env)
```

---

## Database Schema

The project uses PostgreSQL with the following main tables:
- `users` - User accounts & authentication
- `resumes` - Resume files & parsed data
- `resume_sections` - Structured resume sections
- `jobs` - Job descriptions
- `skills` - Skill inventory
- `courses` - Learning resources
- `interview_questions` - Interview Q&A
- `interview_sessions` - User interview attempts
- `interview_responses` - Answers & feedback

---

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/token` - Login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Complete password reset

### Users
- `POST /api/v1/users/signup` - Register account
- `GET /api/v1/users/me` - Get current user
- `PATCH /api/v1/users/me` - Update profile

### Resumes
- `POST /api/v1/resumes` - Create resume
- `GET /api/v1/resumes` - List resumes
- `GET /api/v1/resumes/{id}` - Get resume details
- `POST /api/v1/resumes/parse` - Parse PDF resume

### Tailoring
- `POST /api/v1/tailor` - Tailor resume to job description

### Analysis
- `GET /api/v1/analysis/skill-gap/{resume_id}/{job_id}` - Skill gap analysis
- `GET /api/v1/analysis/roadmap/{resume_id}/{job_id}` - Learning roadmap

---

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Authentication**: JWT (python-jose)
- **AI/LLM**: CrewAI + LangChain + OpenAI GPT-4
- **File Processing**: pypdf, pdfplumber
- **Server**: Uvicorn

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + shadcn/ui
- **HTTP Client**: Axios
- **Charts**: Recharts
- **3D Graphics**: Three.js + React Three Fiber

---

## Common Commands

### Backend
```bash
# Start dev server
uvicorn app.main:app --reload

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Format code
black .

# Lint
flake8 .
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

---

## Troubleshooting

### PostgreSQL Connection Error
- Ensure PostgreSQL is running: `psql -U postgres`
- Check credentials in `.env` match your local setup
- Verify database exists: `createdb jobgenie`

### Python Dependency Issues
- Delete `.venv` and reinstall: `rm -rf .venv && python -m venv .venv`
- Update pip: `pip install --upgrade pip`

### Frontend Port 3000 Already in Use
```bash
# Kill process on port 3000 (macOS/Linux)
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows - Use Task Manager or:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### OpenAI API Key Error
- Ensure `OPENAI_API_KEY` is set in backend `.env`
- Check key is valid at https://platform.openai.com/api-keys

---

## Development Workflow

1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** to backend and/or frontend
3. **Test locally** on `localhost:8000` and `localhost:3000`
4. **Run linting**: `black .` and `npm run lint`
5. **Commit and push**: `git push origin feature/your-feature`
6. **Create pull request**

---

## Deployment

### Backend (Heroku/Railway/AWS)
```bash
# Build Docker image
docker build -t jobgenie-backend .

# Run container
docker run -p 8000:8000 jobgenie-backend
```

### Frontend (Vercel/Netlify)
```bash
# Deploy to Vercel:
vercel

# Or build and deploy manually:
npm run build
```

---

## Support & Documentation

- FastAPI Docs: http://localhost:8000/docs
- Next.js Docs: https://nextjs.org/docs
- CrewAI: https://github.com/joaomdmoura/CrewAI
- SQLAlchemy: https://docs.sqlalchemy.org/

---

**Last Updated**: March 2026
