"""
LearnLens AI - Phase 4 Learning Intelligence & BKT Test Suite
Validates:
1. 4-Parameter Bayesian Knowledge Tracing (BKT) probability transitions.
2. Cognitive feature extraction (weighted accuracy, streak, error count).
3. Next-question success prediction.
4. AnalyticsService integration with backward-compatible BKT scores.
"""

import sys
from unittest.mock import MagicMock

# Ensure UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from learning_intelligence import BayesianKnowledgeTracer, CognitiveFeatureExtractor, LearningEvent, LearningIntelligenceEngine
from analytics_service import AnalyticsService


def test_phase4_learning_intelligence():
    print("=" * 80)
    print("LearnLens AI: Phase 4 Learning Intelligence & Bayesian Knowledge Tracing")
    print("=" * 80)

    # ------------------------------------------------------------------------
    # 1. BKT Parameter Updates
    # ------------------------------------------------------------------------
    print("\n[1/4] Testing Bayesian Knowledge Tracing (BKT) Transitions...")
    bkt = BayesianKnowledgeTracer(p_l0=0.20, p_t=0.15, p_g=0.25, p_s=0.10)

    # Initial prior
    assert bkt.p_l0 == 0.20

    # Observation: Student answers correctly
    p_l1 = bkt.update_mastery(bkt.p_l0, is_correct=True)
    print(f"  • Prior P(L0)=0.20 -> Post Correct Answer P(L1)={p_l1}")
    assert p_l1 > 0.20, "Correct answer must increase mastery probability"

    # Observation: Student answers incorrectly
    p_l2 = bkt.update_mastery(p_l1, is_correct=False)
    print(f"  • Prior P(L1)={p_l1} -> Post Incorrect Answer P(L2)={p_l2}")
    assert p_l2 < p_l1, "Incorrect answer must reduce mastery probability"

    # Mastery sequence: 4 consecutive correct answers
    trajectory = bkt.trace_sequence([True, True, True, True])
    final_mastery = trajectory[-1]
    print(f"  • 4 Consecutive Correct Answers Trajectory: {trajectory}")
    assert final_mastery >= 0.85, f"Expected high mastery, got {final_mastery}"
    print("✅ BKT transitions verified: Bayesian posterior updates project mastery accurately.")

    # ------------------------------------------------------------------------
    # 2. Next-Item Prediction
    # ------------------------------------------------------------------------
    print("\n[2/4] Testing Next-Item Predictive Accuracy...")
    p_pred = bkt.predict_correct(final_mastery)
    print(f"  • Given Mastery {final_mastery}, Predicted P(Next Correct)={p_pred}")
    assert p_pred > 0.75, "High mastery must predict high chance of correct answer"
    print("✅ Predictive engine verified: Computes next-attempt success probability.")

    # ------------------------------------------------------------------------
    # 3. Cognitive Feature Extraction
    # ------------------------------------------------------------------------
    print("\n[3/4] Testing Cognitive Feature Extractor...")
    events = [
        LearningEvent(user_id=1, topic="Calculus", is_correct=False, difficulty="Hard"),
        LearningEvent(user_id=1, topic="Calculus", is_correct=True, difficulty="Easy"),
        LearningEvent(user_id=1, topic="Calculus", is_correct=True, difficulty="Hard"),
    ]
    feats = CognitiveFeatureExtractor.extract_topic_features(events)
    print(f"  • Extracted Features: {feats}")
    assert feats["total_events"] == 3
    assert feats["current_streak"] == 2
    assert feats["consecutive_errors"] == 0
    assert 0.0 < feats["weighted_accuracy"] <= 1.0
    print("✅ Cognitive feature extraction verified: Tracks difficulty weight and response streaks.")

    # ------------------------------------------------------------------------
    # 4. AnalyticsService Backward Compatibility with BKT
    # ------------------------------------------------------------------------
    print("\n[4/4] Verifying AnalyticsService Integration...")
    mock_db = MagicMock()
    mock_attempt = MagicMock()
    mock_attempt.total_questions = 5
    mock_attempt.score = 4
    mock_attempt.percentage = 80.0
    mock_attempt.topic_results = {"Dynamic Programming": {"correct": 4, "total": 5}}
    mock_attempt.quiz = MagicMock()
    mock_attempt.quiz.title = "DP Assessment"
    mock_attempt.created_at = None

    mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_attempt]

    service = AnalyticsService(mock_db)
    overview = service.get_learner_overview(user_id=1)

    assert "topic_mastery" in overview
    dp_mastery = overview["topic_mastery"][0]
    assert dp_mastery["topic"] == "Dynamic Programming"
    assert dp_mastery["accuracy_percentage"] == 80.0
    assert "bkt_mastery_percentage" in dp_mastery
    assert "predicted_next_success_prob" in dp_mastery
    print(f"  • Topic Mastery Output: {dp_mastery}")
    print("✅ AnalyticsService verified: Existing fields preserved while exposing BKT metrics.")

    print("\n" + "=" * 80)
    print("🏆 ALL PHASE 4 LEARNING INTELLIGENCE & BKT TESTS PASSED (4/4)!")
    print("=" * 80)


if __name__ == "__main__":
    test_phase4_learning_intelligence()
