# ADR-004: Cognitive Learner Analytics via Bayesian Knowledge Tracing (BKT)

## Context & Problem Statement
Baseline learner analytics relied solely on cumulative empirical accuracy with a flat 60% threshold.
While simple, a cumulative average has notable pedagogical deficiencies:
- An early series of mistakes permanently drags down a student's score even after they have fully mastered the topic.
- A lucky guess is treated identically to sustained conceptual understanding.
- It lacks predictive power for estimating probability of mastery on future questions.

## Decision
We introduced the standard 4-parameter **Corbett & Anderson Bayesian Knowledge Tracing (BKT)** model alongside the empirical baseline:
- $P(L_0) = 0.20$ (Prior knowledge)
- $P(T) = 0.15$ (Learning transition rate per practice opportunity)
- $P(G) = 0.25$ (Guess rate for 4-option MCQs)
- $P(S) = 0.10$ (Slip rate)

## Mathematical Formulations
1. **Bayes Posterior Given Observation**:
   $$\text{If Correct: } P(L_t | \text{obs}) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$
   $$\text{If Incorrect: } P(L_t | \text{obs}) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$

2. **Transition Projection**:
   $$P(L_{t+1}) = P(L_t | \text{obs}) + (1 - P(L_t | \text{obs})) \cdot P(T)$$

3. **Predictive Performance**:
   $$P(\text{Correct}_{t+1}) = P(L_{t+1}) \cdot (1 - P(S)) + (1 - P(L_{t+1})) \cdot P(G)$$

## Consequences
- Tracks true cognitive mastery over time rather than just counting correct answers.
- Seamlessly backward-compatible: exposes `bkt_mastery_percentage` and `predicted_next_success_prob` while preserving existing response contracts.
