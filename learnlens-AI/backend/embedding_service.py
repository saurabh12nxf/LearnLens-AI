import os
from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


class EmbeddingService:
    """
    Handles dense vector embeddings using SentenceTransformers (all-MiniLM-L6-v2).
    Generates 384-dimensional embeddings for text chunks and search queries.
    """

    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        # Singleton pattern to avoid reloading model weights repeatedly into RAM
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        if self._model is None:
            print(f"[EmbeddingService] Loading embedding model: {model_name}...")
            self.model_name = model_name
            self._model = SentenceTransformer(model_name)
            if hasattr(self._model, "get_embedding_dimension"):
                self.dimension = self._model.get_embedding_dimension()
            else:
                self.dimension = self._model.get_sentence_embedding_dimension()
            print(f"[EmbeddingService] Model loaded successfully. Dimension: {self.dimension}")

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for a single string."""
        if not text or not text.strip():
            return [0.0] * self.dimension
        embedding = self._model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()

    def get_embeddings_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Generate embedding vectors for a list of strings in batches."""
        if not texts:
            return []
        embeddings = self._model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

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
