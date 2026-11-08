# ADR-001: Embedding Engine Migration (PyTorch to FastEmbed ONNX)

## Context & Problem Statement
The original implementation of LearnLens AI utilized Hugging Face's `sentence-transformers` library running on top of PyTorch (`torch`).
When deploying to serverless platforms (such as Vercel / AWS Lambda), the PyTorch wheels bundled full CUDA libraries and deep learning dependencies exceeding 2.5 GB. Serverless function limits on Vercel impose a 250 MB unzipped limit and a 15-second cold-start ceiling. The deployment consistently failed with out-of-memory and packaging size violations.

## Decision
We migrated the primary embedding engine to **FastEmbed** using the ONNX Runtime, maintaining the `sentence-transformers/all-MiniLM-L6-v2` 384-dimensional model architecture. SentenceTransformers is retained strictly as an optional local fallback. If both backends fail, the service fails fast with an explicit `RuntimeError` rather than silently indexing zero vectors.

## Consequences & Tradeoffs
### Advantages:
1. **Container Size Reduction**: The entire FastEmbed ONNX runtime consumes ~30MB, compared to 2.5GB+ for PyTorch.
2. **Cold-Start Speed**: CPU-optimized ONNX runtime loads in < 150ms versus 4-8s for PyTorch.
3. **Identical Embedding Geometry**: Generates the exact same 384-dimensional dense vector embeddings, maintaining complete compatibility with existing vector tables in `pgvector`.
4. **Reliability**: Eliminates silent zero vectors (`[0.0] * 384`) by raising explicit `RuntimeError` on model failures.

### Disadvantages:
- ONNX models cannot be fine-tuned directly on GPU within the serverless environment; fine-tuning must be performed offline.
