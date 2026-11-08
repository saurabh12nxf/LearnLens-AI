"""
LearnLens AI - Phase 4 Learning Intelligence & Knowledge Tracing Engine
Implements:
1. Structured learning-event logging and extraction.
2. Cognitive feature engineering (rolling accuracy, streak of errors, difficulty weighting).
3. Baseline threshold model vs. Bayesian Knowledge Tracing (BKT).
4. Predictive mastery assessment for adaptive learning.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import math


@dataclass
class LearningEvent:
    user_id: int
    topic: str
    is_correct: bool
    difficulty: str = "Medium"
    timestamp: Optional[str] = None


class BayesianKnowledgeTracer:
    """
    Standard Corbett & Anderson 4-Parameter Bayesian Knowledge Tracing (BKT) Model.
    
    Parameters:
    - p_l0: Initial probability that the student knows the concept (Prior Knowledge)
    - p_t:  Probability of transitioning from unlearned to learned state after an exercise (Learn rate)
    - p_g:  Probability of guessing the answer correctly despite not knowing the concept (Guess rate)
    - p_s:  Probability of slipping (answering incorrectly despite knowing the concept) (Slip rate)
    """

    def __init__(
        self,
        p_l0: float = 0.20,
        p_t: float = 0.15,
        p_g: float = 0.25,
        p_s: float = 0.10,
    ):
        self.p_l0 = p_l0
        self.p_t = p_t
        self.p_g = p_g
        self.p_s = p_s

    def update_mastery(self, prior_p_l: float, is_correct: bool) -> float:
        """
        Calculates the posterior probability P(L_t | observation) and projects
        forward with transition probability P(T) to obtain P(L_{t+1}).
        """
        p_l = max(0.001, min(0.999, prior_p_l))

        if is_correct:
            # Bayes theorem given correct answer:
            # P(L | correct) = P(L) * (1 - S) / [ P(L) * (1 - S) + (1 - P(L)) * G ]
            numerator = p_l * (1.0 - self.p_s)
            denominator = numerator + ((1.0 - p_l) * self.p_g)
        else:
            # Bayes theorem given incorrect answer:
            # P(L | incorrect) = P(L) * S / [ P(L) * S + (1 - P(L)) * (1 - G) ]
            numerator = p_l * self.p_s
            denominator = numerator + ((1.0 - p_l) * (1.0 - self.p_g))

        posterior_p_l = numerator / max(1e-9, denominator)

        # Transition forward: student may have learned during the practice step
        # P(L_{t+1}) = posterior + (1 - posterior) * P(T)
        next_p_l = posterior_p_l + ((1.0 - posterior_p_l) * self.p_t)
        return round(float(next_p_l), 4)

    def predict_correct(self, p_l: float) -> float:
        """
        Predicts the likelihood of the student answering the next question correctly:
        P(Correct) = P(L) * (1 - S) + (1 - P(L)) * G
        """
        p_correct = (p_l * (1.0 - self.p_s)) + ((1.0 - p_l) * self.p_g)
        return round(float(p_correct), 4)

    def trace_sequence(self, responses: List[bool], initial_p_l: Optional[float] = None) -> List[float]:
        """
        Traces a sequence of binary responses (True=correct, False=incorrect)
        and returns the mastery trajectory over time.
        """
        current_p_l = initial_p_l if initial_p_l is not None else self.p_l0
        trajectory = [current_p_l]

        for resp in responses:
            current_p_l = self.update_mastery(current_p_l, resp)
            trajectory.append(current_p_l)

        return trajectory


class CognitiveFeatureExtractor:
    """
    Extracts cognitive and behavioral features from raw student interaction sequences.
    """

    DIFFICULTY_WEIGHTS = {
        "Easy": 1.0,
        "Medium": 1.5,
        "Hard": 2.0,
    }

    @classmethod
    def extract_topic_features(cls, events: List[LearningEvent]) -> Dict[str, Any]:
        """Extracts engineered ML features for a specific student topic."""
        if not events:
            return {
                "total_events": 0,
                "empirical_accuracy": 0.0,
                "weighted_accuracy": 0.0,
                "consecutive_errors": 0,
                "current_streak": 0,
                "mastery_trend": 0.0,
            }

        total = len(events)
        correct_count = sum(1 for e in events if e.is_correct)
        empirical_acc = round(correct_count / total, 4)

        # Weighted accuracy by question difficulty
        weighted_correct = sum(cls.DIFFICULTY_WEIGHTS.get(e.difficulty, 1.0) for e in events if e.is_correct)
        total_weight = sum(cls.DIFFICULTY_WEIGHTS.get(e.difficulty, 1.0) for e in events)
        weighted_acc = round(weighted_correct / max(1e-9, total_weight), 4)

        # Consecutive errors / streaks
        streak = 0
        consecutive_errors = 0
        for e in reversed(events):
            if e.is_correct:
                if consecutive_errors == 0:
                    streak += 1
                else:
                    break
            else:
                if streak == 0:
                    consecutive_errors += 1
                else:
                    break

        # Recent trend (last 3 vs overall)
        recent_events = events[-3:]
        recent_acc = sum(1 for e in recent_events if e.is_correct) / len(recent_events)
        trend = round(recent_acc - empirical_acc, 4)

        return {
            "total_events": total,
            "empirical_accuracy": empirical_acc,
            "weighted_accuracy": weighted_acc,
            "consecutive_errors": consecutive_errors,
            "current_streak": streak,
            "mastery_trend": trend,
        }


class LearningIntelligenceEngine:
    """
    Unified Learning Intelligence Engine combining:
    1. Empirical mastery metrics
    2. Bayesian Knowledge Tracing (BKT) state estimates
    3. Next-attempt predictive performance
    """

    def __init__(self):
        self.bkt = BayesianKnowledgeTracer()
        self.feature_extractor = CognitiveFeatureExtractor()

    def analyze_student_topic(
        self,
        topic: str,
        events: List[LearningEvent],
    ) -> Dict[str, Any]:
        """
        Performs full cognitive diagnosis on a student's topic history.
        """
        features = self.feature_extractor.extract_topic_features(events)
        responses = [e.is_correct for e in events]
        trajectory = self.bkt.trace_sequence(responses)
        current_bkt_mastery = trajectory[-1] if trajectory else self.bkt.p_l0
        predicted_p_next = self.bkt.predict_correct(current_bkt_mastery)

        # Diagnose Knowledge Gap: dual criteria (Empirical < 0.60 or BKT < 0.65)
        is_knowledge_gap = (features["empirical_accuracy"] < 0.60) or (current_bkt_mastery < 0.65)

        if current_bkt_mastery >= 0.85:
            bkt_tier = "Mastered (BKT Confirmed)"
        elif current_bkt_mastery >= 0.65:
            bkt_tier = "Proficient"
        else:
            bkt_tier = "Needs Remediation"

        return {
            "topic": topic,
            "total_attempts": features["total_events"],
            "empirical_accuracy": features["empirical_accuracy"],
            "weighted_accuracy": features["weighted_accuracy"],
            "bkt_mastery_probability": current_bkt_mastery,
            "predicted_next_success_prob": predicted_p_next,
            "consecutive_errors": features["consecutive_errors"],
            "mastery_trend": features["mastery_trend"],
            "is_knowledge_gap": is_knowledge_gap,
            "bkt_tier": bkt_tier,
            "bkt_trajectory": trajectory,
        }

