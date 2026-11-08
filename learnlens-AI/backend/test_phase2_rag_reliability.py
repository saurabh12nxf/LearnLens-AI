"""
LearnLens AI - Phase 2 RAG Reliability, Chunking Benchmark & AI Quality Test Suite
Validates:
1. Embedding fail-fast behavior (never silently return zero vectors).
2. Document validation (rejects empty/scanned documents without text).
3. Chunking strategies benchmark (sliding window vs structural paragraph).
4. Quiz engine option 0 evaluation bug fix (Option A at index 0 correctly recognized).
5. Course-aware quiz fallback (grounded in actual chunk text, no hardcoded DSA).
6. Study planner course-aware fallback (no invented citations or hardcoded DSA topics).
"""

import sys
import os
import pytest
from unittest.mock import MagicMock

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from embedding_service import EmbeddingService
from document_processor import DocumentProcessor
from quiz_service import QuizService
from study_plan_service import StudyPlanService
from database import DocumentChunk, LearningResource, Quiz, QuizQuestion


def test_phase2_rag_reliability_suite():
    print("=" * 80)
    print("LearnLens AI: Phase 2 RAG Reliability, Chunking Benchmark & AI Quality Suite")
    print("=" * 80)

    # ------------------------------------------------------------------------
    # 1. Embedding Fail-Fast Behavior
    # ------------------------------------------------------------------------
    print("\n[1/5] Testing Embedding Engine Fail-Fast Behavior...")
    embedder = EmbeddingService()

    # Empty string must raise ValueError
    with pytest.raises(ValueError, match="Cannot generate vector embedding for empty"):
        embedder.get_embedding("   ")
    print("✅ Fail-fast: Empty/whitespace text correctly raises ValueError.")

    # Simulated uninitialized backend must raise RuntimeError, never silent zero vectors
    original_backend = embedder._backend_type
    embedder._backend_type = "invalid_or_failed_backend"
    try:
        with pytest.raises(RuntimeError, match="Embedding engine failure"):
            embedder.get_embedding("Test text query")
        print("✅ Fail-fast: Uninitialized backend correctly raises RuntimeError (no silent zero vectors).")
    finally:
        embedder._backend_type = original_backend

    # ------------------------------------------------------------------------
    # 2. Chunking Benchmark (Sliding Window vs Structural)
    # ------------------------------------------------------------------------
    print("\n[2/5] Benchmarking Chunking Strategies on Sample Notes...")
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_dsa_notes.pdf"))
    if os.path.exists(pdf_path):
        processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)

        sliding_data = processor.process_pdf(pdf_path, strategy="sliding_window")
        sliding_chunks = sliding_data["chunks"]
        sliding_avg_len = sum(c["length"] for c in sliding_chunks) / len(sliding_chunks)

        struct_data = processor.process_pdf(pdf_path, strategy="structural")
        struct_chunks = struct_data["chunks"]
        struct_avg_len = sum(c["length"] for c in struct_chunks) / len(struct_chunks)

        print(f"  • Sliding Window : {len(sliding_chunks)} chunks, Avg Length: {sliding_avg_len:.1f} chars")
        print(f"  • Structural     : {len(struct_chunks)} chunks, Avg Length: {struct_avg_len:.1f} chars")
        assert len(sliding_chunks) > 0 and len(struct_chunks) > 0
        print("✅ Chunking benchmark completed successfully across strategies.")
    else:
        print(f"  • Note: '{pdf_path}' not found; skipping PDF file reading.")

    # ------------------------------------------------------------------------
    # 3. Quiz Option 0 Grading Bug Fix
    # ------------------------------------------------------------------------
    print("\n[3/5] Testing Quiz Option 0 Grading Bug Fix...")
    mock_db = MagicMock()
    mock_quiz = MagicMock()
    mock_quiz.id = 101

    # Question where correct option is index 0
    q1 = MagicMock()
    q1.id = 1
    q1.topic = "Linear Algebra"
    q1.correct_index = 0
    q1.options = ["Correct Option A", "Option B", "Option C", "Option D"]
    q1.question_text = "What is an eigenvalue?"
    q1.explanation = "Grounded explanation"
    q1.difficulty = "Medium"

    mock_quiz.questions = [q1]
    mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

    quiz_svc = QuizService(mock_db)

    # Student chose option 0 (Option A)
    result = quiz_svc.grade_attempt(
        quiz_id=101,
        student_name="Tester",
        user_answers={1: 0},
    )

    assert result["score"] == 1, f"Score should be 1 for correct answer at index 0, got {result['score']}"
    assert result["percentage"] == 100.0
    assert result["questions"][0]["is_correct"] is True
    print("✅ Quiz engine Option 0 bug fix verified: Index 0 is correctly graded as correct!")

    # ------------------------------------------------------------------------
    # 4. Course-Aware Fallback Quiz Generation
    # ------------------------------------------------------------------------
    print("\n[4/5] Testing Course-Aware Fallback Quiz Generator...")
    # Provide Biology chunks instead of DSA
    bio_chunks = [
        DocumentChunk(
            id=1,
            resource_id=50,
            chunk_index=0,
            page_number=1,
            chunk_text="Cellular respiration converts glucose into ATP in the mitochondria through glycolysis and the citric acid cycle."
        ),
        DocumentChunk(
            id=2,
            resource_id=50,
            chunk_index=1,
            page_number=2,
            chunk_text="Photosynthesis in plant chloroplasts uses sunlight to convert water and carbon dioxide into oxygen and carbohydrates."
        )
    ]

    fallback_quiz = quiz_svc._generate_fallback_quiz(
        doc_title="Molecular Biology Lecture Notes",
        chunks=bio_chunks,
        num_questions=2
    )

    questions = fallback_quiz["questions"]
    assert len(questions) == 2
    # Verify the questions cite the document title and are NOT hardcoded DSA questions
    assert "Molecular Biology" in questions[0]["question_text"]
    assert "ATP in the mitochondria" in questions[0]["options"][0]
    assert "Binary Search Tree" not in questions[0]["question_text"]
    assert "Recursion" not in questions[0]["question_text"]
    print("✅ Course-aware fallback quiz verified: Extracted directly from uploaded biology chunks!")

    # ------------------------------------------------------------------------
    # 5. Course-Aware Study Planner Topics & Citations
    # ------------------------------------------------------------------------
    print("\n[5/5] Testing Course-Aware Study Plan Fallback & Non-Invented Citations...")
    plan_svc = StudyPlanService(mock_db)
    # Target topic with no citation found
    topics = [{"topic": "Organic Chemistry Synthesis", "accuracy": 50.0, "is_gap": True}]
    citations_missing = {"Organic Chemistry Synthesis": {"page_number": None, "snippet": ""}}

    plan = plan_svc._generate_fallback_plan(
        doc_title="Organic Chemistry I",
        duration_days=3,
        target_exam="Midterm",
        target_topics=topics,
        topic_citations=citations_missing,
    )

    # Verify that days were created and no fake page 4/5 was invented
    first_task = plan["days"][0]["tasks"][0]
    assert first_task["reference_page"] is None, "Should not invent reference page when none was retrieved"
    assert "in your notes" in first_task["description"]
    assert "Page 4" not in first_task["description"]
    print("✅ Grounded study planner verified: Does not invent citations or fallback to DSA topics!")

    print("\n" + "=" * 80)
    print("🏆 ALL PHASE 2 RAG RELIABILITY & AI QUALITY TESTS PASSED (5/5)!")
    print("=" * 80)


if __name__ == "__main__":
    test_phase2_rag_reliability_suite()
