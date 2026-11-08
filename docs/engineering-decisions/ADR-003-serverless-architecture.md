# ADR-003: Serverless Resilience (NullPool & Lazy Imports)

## Context & Problem Statement
When migrating FastAPI from a persistent long-running container to Vercel Serverless Functions, two critical failures occurred:
1. `QueuePool` kept TCP sockets alive. When serverless instances were frozen or spun down, subsequent invocations attempted to reuse dead sockets, throwing `OperationalError: SSL connection has been closed unexpectedly`.
2. Eagerly importing PyMuPDF, ML models, and Groq SDKs on application boot caused cold-start execution timeouts (`FUNCTION_INVOCATION_FAILED`).

## Decision
1. **Connection Pooling**: Configured SQLAlchemy with `NullPool` when `VERCEL` environment is detected. Each serverless request establishes an ephemeral connection that closes cleanly when the response is yielded.
2. **Lazy / Deferred Imports**: Heavy ML and PDF parsing libraries are deferred to endpoint invocation time rather than imported at top-level `main.py`.
3. **DDL Isolation**: Bypassed runtime DDL migrations (`create_all`) on serverless cold starts; schema changes are handled via Alembic migrations.

## Consequences
- Cold starts reduced from >14 seconds (hitting Vercel timeout) to ~600 milliseconds.
- Socket exhaustion and stale TCP drops are eliminated.

