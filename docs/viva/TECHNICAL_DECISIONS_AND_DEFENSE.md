# LearnLens AI - Viva & Technical Defense Guide

This guide prepares you to explain and defend every major architectural and technical decision made in LearnLens AI during your project viva, presentation, or system design interview.

---

## 1. High-Level Concept: "What is LearnLens AI and why is it unique?"

### Examiner Question:
> *"There are hundreds of AI PDF chatbots out there. What makes LearnLens AI fundamentally different?"*

### Recommended Answer:
> "Standard PDF chatbots are **open-loop question-answering systems**; they do not assess whether the user actually understood the content, and they frequently hallucinate without strict source attribution.
>
> LearnLens AI is designed as a **closed-loop adaptive pedagogical ecosystem**:
> 1. **Grounded Ingestion**: It chunks PDFs at the page level and stores dense 384-dim embeddings in PostgreSQL using `pgvector` with HNSW indexing. Every answer returned is strictly attributed with verifiable page citations (`[Page X]`).
> 2. **Adaptive Active Recall**: Instead of passive reading, it generates concept-tagged multiple-choice quizzes from document chunks with instant pedagogical explanations.
> 3. **Cognitive Analytics & Knowledge Gap Detection**: Rather than a static grade, it runs Bayesian Knowledge Tracing (BKT) to separate lucky guesses from true conceptual mastery, diagnosing weak concepts (< 60% accuracy).
> 4. **Dynamic Study Planner**: It automatically translates diagnosed knowledge gaps into a structured, multi-day study roadmap with interactive checklists and direct page reading tasks.
>
> This creates a continuous cycle: **Upload → Attributed QA → Quiz Evaluation → Gap Diagnosis → Personalized Roadmap**."

---

## 2. Embedding Engine: "Why did you switch from PyTorch to FastEmbed?"

### Examiner Question:
> *"Why did you migrate away from HuggingFace SentenceTransformers? Isn't PyTorch the industry standard?"*

### Recommended Answer:
> "PyTorch is the standard for model training and research, but for **serverless inference deployment**, it introduces massive dependency bloat:
> - `torch` + NVIDIA CUDA libraries exceed **2.5 GB**, vastly exceeding the Vercel/AWS Lambda package limit of 250 MB.
> - Cold-start latency with PyTorch was 8–14 seconds, often causing HTTP 500 timeouts (`FUNCTION_INVOCATION_FAILED`).
>
> By migrating to **FastEmbed (ONNX Runtime)**:
> 1. Total dependency footprint dropped to **~30 MB** (an ~98% size reduction).
> 2. Cold-start latency dropped to **< 600 ms**.
> 3. It utilizes the exact same `sentence-transformers/all-MiniLM-L6-v2` architecture and weights, producing identical 384-dimensional dense vectors with cosine similarity.
> 4. We implemented a strict **fail-fast policy**: if the embedding backend fails, it raises an explicit `RuntimeError` rather than silently indexing zero vectors into the database."

---

## 3. Database: "Why PostgreSQL + pgvector instead of Pinecone or Milvus?"

### Examiner Question:
> *"Why didn't you use a specialized vector database like Pinecone, Weaviate, or Qdrant?"*

### Recommended Answer:
> "Using a specialized vector database alongside a relational database creates a **dual-database distributed state problem**:
> 1. **Data Consistency**: Deleting a student's document requires two coordinated writes. If one fails, orphan vectors remain.
> 2. **Multi-Tenant Security**: With separate stores, enforcing tenant isolation requires synchronization of metadata tags across platforms.
> 3. **Operational Simplicity**: With **PostgreSQL + pgvector**, relational entities (Users, Quizzes, Attempts, Study Plans) and vector embeddings live in the exact same ACID-compliant database.
> 4. **HNSW Indexing**: We explicitly create a Hierarchical Navigable Small World (HNSW) index using cosine distance (`vector_cosine_ops`), providing logarithmic $O(\log N)$ retrieval speed directly inside standard SQL queries."

---

## 4. Multi-Tenant Security & Tenant Isolation

### Examiner Question:
> *"How do you guarantee that Student A cannot access Student B's notes or quiz questions?"*

### Recommended Answer:
> "We enforce tenant boundaries at three distinct architectural layers:
> 1. **Authentication Boundary**: Stateless JWT bearer tokens signed with a 256-bit secret. Passwords use salted bcrypt hashes with 12 rounds.
> 2. **Query Isolation Boundary**: Every relational database query explicitly filters `WHERE user_id == current_user.id`. In our v2 audit, we systematically eradicated legacy `OR user_id IS NULL` fallback filters.
> 3. **Vector Search Isolation**: Vector similarity queries perform native inner joins between `document_chunks` and `learning_resources`, injecting `WHERE lr.user_id = :user_id` into the SQL execution plan. Even if a user attempts to supply another student's `resource_id`, the join rejects access."

---

## 5. Learning Analytics & Cognitive Science

### Examiner Question:
> *"What mathematical model do you use to diagnose knowledge gaps?"*

### Recommended Answer:
> "We employ both an **empirical baseline** and the **Corbett & Anderson Bayesian Knowledge Tracing (BKT)** model:
> - **Empirical Baseline**: Cumulative accuracy per topic with a 60% mastery threshold.
> - **Bayesian Knowledge Tracing (BKT)**: Uses four cognitive parameters:
>   - $P(L_0) = 0.20$ (Prior knowledge probability)
>   - $P(T) = 0.15$ (Learning rate per practice step)
>   - $P(G) = 0.25$ (Guess rate on 4-option MCQs)
>   - $P(S) = 0.10$ (Slip rate — student knows concept but makes a mistake)
> - After each response, we compute the Bayesian posterior probability $P(L_t | \text{obs})$ and transition projection $P(L_{t+1})$. This prevents a student who made early mistakes from being permanently penalized once they have achieved true mastery."

---

## 6. Real-World Challenges & Production Debugging

### Examiner Question:
> *"What was the most challenging bug you encountered during deployment, and how did you resolve it?"*

### Recommended Answer:
> "The most challenging issue was an ephemeral `FUNCTION_INVOCATION_FAILED (HTTP 500)` in Vercel serverless functions:
> 1. **Database Dialect Mismatch**: SQLAlchemy on Python 3.12 defaulted to the `psycopg` (v3) dialect because the connection string began with `postgresql://`. The serverless environment did not have `psycopg` installed, causing `ModuleNotFoundError: No module named 'psycopg'`. We explicitly pinned the connection URI to `postgresql+psycopg2://` and bundled `psycopg[binary]`.
> 2. **Stale Connection Sockets**: Default connection pooling (`QueuePool`) held open TCP sockets that froze during serverless dormancy. We configured `NullPool` for serverless environments, establishing clean stateless connections.
> 3. **Eager Import Cold Starts**: We deferred heavy ML and PDF parsing imports to endpoint invocation time, cutting cold-start times from 14s to < 600ms."
