# LearnLens AI Production Backend v3.0.1 (Neon Cloud PostgreSQL)
import os
import sys
import shutil
import re

# Guard: LearnLens AI is purely NLP / text-based and does not use computer vision.
# Prevents mismatched torchvision C++ binaries from crashing sentence-transformers.
sys.modules["torchvision"] = None
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, DatabaseError

from database import (
    engine,
    init_db,
    get_db,
    SessionLocal,
    User,
    LearningResource,
    DocumentChunk,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    StudyPlan,
)
from auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_current_user,
    ensure_demo_user,
)

# Upload directory (supports Vercel serverless /tmp environment)
if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="LearnLens AI - Core Engine",
    description="Production-Grade Personalized Learning & Analytics System with Multi-User Authentication",
    version="3.0.0",
)

# Enable strict and secure CORS configuration
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OperationalError)
@app.exception_handler(DatabaseError)
async def db_connection_exception_handler(request: Request, exc: Exception):
    """
    Catches unreachable PostgreSQL errors (common when DATABASE_URL is not set on Vercel).
    Returns actionable guidance instead of a raw 500.
    """
    err_str = str(exc)
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                f"Database connection error: {err_str[:200]}. "
                "Please verify your remote PostgreSQL DATABASE_URL in Vercel Project Settings."
            )
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global catch-all exception handler to surface explicit error details to frontend.
    """
    err_name = type(exc).__name__
    err_str = str(exc)
    print(f"[Server Error] {request.method} {request.url.path}: {err_name} - {err_str}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{err_name}: {err_str}" if err_str else f"Unhandled Server Error ({err_name})",
            "error_type": err_name,
        },
    )


@app.on_event("startup")
def on_startup():
    """Initialize database tables, vector extensions, and seed demo user on launch."""
    # Only run full DDL schema migration in local environments to prevent Vercel cold-start timeouts
    if not os.getenv("VERCEL"):
        try:
            init_db()
            db = SessionLocal()
            ensure_demo_user(db)
            db.close()
        except Exception as e:
            print(f"[Startup Warning] DB init / demo seed issue: {e}")


# ============================================================================
# Pydantic Schemas
# ============================================================================

# --- Authentication Schemas ---
class UserSignupRequest(BaseModel):
    full_name: str
    email: str
    password: str


class UserLoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    new_password: str
    reset_token: Optional[str] = None
    email: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


# --- Query & RAG Schemas ---
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


# --- Quiz Schemas ---
class QuizGenerateRequest(BaseModel):
    document_id: int
    num_questions: Optional[int] = 5
    topic: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    student_name: Optional[str] = None
    answers: Dict[str, int]  # { "question_id": selected_option_index }


# --- Study Plan Schemas ---
class StudyPlanGenerateRequest(BaseModel):
    document_id: Optional[int] = None
    duration_days: Optional[int] = 5  # 3, 5, 7, 14
    student_name: Optional[str] = None
    target_exam: Optional[str] = "Comprehensive Mastery"
    focus_topic: Optional[str] = None


class TaskToggleRequest(BaseModel):
    completed: bool


# ============================================================================
# Core Health & Metadata
# ============================================================================

@app.get("/")
def root():
    return {
        "system": "LearnLens AI",
        "status": "online",
        "version": "3.0.0",
        "auth_enabled": True,
        "phases_active": [
            "Phase 1: Grounded RAG Assistance",
            "Phase 2: Quiz System & Learner Analytics",
            "Phase 3: Personalized Study Plans & Recommendation Engine"
        ],
        "docs_url": "/docs",
    }


@app.get("/api/ping")
def ping():
    return {
        "status": "pong",
        "service": "backend",
        "python": sys.version,
        "environment": "vercel" if os.getenv("VERCEL") else "local",
    }


@app.get("/health")
@app.get("/api/health")
def health():
    db_connected = False
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        db_connected = True
    except Exception as e:
        db_error = str(e)

    groq_set = bool(
        os.getenv("GROQ_API_KEY")
        and os.getenv("GROQ_API_KEY").strip() not in ["your_groq_api_key_here", ""]
    )

    db_url_configured = os.getenv("DATABASE_URL") is not None
    is_localhost = "localhost" in os.getenv("DATABASE_URL", "localhost")

    return {
        "status": "healthy" if db_connected else "degraded",
        "database": {
            "connected": db_connected,
            "configured": db_url_configured,
            "points_to_localhost": is_localhost,
            "error": db_error,
        },
        "groq_configured": groq_set,
        "environment": "vercel" if os.getenv("VERCEL") else "local",
    }


# ============================================================================
# Authentication Endpoints (Sign Up, Login, Me, Demo Login)
# ============================================================================

@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Registers a new student / learner account with salted bcrypt password.
    Returns access token and user profile.
    """
    try:
        email_clean = req.email.strip().lower()
        name_clean = req.full_name.strip()

        if not name_clean:
            raise HTTPException(status_code=400, detail="Full name is required.")
        if not email_clean or "@" not in email_clean:
            raise HTTPException(status_code=400, detail="A valid email address is required.")
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

        existing_user = db.query(User).filter(User.email == email_clean).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="An account with this email address already exists. Please log in.",
            )

        user = User(
            email=email_clean,
            full_name=name_clean,
            hashed_password=hash_password(req.password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": str(user.id), "email": user.email})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Signup Error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {type(e).__name__} - {str(e)}")


@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via email and password.
    Returns signed JWT access token.
    """
    try:
        email_clean = req.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()

        if not user or not verify_password(req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please try again.",
            )

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated.")

        token = create_access_token(data={"sub": str(user.id), "email": user.email})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Login Error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {type(e).__name__} - {str(e)}")


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates user email and issues a secure, expiring 15-minute password reset token.
    """
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address.",
        )

    reset_token = create_password_reset_token(email_clean, expires_minutes=15)
    return {
        "success": True,
        "message": f"Password reset token generated for '{email_clean}'. Valid for 15 minutes.",
        "email": email_clean,
        "reset_token": reset_token,
    }


@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Resets the password for a user account using a verified, single-use, expiring reset token.
    """
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    target_email = None
    if req.reset_token:
        target_email = verify_password_reset_token(req.reset_token)
        if not target_email:
            raise HTTPException(
                status_code=400,
                detail="Invalid, expired, or tampered password reset token. Please request a new token.",
            )
    elif req.email:
        # In production environments, an authenticated reset_token is strictly enforced
        if os.getenv("VERCEL") or os.getenv("ENVIRONMENT") == "production":
            raise HTTPException(
                status_code=400,
                detail="A valid, signed reset_token is required to reset password.",
            )
        target_email = req.email.strip().lower()
    else:
        raise HTTPException(
            status_code=400,
            detail="A valid reset_token is required to reset password.",
        )

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    user.hashed_password = hash_password(req.new_password)
    db.commit()

    return {
        "success": True,
        "message": "Password updated successfully. You can now log in with your new password.",
    }


@app.post("/api/auth/demo-login", response_model=AuthResponse)
def demo_login(db: Session = Depends(get_db)):
    """
    Instant 1-click evaluation login for testers and reviewers.
    Logs into the persistent Alex Morgan demo account.
    """
    try:
        user = ensure_demo_user(db)
        token = create_access_token(data={"sub": str(user.id), "email": user.email})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    except Exception as e:
        print(f"[Demo Login Error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Demo login failed: {type(e).__name__} - {str(e)}")


@app.get("/api/auth/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


# ============================================================================
# Phase 1: Document Upload & RAG Endpoints (Multi-Tenant Isolated)
# ============================================================================

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and process a PDF learning resource for the authenticated user:
    1. Saves PDF file
    2. Extracts text page-by-page using PyMuPDF
    3. Chunks text with sliding window & overlap
    4. Computes embeddings (384-dim)
    5. Stores document + chunks + embeddings tagged with current_user.id
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files (.pdf) are supported.")

    # Sanitize filename
    raw_name = os.path.basename(file.filename)
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', raw_name)
    if not safe_filename.lower().endswith(".pdf"):
        safe_filename += ".pdf"

    # Read and validate magic byte header
    header_bytes = await file.read(1024)
    if not header_bytes.startswith(b"%PDF"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file signature: uploaded file does not start with a valid PDF magic header (%PDF).",
        )

    # Read remaining file content and enforce 25MB maximum upload limit
    remaining_bytes = await file.read()
    full_content = header_bytes + remaining_bytes
    max_upload_size = 25 * 1024 * 1024  # 25MB
    if len(full_content) > max_upload_size:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed upload size of 25MB (Received {len(full_content) / (1024*1024):.2f}MB).",
        )

    file_title = title.strip() if title and title.strip() else os.path.splitext(safe_filename)[0]
    user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
    os.makedirs(user_upload_dir, exist_ok=True)
    saved_path = os.path.join(user_upload_dir, safe_filename)

    with open(saved_path, "wb") as buffer:
        buffer.write(full_content)

    file_size = len(full_content)

    try:
        from document_processor import DocumentProcessor
        from vector_store import VectorStore
        processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
        processed_data = processor.process_pdf(saved_path)

        store = VectorStore(db)
        resource = store.store_document(
            title=file_title,
            filename=safe_filename,
            file_path=saved_path,
            file_size=file_size,
            page_count=processed_data["page_count"],
            chunks=processed_data["chunks"],
            user_id=current_user.id,
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
def query_rag(
    req: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ask a question against the authenticated user's indexed documents with page citations.
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # If document_id is provided, verify it strictly belongs to this user
    if req.document_id:
        doc = db.query(LearningResource).filter(LearningResource.id == req.document_id).first()
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Selected document not found in your workspace.")

    from vector_store import VectorStore
    from rag_service import RAGService

    store = VectorStore(db)
    rag = RAGService(store)

    result = rag.generate_grounded_answer(
        question=req.question.strip(),
        resource_id=req.document_id,
        top_k=req.top_k or 4,
        retrieval_method=req.retrieval_method or "semantic",
        user_id=current_user.id,
    )
    return result


@app.get("/api/documents")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all learning resources belonging to the authenticated user's workspace."""
    resources = (
        db.query(LearningResource)
        .filter(LearningResource.user_id == current_user.id)
        .order_by(LearningResource.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "filename": r.filename,
            "page_count": r.page_count,
            "chunk_count": r.chunk_count,
            "file_size": r.file_size,
            "quiz_count": len([q for q in r.quizzes if q.user_id == current_user.id]),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in resources
    ]


@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(
    doc_id: int,
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View chunks of a specific document for inspection within user's space."""
    doc = db.query(LearningResource).filter(LearningResource.id == doc_id).first()
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

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
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document and its chunks belonging to the authenticated user."""
    doc = db.query(LearningResource).filter(LearningResource.id == doc_id).first()
    if not doc or doc.user_id != current_user.id:
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
# Phase 2: Quiz System Endpoints (User-Isolated)
# ============================================================================

@app.post("/api/quizzes/generate")
def generate_quiz(
    req: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Auto-generates a topic-tagged multiple choice quiz from a user's learning resource.
    """
    # Verify document ownership strictly
    doc = db.query(LearningResource).filter(LearningResource.id == req.document_id).first()
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

    from quiz_service import QuizService
    quiz_service = QuizService(db)
    try:
        quiz = quiz_service.generate_quiz(
            resource_id=req.document_id,
            num_questions=req.num_questions or 5,
            target_topic=req.topic,
            user_id=current_user.id,
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
def list_quizzes(
    document_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List quizzes belonging to the authenticated user."""
    query = (
        db.query(Quiz)
        .filter(Quiz.user_id == current_user.id)
        .order_by(Quiz.id.desc())
    )
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
            "attempt_count": len([a for a in q.attempts if a.user_id == current_user.id]),
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in quizzes
    ]


@app.get("/api/quizzes/{quiz_id}")
def get_quiz(
    quiz_id: int,
    reveal_answers: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a quiz and its questions within the user's workspace.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz or quiz.user_id != current_user.id:
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit and grade a student's quiz attempt. Records attempt history,
    computes score, and calculates topic accuracy in user's isolated profile.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz or quiz.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    from quiz_service import QuizService
    quiz_service = QuizService(db)
    try:
        student_display_name = req.student_name if req.student_name else current_user.full_name
        result = quiz_service.grade_attempt(
            quiz_id=quiz_id,
            student_name=student_display_name,
            user_answers=req.answers,
            user_id=current_user.id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade quiz: {str(e)}")


@app.delete("/api/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a quiz belonging to the authenticated user."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz or quiz.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    db.delete(quiz)
    db.commit()
    return {"success": True, "message": f"Quiz {quiz_id} deleted."}


# ============================================================================
# Phase 2: Learner Analytics & Knowledge Gap Detection (User-Isolated)
# ============================================================================

@app.get("/api/analytics/overview")
def get_learner_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns aggregate learning metrics, per-topic accuracy breakdown,
    mastery levels, and flags Knowledge Gaps (< 60% accuracy) for the active user.
    """
    from analytics_service import AnalyticsService
    analytics_service = AnalyticsService(db)
    return analytics_service.get_learner_overview(
        student_name=current_user.full_name,
        user_id=current_user.id,
    )


# ============================================================================
# Phase 3: Personalized Study Plans & Recommendation Engine (User-Isolated)
# ============================================================================

@app.post("/api/study-plans/generate")
def generate_study_plan(
    req: StudyPlanGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Auto-generates a personalized day-by-day study roadmap tailored to the student's
    diagnosed knowledge gaps, target exam timeline, and document content.
    """
    from study_plan_service import StudyPlanService
    service = StudyPlanService(db)
    try:
        plan = service.generate_study_plan(
            resource_id=req.document_id,
            duration_days=req.duration_days or 5,
            student_name=req.student_name or current_user.full_name,
            target_exam=req.target_exam or "Comprehensive Mastery",
            focus_topic=req.focus_topic,
            user_id=current_user.id,
        )
        return service._format_plan_detail(plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


@app.get("/api/study-plans")
def list_study_plans(
    document_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all personalized study plans for the authenticated user."""
    from study_plan_service import StudyPlanService
    service = StudyPlanService(db)
    return service.get_study_plans(
        user_id=current_user.id,
        student_name=current_user.full_name,
        resource_id=document_id,
    )


@app.get("/api/study-plans/{plan_id}")
def get_study_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve complete study plan details with days, tasks, and completion status."""
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Study plan not found.")

    from study_plan_service import StudyPlanService
    service = StudyPlanService(db)
    return service._format_plan_detail(plan)


@app.post("/api/study-plans/{plan_id}/tasks/{task_id}/toggle")
def toggle_study_task(
    plan_id: int,
    task_id: str,
    req: TaskToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle completion status of a specific task in the study plan."""
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Study plan not found.")

    from study_plan_service import StudyPlanService
    service = StudyPlanService(db)
    updated = service.toggle_task_completion(plan_id=plan_id, task_id=task_id, completed=req.completed)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found.")
    return updated


@app.delete("/api/study-plans/{plan_id}")
def delete_study_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a study plan belonging to the authenticated user."""
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Study plan not found.")

    from study_plan_service import StudyPlanService
    service = StudyPlanService(db)
    success = service.delete_study_plan(plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Study plan not found.")
    return {"success": True, "message": f"Study plan {plan_id} deleted."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
