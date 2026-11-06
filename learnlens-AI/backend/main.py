import os
import sys
import shutil

# Guard: LearnLens AI is purely NLP / text-based and does not use computer vision.
# Prevents mismatched torchvision C++ binaries from crashing sentence-transformers.
sys.modules["torchvision"] = None
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import init_db, get_db, LearningResource, DocumentChunk, Quiz, QuizQuestion, QuizAttempt, StudyPlan
from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_service import RAGService
from quiz_service import QuizService
from analytics_service import AnalyticsService
from study_plan_service import StudyPlanService

# Upload directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="LearnLens AI - Core Engine",
    description="Personalized Learning & Learner Analytics System - RAG + Quiz + Analytics API",
    version="2.0.0",
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


# ============================================================================
# Pydantic Schemas
# ============================================================================

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
    model_config = {"protected_namespaces": ()}
    question: str
    answer: str
    citations: List[CitationItem]
    retrieval_method: str
    chunks_used: int
    model_used: str


class QuizGenerateRequest(BaseModel):
    document_id: int
    num_questions: Optional[int] = 5
    topic: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    student_name: Optional[str] = "Student"
    answers: Dict[str, int]  # { "question_id": selected_option_index }


class StudyPlanGenerateRequest(BaseModel):
    document_id: Optional[int] = None
    duration_days: Optional[int] = 5  # 3, 5, 7, 14
    student_name: Optional[str] = "Student"
    target_exam: Optional[str] = "Comprehensive Mastery"
    focus_topic: Optional[str] = None


class TaskToggleRequest(BaseModel):
    completed: bool


# ============================================================================
# Core System Endpoints
# ============================================================================

@app.get("/")
def root():
    return {
        "system": "LearnLens AI",
        "status": "online",
        "version": "3.0.0",
        "phases_active": [
            "Phase 1: Grounded RAG Assistance",
            "Phase 2: Quiz System & Learner Analytics",
            "Phase 3: Personalized Study Plans & Recommendation Engine"
        ],
        "docs_url": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# ============================================================================
# Phase 1: Document Upload & RAG Endpoints
# ============================================================================

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

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_path)

    try:
        processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
        processed_data = processor.process_pdf(saved_path)

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
    Ask a question against indexed documents with page citations.
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
            "quiz_count": len(r.quizzes),
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
    """View chunks of a specific document for inspection."""
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


# ============================================================================
# Phase 2: Quiz System Endpoints (FR-10, FR-05)
# ============================================================================

@app.post("/api/quizzes/generate")
def generate_quiz(req: QuizGenerateRequest, db: Session = Depends(get_db)):
    """
    Auto-generates a topic-tagged multiple choice quiz from a learning resource.
    """
    quiz_service = QuizService(db)
    try:
        quiz = quiz_service.generate_quiz(
            resource_id=req.document_id,
            num_questions=req.num_questions or 5,
            target_topic=req.topic,
        )
        return {
            "success": True,
            "quiz_id": quiz.id,
            "title": quiz.title,
            "topic": quiz.topic,
            "question_count": len(quiz.questions),
            "created_at": quiz.created_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@app.get("/api/quizzes")
def list_quizzes(document_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List all generated quizzes."""
    query = db.query(Quiz).order_by(Quiz.id.desc())
    if document_id:
        query = query.filter(Quiz.resource_id == document_id)

    quizzes = query.all()
    return [
        {
            "id": q.id,
            "resource_id": q.resource_id,
            "document_title": q.resource.title if q.resource else "Document",
            "title": q.title,
            "topic": q.topic,
            "question_count": len(q.questions),
            "attempt_count": len(q.attempts),
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in quizzes
    ]


@app.get("/api/quizzes/{quiz_id}")
def get_quiz(
    quiz_id: int,
    reveal_answers: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Fetch a quiz and its questions. By default, hides correct_index for test-taking.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    questions = []
    for q in quiz.questions:
        q_data = {
            "id": q.id,
            "question_text": q.question_text,
            "options": q.options,
            "topic": q.topic,
            "difficulty": q.difficulty,
        }
        if reveal_answers:
            q_data["correct_index"] = q.correct_index
            q_data["explanation"] = q.explanation
        questions.append(q_data)

    return {
        "id": quiz.id,
        "resource_id": quiz.resource_id,
        "document_title": quiz.resource.title if quiz.resource else "Document",
        "title": quiz.title,
        "topic": quiz.topic,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "questions": questions,
    }


@app.post("/api/quizzes/{quiz_id}/submit")
def submit_quiz_attempt(
    quiz_id: int,
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
):
    """
    Submit and grade a student's quiz attempt. Records attempt history,
    computes score, and calculates topic accuracy.
    """
    quiz_service = QuizService(db)
    try:
        result = quiz_service.grade_attempt(
            quiz_id=quiz_id,
            student_name=req.student_name or "Student",
            user_answers=req.answers,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade quiz: {str(e)}")


@app.delete("/api/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Delete a quiz, its questions, and attempt records."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    db.delete(quiz)
    db.commit()
    return {"success": True, "message": f"Quiz {quiz_id} deleted."}


# ============================================================================
# Phase 2: Learner Analytics & Knowledge Gap Detection (FR-06, FR-07)
# ============================================================================

@app.get("/api/analytics/overview")
def get_learner_analytics(
    student_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns aggregate learning metrics, per-topic accuracy breakdown,
    mastery levels, and flags Knowledge Gaps (< 60% accuracy).
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_learner_overview(student_name=student_name)


# ============================================================================
# Phase 3: Personalized Study Plans & Recommendation Engine (FR-08, FR-09)
# ============================================================================

@app.post("/api/study-plans/generate")
def generate_study_plan(req: StudyPlanGenerateRequest, db: Session = Depends(get_db)):
    """
    Auto-generates a personalized day-by-day study roadmap tailored to the student's
    diagnosed knowledge gaps, target exam timeline, and document content.
    """
    service = StudyPlanService(db)
    try:
        plan = service.generate_study_plan(
            resource_id=req.document_id,
            duration_days=req.duration_days or 5,
            student_name=req.student_name or "Student",
            target_exam=req.target_exam or "Comprehensive Mastery",
            focus_topic=req.focus_topic,
        )
        return service._format_plan_detail(plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


@app.get("/api/study-plans")
def list_study_plans(
    student_name: Optional[str] = Query(None),
    document_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List all personalized study plans."""
    service = StudyPlanService(db)
    return service.get_study_plans(student_name=student_name, resource_id=document_id)


@app.get("/api/study-plans/{plan_id}")
def get_study_plan(plan_id: int, db: Session = Depends(get_db)):
    """Retrieve complete study plan details with days, tasks, and completion status."""
    service = StudyPlanService(db)
    plan = service.get_study_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    return plan


@app.post("/api/study-plans/{plan_id}/tasks/{task_id}/toggle")
def toggle_study_task(
    plan_id: int,
    task_id: str,
    req: TaskToggleRequest,
    db: Session = Depends(get_db),
):
    """Toggle completion status of a specific task in the study plan."""
    service = StudyPlanService(db)
    updated = service.toggle_task_completion(plan_id=plan_id, task_id=task_id, completed=req.completed)
    if not updated:
        raise HTTPException(status_code=404, detail="Study plan or task not found.")
    return updated


@app.delete("/api/study-plans/{plan_id}")
def delete_study_plan(plan_id: int, db: Session = Depends(get_db)):
    """Delete a study plan."""
    service = StudyPlanService(db)
    success = service.delete_study_plan(plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    return {"success": True, "message": f"Study plan {plan_id} deleted."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
