import os
import sys

# Ensure UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from database import SessionLocal, init_db, LearningResource, Quiz, QuizAttempt
from quiz_service import QuizService
from analytics_service import AnalyticsService

def test_phase2():
    print("=" * 70)
    print("Testing LearnLens AI - Phase 2 (Quiz Engine & Learner Analytics)")
    print("=" * 70)

    init_db()
    db = SessionLocal()

    doc = db.query(LearningResource).first()
    if not doc:
        print("[Error] No document found in database. Run demo_rag.py first.")
        return

    print(f"\n[1/4] Generating Quiz for Document: '{doc.title}' (ID: {doc.id})...")
    quiz_service = QuizService(db)
    quiz = quiz_service.generate_quiz(resource_id=doc.id, num_questions=5)
    print(f"✅ Quiz Created: ID={quiz.id}, Title='{quiz.title}', Questions={len(quiz.questions)}")

    for idx, q in enumerate(quiz.questions, 1):
        print(f"   Q{idx} [{q.topic}] ({q.difficulty}): {q.question_text[:65]}...")
        print(f"       Options count: {len(q.options)} | Correct: Option {q.correct_index}")

    print("\n[2/4] Simulating Student Quiz Attempt (Student answers 4 correct, 1 wrong)...")
    # Simulate: first 4 correct, last 1 wrong
    user_answers = {}
    for idx, q in enumerate(quiz.questions):
        if idx < 4:
            user_answers[q.id] = q.correct_index  # Correct
        else:
            user_answers[q.id] = (q.correct_index + 1) % 4  # Deliberate wrong answer to test gap detection!

    attempt_result = quiz_service.grade_attempt(
        quiz_id=quiz.id,
        student_name="Test Learner",
        user_answers=user_answers,
    )
    print(f"✅ Graded Attempt ID={attempt_result['attempt_id']}")
    print(f"   Score: {attempt_result['score']}/{attempt_result['total_questions']} ({attempt_result['percentage']}%)")
    print(f"   Topic Results: {attempt_result['topic_results']}")

    print("\n[3/4] Testing Learner Analytics & Knowledge Gap Detection...")
    analytics_service = AnalyticsService(db)
    overview = analytics_service.get_learner_overview(student_name="Test Learner")
    print(f"✅ Total Quizzes Taken: {overview['total_quizzes_taken']}")
    print(f"✅ Overall Score: {overview['average_score_percentage']}%")
    print("\n📊 Topic-Wise Mastery Breakdown:")
    for t in overview['topic_mastery']:
        print(f"   - {t['topic']:<24}: {t['accuracy_percentage']:>5.1f}% [{t['mastery_tier']}] ({t['questions_correct']}/{t['questions_attempted']} correct)")

    print("\n⚠️ Diagnosed Knowledge Gaps (Topics < 60% accuracy):")
    if overview['knowledge_gaps']:
        for g in overview['knowledge_gaps']:
            print(f"   🚨 [{g['gap_severity']} Gap] {g['topic']} ({g['accuracy']}%): {g['recommendation']}")
    else:
        print("   (No knowledge gaps detected)")

    print("\n[4/4] Phase 2 Backend Verification Complete!")
    db.close()

if __name__ == "__main__":
    test_phase2()
