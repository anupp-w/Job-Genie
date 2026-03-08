
# FastAPI MVC Refactor Plan

## Structure
```text
backend/
└── app/
    ├── __init__.py
    ├── main.py              # Entry point
    ├── core/
    │   ├── config.py       # Env vars & Settings
    │   └── security.py     # JWT & Password Hashing
    ├── db/
    │   ├── base.py         # SQLAlchemy Base
    │   └── session.py      # DB Connection
    ├── models/             # Database Tables
    │   ├── __init__.py
    │   ├── user.py
    │   ├── resume.py
    │   └── ...
    ├── schemas/            # Pydantic Models
    │   ├── __init__.py
    │   ├── user.py
    │   └── token.py
    ├── crud/               # DB Operations
    │   ├── crud_user.py
    │   └── ...
    └── api/                # Routes (Controllers)
        └── v1/
            ├── api.py      # Router Aggregator
            └── endpoints/
                ├── auth.py
                └── users.py
```

## Specific Requirements
- **Interview Coach**:
  - Total Questions: 10
  - Distribution: 6 Behavioral (Non-Technical) + 4 Technical
  - Implementation: Logic should be in `api/v1/endpoints/interview.py` (to be created) using `InterviewQuestion` model and `category` field.
