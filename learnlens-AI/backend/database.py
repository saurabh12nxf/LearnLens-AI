import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from pgvector.sqlalchemy import Vector

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/learnlens_dev",
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class LearningResource(Base):
    __tablename__ = "learning_resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chunks = relationship(
        "DocumentChunk",
        back_populates="resource",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )
    quizzes = relationship(
        "Quiz",
        back_populates="resource",
        cascade="all, delete-orphan",
        order_by="Quiz.id.desc()",
    )
    study_plans = relationship(
        "StudyPlan",
        back_populates="resource",
        cascade="all, delete-orphan",
        order_by="StudyPlan.id.desc()",
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(
        Integer,
        ForeignKey("learning_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=True)  # all-MiniLM-L6-v2 dimension
    created_at = Column(DateTime, default=datetime.utcnow)

    resource = relationship("LearningResource", back_populates="chunks")


# ============================================================================
# Phase 2: Quiz System & Learner Analytics Models
# ============================================================================

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(
        Integer,
        ForeignKey("learning_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    topic = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    resource = relationship("LearningResource", back_populates="quizzes")
    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.id",
    )
    attempts = relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizAttempt.created_at.desc()",
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of 4 strings: ["Option A", "Option B", ...]
    correct_index = Column(Integer, nullable=False)  # 0, 1, 2, or 3
    explanation = Column(Text, nullable=True)  # Grounded explanation
    topic = Column(String(100), nullable=True)  # e.g., "Dynamic Programming", "Trees"
    difficulty = Column(String(50), default="Medium")  # "Easy", "Medium", "Hard"

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_name = Column(String(100), default="Student")
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    percentage = Column(Float, default=0.0)
    user_answers = Column(JSON, nullable=True)  # {"question_id": selected_option_index}
    topic_results = Column(JSON, nullable=True)  # {"TopicName": {"correct": X, "total": Y}}
    created_at = Column(DateTime, default=datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")


# ============================================================================
# Phase 3: Personalized Study Plans & Recommendation Engine Models
# ============================================================================

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(
        Integer,
        ForeignKey("learning_resources.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    student_name = Column(String(100), default="Student")
    title = Column(String(255), nullable=False)
    duration_days = Column(Integer, default=5)
    target_exam = Column(String(255), default="Comprehensive Mastery")
    knowledge_gaps_addressed = Column(JSON, nullable=True)  # List of weak topics addressed
    days_data = Column(JSON, nullable=False)  # Array of Day objects with tasks and progress
    status = Column(String(50), default="active")  # "active", "completed"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resource = relationship("LearningResource", back_populates="study_plans")


def init_db():
    """Ensure pgvector extension exists and create all tables."""
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized with pgvector, Phase 2 Quiz models, and Phase 3 Study Plans.")


def get_db():
    """Dependency helper for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
