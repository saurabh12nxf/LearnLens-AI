import os
import sys
from typing import List, Union
import numpy as np
from dotenv import load_dotenv

load_dotenv()

# Configure serverless-safe writable cache directory on Vercel
if os.getenv("VERCEL"):
    os.environ.setdefault("FASTEMBED_CACHE_DIR", "/tmp/fastembed_cache")
    os.environ.setdefault("HF_HOME", "/tmp/huggingface")

DEFAULT_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingService:
    """
    Handles dense vector embeddings using FastEmbed (ONNX) or SentenceTransformers.
    Generates 384-dimensional embeddings for text chunks and search queries.
    Serverless-optimized: avoids massive PyTorch / CUDA GPU package bloat on Vercel.
    """

    _instance = None
    _model = None
    _backend_type = None  # "fastembed" or "sentence_transformers"

    def __new__(cls, *args, **kwargs):
        # Singleton pattern to avoid reloading model weights repeatedly into RAM
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        if self._model is None:
            normalized_name = model_name
            if normalized_name == "all-MiniLM-L6-v2":
                normalized_name = "sentence-transformers/all-MiniLM-L6-v2"

            self.model_name = normalized_name
            self.dimension = 384

            # 1. Try FastEmbed first (lightweight ONNX runtime, ideal for serverless / Vercel)
            try:
                from fastembed import TextEmbedding
                print(f"[EmbeddingService] Initializing FastEmbed with {self.model_name}...")
                self._model = TextEmbedding(model_name=self.model_name)
                self._backend_type = "fastembed"
                print(f"[EmbeddingService] FastEmbed ready. Embedding dimension: {self.dimension}")
                return
            except Exception as e:
                print(f"[EmbeddingService] FastEmbed not active ({e}), attempting SentenceTransformers...")

            # 2. Fallback to SentenceTransformers (local development)
            try:
                sys.modules["torchvision"] = None
                from sentence_transformers import SentenceTransformer
                st_name = "all-MiniLM-L6-v2" if "all-MiniLM-L6-v2" in self.model_name else self.model_name
                print(f"[EmbeddingService] Initializing SentenceTransformer with {st_name}...")
                self._model = SentenceTransformer(st_name)
                self._backend_type = "sentence_transformers"
                if hasattr(self._model, "get_embedding_dimension"):
                    self.dimension = self._model.get_embedding_dimension()
                elif hasattr(self._model, "get_sentence_embedding_dimension"):
                    self.dimension = self._model.get_sentence_embedding_dimension()
                print(f"[EmbeddingService] SentenceTransformer ready. Embedding dimension: {self.dimension}")
                return
            except Exception as e:
                print(f"[EmbeddingService] Warning: Could not initialize embedding model: {e}")
                self._backend_type = "fallback"

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for a single string."""
        if not text or not text.strip():
            return [0.0] * self.dimension

        if self._backend_type == "fastembed":
            embeddings = list(self._model.embed([text]))
            if embeddings:
                return embeddings[0].tolist()
            return [0.0] * self.dimension

        if self._backend_type == "sentence_transformers":
            embedding = self._model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return embedding.tolist()

        return [0.0] * self.dimension

    def get_embeddings_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Generate embedding vectors for a list of strings in batches."""
        if not texts:
            return []

        if self._backend_type == "fastembed":
            embeddings = list(self._model.embed(texts, batch_size=batch_size))
            return [e.tolist() for e in embeddings]

        if self._backend_type == "sentence_transformers":
            embeddings = self._model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
            return embeddings.tolist()

        return [[0.0] * self.dimension for _ in texts]

    @staticmethod
    def cosine_similarity(vec_a: Union[List[float], np.ndarray], vec_b: Union[List[float], np.ndarray]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
