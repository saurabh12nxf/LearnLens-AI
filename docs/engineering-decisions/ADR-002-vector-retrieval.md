# ADR-002: Unified PostgreSQL + pgvector vs Standalone Vector DBs

## Context & Problem Statement
Modern RAG systems often choose between dedicated vector databases (Pinecone, Weaviate, Qdrant, Milvus) and relational databases with vector extensions (`pgvector` in PostgreSQL).
LearnLens AI requires relational entities (Users, Permissions, Quizzes, QuizAttempts, StudyPlans) alongside document vector embeddings.

## Decision
We chose **PostgreSQL 16 with the `pgvector` extension** hosted on Neon Cloud, utilizing an explicit **HNSW index (`vector_cosine_ops`)** for vector similarity searches.

## Comparison & Rationale

| Evaluation Criteria | Standalone Vector DB (e.g., Pinecone) | PostgreSQL + pgvector (Selected) |
| :--- | :--- | :--- |
| **Data Consistency & ACID** | Eventual consistency; requires dual-write sync between SQL and Vector stores. | Strict ACID compliance; transactional joins across relational models and vector tables. |
| **Multi-Tenant Filtering** | Metadata filtering often requires post-filtering or pre-filtering syntax outside standard SQL. | Native SQL joins: `WHERE lr.user_id = :user_id` executed directly within the index query plan. |
| **Operational Overhead** | Managing two separate cloud infrastructure subscriptions and credential sets. | Single database connection string (`DATABASE_URL`). |
| **Indexing Strategy** | Proprietary managed indexes. | Explicit `HNSW` (Hierarchical Navigable Small World) index with cosine distance (`<=>`). |

## Consequences
- **Security**: Cross-tenant data leakage is prevented directly in SQL (`WHERE lr.user_id = :user_id`).
- **Performance**: HNSW index guarantees logarithmic $O(\log N)$ search latency even as the document chunk corpus scales.

