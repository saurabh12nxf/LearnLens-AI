# LearnLens AI - Git Evolution & Decision History

This document reconstructs the architectural evolution of LearnLens AI across its Git history, documenting what was changed, why it was changed, and the lessons learned.

---

## Evolution Timeline

| Stage | Milestone / Change | Motivation & Technical Rationale |
| :--- | :--- | :--- |
| **Stage 1** | **PyMuPDF + Sliding-Window Chunking** | Needed fast, reliable text extraction from PDF lecture notes while preserving exact page boundaries (`page_number`) for source citations. |
| **Stage 2** | **Sentence Transformers + pgvector** | Initial semantic retrieval pipeline using HuggingFace `sentence-transformers/all-MiniLM-L6-v2` and PostgreSQL vector extension (`pgvector`) for cosine similarity. |
| **Stage 3** | **OpenAI → Groq Qwen** | Migrated LLM inference to Groq Cloud running `qwen/qwen3.8-27b`. Drastically lowered latency (< 1s responses) and improved token generation throughput. |
| **Stage 4** | **Sentence Transformers → FastEmbed (ONNX)** | `torch` and CUDA packages ballooned lambda build artifacts past 2.5 GB. Switching to FastEmbed ONNX runtime reduced container overhead to ~30MB with zero PyTorch dependencies. |
| **Stage 5** | **Connection Pooling → Vercel NullPool** | Standard SQLAlchemy `QueuePool` preserved sockets that froze in serverless lambdas. Replaced with `NullPool` to establish stateless per-request connections to Neon PostgreSQL. |
| **Stage 6** | **Eager Imports → Deferred / Lazy Imports** | Heavy libraries (`fitz`, `fastembed`, `groq`) delayed API cold-start times. Imports were deferred to endpoint execution time, slashing initial latency. |
| **Stage 7** | **Single-User App → Multi-Tenant Auth** | Transformed personal demo into a multi-tenant platform with user registration, PBKDF2 hashing, JWT bearer tokens, and row-level tenant scoping. |
| **Stage 8** | **Basic RAG → Quizzes & Analytics** | Extended simple question-answering into active recall: concept-tagged MCQs and knowledge gap detection (< 60% mastery threshold). |
| **Stage 9** | **Analytics → Personalized Study Plans** | Closed the pedagogical loop by translating detected knowledge gaps into actionable, multi-day study roadmaps with interactive task checklists. |

---

## Architectural Decisions Preserved in v2

1. **Keep PyMuPDF (`fitz`)**:
   - Maintains sub-100ms per-document parsing speeds.
   - Preserves exact physical page numbers needed for citations.

2. **Keep FastEmbed (ONNX Runtime)**:
   - Employs lightweight ONNX runtime execution for `all-MiniLM-L6-v2`.
   - Avoids the 2.5GB PyTorch/CUDA bloat while generating standard 384-dimensional dense vectors.

3. **Keep PostgreSQL + pgvector (Neon Cloud)**:
   - Single unified datastore for relational entities (Users, Quizzes, Attempts, Plans) and vector embeddings.
   - Eliminates distributed sync bugs between separate vector and SQL databases.

4. **Keep FastAPI + SQLAlchemy**:
   - Asynchronous request handling, clean dependency injection, and automatic OpenAPI documentation.

5. **Keep React 18 + Vite**:
   - Fast client-side rendering with Tailwind CSS dark UI and responsive state management.
