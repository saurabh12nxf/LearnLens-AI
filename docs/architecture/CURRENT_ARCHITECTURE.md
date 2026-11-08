# LearnLens AI - Current System Architecture

## 1. System Overview
LearnLens AI is an adaptive, multi-tenant AI tutoring and study planning platform designed to transform static study materials (PDF lecture slides, textbooks, course notes) into an interactive, grounded learning ecosystem.

Unlike generic conversational RAG systems, LearnLens AI enforces a **closed-loop pedagogical cycle**:
1. **Document Ingestion & Grounding**: Parses PDFs and indexes content at the page level.
2. **Attributed RAG Querying**: Retrieves source-grounded excerpts with exact page citations (`[Page X]`).
3. **Adaptive Quiz Generation**: Formulates concept-tagged multiple-choice quizzes with detailed rationales.
4. **Knowledge Gap Analytics**: Continuously tracks mastery percentages per concept, automatically detecting weak areas (< 60% accuracy).
5. **Personalized Study Planner**: Synthesizes diagnostic gap analysis into actionable, multi-day study roadmaps with task checklists and direct citations.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["Student / Client Browser"]
    Frontend["React + Vite Single Page Application"]
    API["FastAPI REST Backend (Vercel Serverless)"]
    DB[(Neon Cloud PostgreSQL + pgvector)]
    LLM["Groq API (Qwen 3.8-27b)"]
    Embedder["FastEmbed (ONNX all-MiniLM-L6-v2)"]

    User <-->|HTTPS / REST / JWT| Frontend
    Frontend <-->|REST Endpoints /api/*| API

    subgraph "Backend Services"
        AuthSvc["Auth Service (JWT / PBKDF2)"]
        RAGSvc["RAG Service (PyMuPDF & Citations)"]
        QuizSvc["Quiz Service (Adaptive MCQs)"]
        AnalyticsSvc["Analytics Service (Gap Diagnosis)"]
        PlanSvc["Study Plan Service (Roadmaps)"]
        VecStore["Vector Store (Cosine Distance)"]
    end

    API --> AuthSvc
    API --> RAGSvc
    API --> QuizSvc
    API --> AnalyticsSvc
    API --> PlanSvc

    RAGSvc --> Embedder
    VecStore --> Embedder
    RAGSvc --> VecStore
    RAGSvc --> LLM
    QuizSvc --> LLM
    PlanSvc --> LLM

    AuthSvc <--> DB
    VecStore <--> DB
    QuizSvc <--> DB
    AnalyticsSvc <--> DB
    PlanSvc <--> DB
```

---

## 3. Technology Stack & Key Decisions

| Layer | Component | Choice | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Framework | React 18 + Vite | Fast HMR, minimal bundle overhead, component-driven UI. |
| **Frontend UI** | Styling | TailwindCSS + Lucide Icons | Responsive modern design with dark-mode aesthetic. |
| **Backend** | Framework | FastAPI (Python 3.12) | Asynchronous request handling, Pydantic validation, OpenAPI documentation. |
| **Database** | RDBMS & Vector Store | PostgreSQL 16 + `pgvector` (Neon) | Single ACID operational database for relational multi-tenant entities and high-dimensional vector search. |
| **Connection Pooling** | Pool Manager | SQLAlchemy `NullPool` | Optimized for serverless execution where connections must not remain open across frozen lambda instances. |
| **Embedding Engine** | Vector Embedder | FastEmbed (`all-MiniLM-L6-v2` ONNX) | Lightweight (~30MB runtime), zero PyTorch/CUDA dependencies, sub-50ms embedding generation. |
| **LLM Provider** | Inference API | Groq Cloud (`qwen/qwen3.8-27b`) | High token throughput (>300 tokens/sec), low time-to-first-token, accurate structured JSON outputs. |
| **Document Processing**| PDF Parser | PyMuPDF (`fitz`) | High-speed text extraction preserving page boundaries and block geometry. |

---

## 4. Multi-Tenant Data Model

Every user-facing data record is scoped to a specific `user_id`.

```mermaid
erDiagram
    USERS ||--o{ LEARNING_RESOURCES : owns
    USERS ||--o{ QUIZZES : owns
    USERS ||--o{ QUIZ_ATTEMPTS : submits
    USERS ||--o{ STUDY_PLANS : follows
    LEARNING_RESOURCES ||--o{ DOCUMENT_CHUNKS : contains
    LEARNING_RESOURCES ||--o{ QUIZZES : targets
    LEARNING_RESOURCES ||--o{ STUDY_PLANS : references
    QUIZZES ||--o{ QUESTIONS : contains
    QUIZZES ||--o{ QUIZ_ATTEMPTS : records

    USERS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        datetime created_at
    }

    LEARNING_RESOURCES {
        int id PK
        int user_id FK
        string title
        string filename
        string file_path
        int page_count
        int chunk_count
        datetime upload_date
    }

    DOCUMENT_CHUNKS {
        int id PK
        int resource_id FK
        text content
        int page_number
        int chunk_index
        vector_384 embedding
    }

    QUIZZES {
        int id PK
        int user_id FK
        int resource_id FK
        string title
        string topic
        datetime created_at
    }

    QUESTIONS {
        int id PK
        int quiz_id FK
        text question_text
        json options
        int correct_option_index
        text explanation
        string topic
    }

    QUIZ_ATTEMPTS {
        int id PK
        int user_id FK
        int quiz_id FK
        string student_name
        int score
        int total_questions
        float percentage
        json topic_results
        datetime completed_at
    }

    STUDY_PLANS {
        int id PK
        int user_id FK
        int resource_id FK
        string student_name
        string title
        int duration_days
        json days_data
        string status
        datetime created_at
    }
```

---

## 5. API Endpoints Catalog

### Authentication
- `POST /api/auth/signup`: Register new student account (PBKDF2-hashed password).
- `POST /api/auth/login`: Authenticate and receive JWT bearer token.
- `POST /api/auth/demo-login`: 1-click instant login as pre-seeded demo user (`demo@learnlens.ai`).
- `GET /api/auth/me`: Fetch authenticated student profile.
- `POST /api/auth/forgot-password`: Password reset request.
- `POST /api/auth/reset-password`: Set new password.

### Documents & Ingestion
- `POST /api/upload`: Upload PDF notes, extract pages, chunk text, generate FastEmbed embeddings, and insert into pgvector.
- `GET /api/documents`: List documents owned by the authenticated student.
- `DELETE /api/documents/{id}`: Delete a document and cascade remove all chunks and vectors.

### Grounded RAG Assistant
- `POST /api/ask`: Execute similarity search against document chunks in `pgvector`, inject context into Groq prompt, and return answer with page citations.

### Quiz Engine & Evaluation
- `POST /api/quizzes/generate`: Formulate adaptive multiple-choice quiz from document chunks.
- `GET /api/quizzes`: List user-owned quizzes.
- `GET /api/quizzes/{id}`: Retrieve quiz with questions and choices.
- `POST /api/quizzes/{id}/submit`: Grade quiz answers, record attempt, and return question explanations.

### Analytics & Knowledge Gaps
- `GET /api/analytics`: Aggregate attempts, compute overall mastery, and isolate topics below 60% threshold.

### Dynamic Study Planner
- `POST /api/study-plans/generate`: Synthesize weak topics into a multi-day study plan.
- `GET /api/study-plans`: Retrieve active study plans.
- `PATCH /api/study-plans/{plan_id}/tasks/{task_id}`: Toggle task completion status.
