# LearnLens AI - Personalized Learning & Learner Analytics System

🚀 **An AI-powered personalized learning platform that transforms scattered study materials into grounded tutoring, adaptive quizzes, performance analytics, and dynamic study plans — protected by a production-grade multi-tenant authentication system.**

---

## 🌟 Overview & Capabilities

LearnLens AI empowers learners and educators by bridging document comprehension with data-driven metacognition:

- **🔐 Production-Grade Authentication & Multi-Tenant Isolation**:
  - Secure Salted Bcrypt password hashing and signed JWT bearer tokens.
  - Dedicated landing page with interactive Sign In, Sign Up, and 1-Click Demo Login (`demo@learnlens.ai` / `demo123`).
  - **Strict Workspace Isolation**: Every user account has its own isolated partition. Documents, vector chunks, quizzes, test attempts, analytics, and study plans are private and never leaked across accounts.

- **Phase 1: Grounded RAG Tutoring**:
  - Semantic vector search powered by HuggingFace `all-MiniLM-L6-v2` embeddings and pgvector/PostgreSQL.
  - High-precision contextual Q&A via Groq API (LLaMA-3.3-70b-versatile).
  - Exact source attribution, page citations, and verifiable grounding.
  - Built-in RAG Triad evaluation suite (Context Relevance, Groundedness, Answer Relevance).

- **Phase 2: Adaptive Quiz Engine & Learner Analytics**:
  - Automated MCQ generation tailored to uploaded documents with configurable difficulty levels (Easy, Medium, Hard).
  - Instant grading, rationale explanations, and persistent attempt history.
  - Granular topic-level mastery scoring and automated knowledge gap detection.
  - Visual Learner Analytics dashboard with accuracy trends, weak topic alerts, and revision recommendations.

- **Phase 3: Personalized Study Plans & Recommendation Engine**:
  - LLM-orchestrated multi-day study schedule generation prioritized by diagnosed knowledge gaps and learner goals.
  - Structured daily milestones combining Concept Reviews, Practice Drills, and Milestone Checkpoints.
  - Real-time interactive task completion tracking with persistent progress percentage and completion badges.
  - Integrated multi-tab student navigation across Study Materials, Quizzes, Analytics, and Study Plans.

---

## 🛠️ Architecture & Tech Stack

```
LearnLens AI
├── Backend (FastAPI + SQLAlchemy + PostgreSQL / pgvector + PyJWT + Bcrypt)
│   ├── Authentication & Multi-Tenant Authorization Engine
│   ├── RAG Engine (Groq LLaMA-3.3, Sentence-Transformers)
│   ├── Quiz Generation & Grading Service
│   ├── Performance & Knowledge Gap Analytics
│   └── Personalized Study Plan Generator
└── Frontend (React 18 + Vite + Tailwind CSS + Lucide Icons)
    ├── High-Conversion Landing Page & Auth Modal (Sign In, Sign Up, 1-Click Demo)
    ├── Authenticated Workspace with Multi-Tab Navigation
    ├── RAG Q&A Workspace with Document Viewer & Citations
    ├── Interactive Quiz Engine with Instant Feedback
    ├── Real-Time Learner Analytics Dashboard
    └── Multi-Day Study Plan Planner with Task Checklist
```

### Technology Highlights
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL with `pgvector`, PyJWT, Bcrypt, Groq API (`llama-3.3-70b-versatile`), Sentence-Transformers (`all-MiniLM-L6-v2`), PyPDF2 / pdfplumber.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios / Native Fetch Interceptor.
- **Security**: Salted bcrypt password hashing, 24-hour JWT tokens, row-level tenant filtering (`user_id`).

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup`: Register a new user account with encrypted password.
- `POST /api/auth/login`: Authenticate email and password, return signed JWT bearer token.
- `POST /api/auth/demo-login`: 1-Click evaluation login for instant review.
- `GET /api/auth/me`: Fetch authenticated user profile.

### Documents & RAG (User-Isolated)
- `POST /api/upload`: Upload PDF documents and index into user's private workspace.
- `GET /api/documents`: List documents belonging to authenticated user.
- `POST /api/query`: Grounded question answering with source citations from user's materials.
- `GET /api/documents/{doc_id}/chunks`: Retrieve indexed vector chunks for auditing.
- `DELETE /api/documents/{doc_id}`: Remove document and vector chunks.

### Quizzes & Analytics (User-Isolated)
- `POST /api/quizzes/generate`: Generate a customized MCQ quiz from a document.
- `GET /api/quizzes`: List user's quizzes.
- `GET /api/quizzes/{quiz_id}`: Fetch quiz questions and metadata.
- `POST /api/quizzes/{quiz_id}/submit`: Grade quiz submission, record attempt, and update learner mastery.
- `GET /api/analytics/overview`: Comprehensive learner analytics (average score, total attempts, weak topics).

### Personalized Study Plans (User-Isolated)
- `POST /api/study-plans/generate`: Generate an adaptive multi-day study plan targeting diagnosed knowledge gaps.
- `GET /api/study-plans`: Retrieve saved study plans for the learner.
- `GET /api/study-plans/{plan_id}`: Fetch detailed daily tasks and completion milestones.
- `POST /api/study-plans/{plan_id}/tasks/{task_id}/toggle`: Toggle task completion status and recalculate progress.
- `DELETE /api/study-plans/{plan_id}`: Remove a study plan.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL with `pgvector` extension installed
- Groq Cloud API Key (`GROQ_API_KEY`)

### 2. Backend Setup
```bash
cd learnlens-AI/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment (.env)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learnlens_dev
GROQ_API_KEY=your_groq_api_key_here

# Run backend development server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd learnlens-AI/frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

The frontend will be available at `http://localhost:5173` and connected to the backend at `http://127.0.0.1:8000`.

---

## 🧪 Testing & Evaluation

- **Authentication & Multi-Tenant Workspace Verification**:
  ```bash
  python learnlens-AI/backend/test_auth.py
  python learnlens-AI/backend/verify_multi_tenant_isolation.py
  ```
- **RAG Evaluation Suite**:
  ```bash
  python learnlens-AI/backend/evaluate_rag.py
  ```
- **Quiz & Analytics Verification**:
  ```bash
  python learnlens-AI/backend/test_phase2.py
  ```
- **Study Plan & Recommendation Verification**:
  ```bash
  python learnlens-AI/backend/test_phase3.py
  python learnlens-AI/backend/test_study_plan_logic.py
  ```

---

## 🚀 Deployment (Vercel Multi-Service)

LearnLens AI is configured for one-click deployment on Vercel as a multi-service monorepo:
- **Frontend Service**: Vite React Single Page Application (`/(.*)`).
- **Backend Service**: FastAPI backend (`/api/(.*)`, `/health(.*)`, `/docs(.*)`).
- **Embedding Engine**: FastEmbed ONNX Runtime for serverless vector embeddings.

---

## 📄 License
MIT License. Built for personalized, data-driven learning.
