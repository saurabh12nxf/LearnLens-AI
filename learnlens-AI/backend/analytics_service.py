from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import QuizAttempt, Quiz, QuizQuestion, LearningResource


class AnalyticsService:
    """
    Learner Analytics & Knowledge Gap Detection Engine (Phase 2):
    Implements PRD Section 4.2 (Learner Performance Analysis) and
    Section 4.3 (Knowledge Gap Detection).
    """

    def __init__(self, db: Session):
        self.db = db

    def get_learner_overview(
        self,
        student_name: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Computes aggregate metrics, topic-wise accuracy, mastery tiers,
        and automatically flags Knowledge Gaps (< 60% accuracy).
        Isolates records by user_id for multi-tenant accounts.
        """
        query = self.db.query(QuizAttempt)
        if user_id:
            query = query.filter(QuizAttempt.user_id == user_id)
        elif student_name:
            query = query.filter(QuizAttempt.student_name == student_name)

        attempts = query.order_by(QuizAttempt.created_at.desc()).all()

        total_quizzes_taken = len(attempts)
        if total_quizzes_taken == 0:
            return {
                "total_quizzes_taken": 0,
                "total_questions_attempted": 0,
                "average_score_percentage": 0.0,
                "topic_mastery": [],
                "knowledge_gaps": [],
                "recent_attempts": [],
                "message": "No quiz attempts recorded yet. Take a quiz to view your learning analytics.",
            }

        total_questions_attempted = sum(a.total_questions for a in attempts)
        total_correct = sum(a.score for a in attempts)
        average_score_percentage = round((total_correct / total_questions_attempted) * 100, 1) if total_questions_attempted > 0 else 0.0

        # Aggregate performance by topic across all attempts
        topic_aggregates = {}  # {topic: {"correct": int, "total": int}}

        for a in attempts:
            if not a.topic_results:
                continue
            for topic, stats in a.topic_results.items():
                if topic not in topic_aggregates:
                    topic_aggregates[topic] = {"correct": 0, "total": 0}
                topic_aggregates[topic]["correct"] += stats.get("correct", 0)
                topic_aggregates[topic]["total"] += stats.get("total", 0)

        # Compute Mastery Tiers & Detect Knowledge Gaps (Threshold < 60%)
        topic_mastery_list = []
        knowledge_gaps = []

        for topic, stats in topic_aggregates.items():
            tot = stats["total"]
            corr = stats["correct"]
            acc = round((corr / tot) * 100, 1) if tot > 0 else 0.0

            if acc >= 80.0:
                tier = "Mastered"
                tier_color = "#10b981"  # Emerald
            elif acc >= 60.0:
                tier = "Proficient"
                tier_color = "#6366f1"  # Indigo
            else:
                tier = "Needs Revision"
                tier_color = "#f43f5e"  # Rose

            topic_item = {
                "topic": topic,
                "questions_attempted": tot,
                "questions_correct": corr,
                "accuracy_percentage": acc,
                "mastery_tier": tier,
                "tier_color": tier_color,
            }
            topic_mastery_list.append(topic_item)

            # PRD Requirement: Automatically flag topics with low performance (< 60%)
            if acc < 60.0:
                knowledge_gaps.append({
                    "topic": topic,
                    "accuracy": acc,
                    "gap_severity": "High" if acc < 40.0 else "Moderate",
                    "recommendation": f"Review lecture notes and practice exercises for '{topic}'. Accuracy is currently {acc}%.",
                })

        # Sort topics by accuracy ascending (weakest topics first)
        topic_mastery_list.sort(key=lambda x: x["accuracy_percentage"])
        knowledge_gaps.sort(key=lambda x: x["accuracy"])

        # Format recent attempts
        recent_attempts = []
        for a in attempts[:8]:
            quiz_title = a.quiz.title if a.quiz else "Quiz"
            recent_attempts.append({
                "attempt_id": a.id,
                "quiz_id": a.quiz_id,
                "quiz_title": quiz_title,
                "score": a.score,
                "total_questions": a.total_questions,
                "percentage": a.percentage,
                "created_at": a.created_at.strftime("%b %d, %H:%M") if a.created_at else None,
            })

        return {
            "total_quizzes_taken": total_quizzes_taken,
            "total_questions_attempted": total_questions_attempted,
            "average_score_percentage": average_score_percentage,
            "topic_mastery": topic_mastery_list,
            "knowledge_gaps": knowledge_gaps,
            "recent_attempts": recent_attempts,
        }
