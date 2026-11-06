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
    Boolean,
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


# ============================================================================
# User & Authentication Model (Production-Grade Multi-Tenant Isolation)
# ============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships - each user owns their dedicated learning space
    resources = relationship(
        "LearningResource",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="LearningResource.id.desc()",
    )
    quizzes = relationship(
        "Quiz",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Quiz.id.desc()",
    )
    attempts = relationship(
        "QuizAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="QuizAttempt.created_at.desc()",
    )
    study_plans = relationship(
        "StudyPlan",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="StudyPlan.id.desc()",
    )


# ============================================================================
# Phase 1: Document & Chunk Models
# ============================================================================

class LearningResource(Base):
    __tablename__ = "learning_resources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="resources")
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
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    user = relationship("User", back_populates="quizzes")
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
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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

    user = relationship("User", back_populates="attempts")
    quiz = relationship("Quiz", back_populates="attempts")


# ============================================================================
# Phase 3: Personalized Study Plans & Recommendation Engine Models
# ============================================================================

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    user = relationship("User", back_populates="study_plans")
    resource = relationship("LearningResource", back_populates="study_plans")


def init_db():
    """Ensure pgvector extension exists, create all tables, and ensure user_id migration."""
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

    # Create tables (creates users table if not exists)
    Base.metadata.create_all(bind=engine)

    # Ensure user_id column exists on existing tables for smooth migration
    with engine.connect() as conn:
        tables_to_migrate = ["learning_resources", "quizzes", "quiz_attempts", "study_plans"]
        for tbl in tables_to_migrate:
            migration_sql = text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='{tbl}' AND column_name='user_id'
                    ) THEN
                        ALTER TABLE {tbl} ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
                    END IF;
                END $$;
            """)
            conn.execute(migration_sql)
        conn.commit()

    print("Database tables initialized with Users, pgvector, Quizzes, Analytics, and Study Plans.")


def get_db():
    """Dependency helper for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
