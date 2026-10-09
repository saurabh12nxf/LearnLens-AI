import os
import shutil
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import init_db, get_db, LearningResource, DocumentChunk
from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_service import RAGService

# Upload directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="LearnLens AI - Core RAG Engine",
    description="Personalized Learning & Learner Analytics System - RAG Assistance API",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initialize database tables and vector extensions on app launch."""
    try:
        init_db()
    except Exception as e:
        print(f"[Startup Warning] DB init issue: {e}")


# Pydantic Schemas
class QueryRequest(BaseModel):
    question: str
    document_id: Optional[int] = None
    top_k: Optional[int] = 4
    retrieval_method: Optional[str] = "semantic"  # "semantic" or "keyword_baseline"


class CitationItem(BaseModel):
    source_index: int
    document_title: str
    document_filename: str
    page_number: int
    similarity_score: float
    text_snippet: str


class QueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[CitationItem]
    retrieval_method: str
    chunks_used: int
    model_used: str


class DocumentInfo(BaseModel):
    id: int
    title: str
    filename: str
    page_count: int
    chunk_count: int
    file_size: int
    created_at: str


@app.get("/")
def root():
    return {
        "system": "LearnLens AI",
        "status": "online",
        "version": "1.0.0",
        "core_pillar": "Pillar 1: RAG Assistance",
        "docs_url": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload and process a PDF learning resource:
    1. Saves PDF file
    2. Extracts text page-by-page using PyMuPDF
    3. Chunks text with sliding window & overlap
    4. Computes embeddings (384-dim)
    5. Saves document + chunks + embeddings into PostgreSQL pgvector
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are currently supported.")

    file_title = title if title else os.path.splitext(file.filename)[0]
    saved_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save uploaded file
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_path)

    try:
        # Process document
        processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
        processed_data = processor.process_pdf(saved_path)

        # Store in Vector Database
        store = VectorStore(db)
        resource = store.store_document(
            title=file_title,
            filename=file.filename,
            file_path=saved_path,
            file_size=file_size,
            page_count=processed_data["page_count"],
            chunks=processed_data["chunks"],
        )

        return {
            "success": True,
            "message": f"Successfully processed and indexed '{file.filename}'",
            "document": {
                "id": resource.id,
                "title": resource.title,
                "filename": resource.filename,
                "page_count": resource.page_count,
                "chunk_count": resource.chunk_count,
                "file_size": resource.file_size,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@app.post("/api/query", response_model=QueryResponse)
def query_rag(req: QueryRequest, db: Session = Depends(get_db)):
    """
    Ask a question against indexed documents:
    - retrieval_method='semantic': Uses pgvector cosine similarity search
    - retrieval_method='keyword_baseline': Uses keyword lexical search (PRD baseline comparison)
    Returns grounded educational answer with page citations.
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    store = VectorStore(db)
    rag = RAGService(store)

    result = rag.generate_grounded_answer(
        question=req.question.strip(),
        resource_id=req.document_id,
        top_k=req.top_k or 4,
        retrieval_method=req.retrieval_method or "semantic",
    )

    return result


@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    """List all indexed learning resources."""
    resources = db.query(LearningResource).order_by(LearningResource.id.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "filename": r.filename,
            "page_count": r.page_count,
            "chunk_count": r.chunk_count,
            "file_size": r.file_size,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in resources
    ]


@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(
    doc_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """View chunks of a specific document for inspection and debugging."""
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.resource_id == doc_id)
        .order_by(DocumentChunk.chunk_index)
        .limit(limit)
        .all()
    )
    if not chunks:
        raise HTTPException(status_code=404, detail="Document chunks not found.")

    return [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "chunk_text": c.chunk_text,
            "has_embedding": c.embedding is not None,
        }
        for c in chunks
    ]


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Delete a document and its chunks."""
    doc = db.query(LearningResource).filter(LearningResource.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return {"success": True, "message": f"Document {doc_id} deleted."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
