
# Frontend Modular Architecture Plan

## Structure
```text
frontend/
├── app/                  # Routes (Views)
│   ├── login/
│   ├── signup/
│   └── layout.tsx
├── components/           # Reusable UI
│   ├── common/           # Buttons, Inputs
│   └── auth/             # LoginForm, SignupForm
├── services/             # API & Business Logic
│   └── api.ts            # Axios configuration
├── types/                # TypeScript Interfaces
│   ├── user.ts
│   └── auth.ts
└── utils/                # Helpers
```
