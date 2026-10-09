import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import LearningResource, DocumentChunk
from embedding_service import EmbeddingService


class VectorStore:
    """
    Manages vector storage and retrieval using PostgreSQL + pgvector.
    Supports both semantic embedding search and keyword baseline retrieval.
    """

    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()

    def store_document(
        self,
        title: str,
        filename: str,
        file_path: str,
        file_size: int,
        page_count: int,
        chunks: List[Dict[str, Any]],
    ) -> LearningResource:
        """
        Stores a document and all its chunks with their embeddings in the database.
        """
        # Create resource record
        resource = LearningResource(
            title=title,
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            page_count=page_count,
            chunk_count=len(chunks),
        )
        self.db.add(resource)
        self.db.flush()  # Populates resource.id

        if chunks:
            chunk_texts = [c["text"] for c in chunks]
            # Generate embeddings in batch for optimal speed
            embeddings = self.embedding_service.get_embeddings_batch(chunk_texts)

            chunk_records = []
            for c_data, emb in zip(chunks, embeddings):
                chunk_rec = DocumentChunk(
                    resource_id=resource.id,
                    chunk_index=c_data["chunk_index"],
                    page_number=c_data["page_number"],
                    chunk_text=c_data["text"],
                    embedding=emb,
                )
                chunk_records.append(chunk_rec)

            self.db.bulk_save_objects(chunk_records)

        self.db.commit()
        self.db.refresh(resource)
        return resource

    def search_semantic(
        self,
        query: str,
        resource_id: Optional[int] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search using pgvector cosine distance (<=>).
        Cosine distance ranges from 0 (identical) to 2 (opposite).
        Similarity = 1.0 - cosine_distance.
        """
        query_vector = self.embedding_service.get_embedding(query)
        vector_str = "[" + ",".join(str(round(v, 6)) for v in query_vector) + "]"

        if resource_id:
            sql = text(
                """
                SELECT 
                    dc.id,
                    dc.resource_id,
                    dc.chunk_index,
                    dc.page_number,
                    dc.chunk_text,
                    lr.title as document_title,
                    lr.filename as document_filename,
                    (1 - (dc.embedding <=> CAST(:vec AS vector))) AS similarity_score
                FROM document_chunks dc
                JOIN learning_resources lr ON dc.resource_id = lr.id
                WHERE dc.resource_id = :resource_id
                ORDER BY dc.embedding <=> CAST(:vec AS vector)
                LIMIT :top_k;
                """
            )
            params = {"vec": vector_str, "resource_id": resource_id, "top_k": top_k}
        else:
            sql = text(
                """
                SELECT 
                    dc.id,
                    dc.resource_id,
                    dc.chunk_index,
                    dc.page_number,
                    dc.chunk_text,
                    lr.title as document_title,
                    lr.filename as document_filename,
                    (1 - (dc.embedding <=> CAST(:vec AS vector))) AS similarity_score
                FROM document_chunks dc
                JOIN learning_resources lr ON dc.resource_id = lr.id
                ORDER BY dc.embedding <=> CAST(:vec AS vector)
                LIMIT :top_k;
                """
            )
            params = {"vec": vector_str, "top_k": top_k}

        result = self.db.execute(sql, params)
        rows = result.fetchall()

        matched_chunks = []
        for row in rows:
            matched_chunks.append({
                "chunk_id": row.id,
                "resource_id": row.resource_id,
                "document_title": row.document_title,
                "document_filename": row.document_filename,
                "chunk_index": row.chunk_index,
                "page_number": row.page_number,
                "text": row.chunk_text,
                "similarity_score": round(float(row.similarity_score), 4),
                "retrieval_method": "semantic",
            })

        return matched_chunks

    def search_keyword_baseline(
        self,
        query: str,
        resource_id: Optional[int] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Baseline lexical retrieval using PostgreSQL text search / ILIKE word matching.
        Required by PRD Section 9 & 10 for comparison against semantic embeddings.
        """
        words = [w.strip().lower() for w in query.split() if len(w.strip()) > 2]
        if not words:
            words = [query.lower()]

        # Build simple case-insensitive ILIKE conditions
        conditions = " OR ".join([f"LOWER(dc.chunk_text) LIKE :w{i}" for i in range(len(words))])

        base_sql = f"""
            SELECT 
                dc.id,
                dc.resource_id,
                dc.chunk_index,
                dc.page_number,
                dc.chunk_text,
                lr.title as document_title,
                lr.filename as document_filename
            FROM document_chunks dc
            JOIN learning_resources lr ON dc.resource_id = lr.id
            WHERE ({conditions})
        """
        params = {f"w{i}": f"%{w}%" for i, w in enumerate(words)}

        if resource_id:
            base_sql += " AND dc.resource_id = :resource_id"
            params["resource_id"] = resource_id

        base_sql += " LIMIT :top_k;"
        params["top_k"] = top_k

        result = self.db.execute(text(base_sql), params)
        rows = result.fetchall()

        matched_chunks = []
        for row in rows:
            # Simple keyword overlap scoring for baseline
            overlap = sum(1 for w in words if w in row.chunk_text.lower())
            score = round(overlap / max(len(words), 1), 4)

            matched_chunks.append({
                "chunk_id": row.id,
                "resource_id": row.resource_id,
                "document_title": row.document_title,
                "document_filename": row.document_filename,
                "chunk_index": row.chunk_index,
                "page_number": row.page_number,
                "text": row.chunk_text,
                "similarity_score": score,
                "retrieval_method": "keyword_baseline",
            })

        # Sort by overlap score descending
        matched_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matched_chunks
