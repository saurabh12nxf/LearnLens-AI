import os
import json
import re
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from database import Quiz, QuizQuestion, QuizAttempt, LearningResource, DocumentChunk


class QuizService:
    """
    Core Quiz Engine for LearnLens AI (Phase 2):
    Auto-generates topic-tagged multiple choice quizzes from document chunks
    using Groq LLM with a deterministic fallback generator.
    """

    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

        self.groq_client = None
        if self.api_key and self.api_key.strip() not in ["your_groq_api_key_here", ""]:
            try:
                from groq import Groq
                self.groq_client = Groq(
                    api_key=self.api_key.strip(),
                    timeout=30.0,
                    max_retries=2,
                )
            except Exception as e:
                print(f"[QuizService] Groq client init issue: {e}")

    def generate_quiz(
        self,
        resource_id: int,
        num_questions: int = 5,
        target_topic: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Quiz:
        """
        Generates and saves a new Quiz with MCQ questions extracted from the resource.
        """
        doc = self.db.query(LearningResource).filter(LearningResource.id == resource_id).first()
        if not doc:
            raise ValueError(f"Document with ID {resource_id} not found.")

        # Fetch chunks
        chunks = (
            self.db.query(DocumentChunk)
            .filter(DocumentChunk.resource_id == resource_id)
            .order_by(DocumentChunk.chunk_index)
            .limit(12)
            .all()
        )

        if not chunks:
            raise ValueError(f"No indexed text chunks found for document '{doc.title}'.")

        # Combine text excerpts
        context_text = "\n\n".join([f"[Page {c.page_number}]: {c.chunk_text}" for c in chunks])

        # Attempt LLM generation
        quiz_data = None
        if self.groq_client:
            try:
                quiz_data = self._generate_with_llm(doc.title, context_text, num_questions, target_topic)
            except Exception as e:
                print(f"[QuizService] LLM Quiz Generation error: {e}. Using grounded fallback generator.")
                quiz_data = None

        if not quiz_data or not quiz_data.get("questions"):
            quiz_data = self._generate_fallback_quiz(doc.title, chunks, num_questions)

        # Save Quiz to Database
        quiz_title = quiz_data.get("title", f"{doc.title} Practice Quiz")
        quiz = Quiz(
            user_id=user_id,
            resource_id=doc.id,
            title=quiz_title,
            topic=target_topic or quiz_data.get("topic", "General Assessment"),
        )
        self.db.add(quiz)
        self.db.flush()

        # Save Questions
        for q_dict in quiz_data["questions"]:
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_dict["question_text"],
                options=q_dict["options"],
                correct_index=int(q_dict["correct_index"]),
                explanation=q_dict.get("explanation", "Refer to the source material for details."),
                topic=q_dict.get("topic", "Core Concepts"),
                difficulty=q_dict.get("difficulty", "Medium"),
            )
            self.db.add(question)

        self.db.commit()
        self.db.refresh(quiz)
        return quiz

    def _generate_with_llm(
        self,
        doc_title: str,
        context_text: str,
        num_questions: int,
        target_topic: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Calls Groq LLM with a strict JSON output schema."""
        topic_instruction = f"Focus specifically on the topic '{target_topic}'." if target_topic else "Cover key concepts evenly."

        prompt = f"""
You are an expert academic evaluator. Based on the study material below from '{doc_title}', create a {num_questions}-question Multiple Choice Quiz (MCQ).
{topic_instruction}

STUDY MATERIAL:
{context_text[:3500]}

REQUIREMENTS:
1. Provide exactly {num_questions} clear, academic questions testing conceptual understanding.
2. Each question MUST have exactly 4 plausible options (index 0, 1, 2, 3).
3. Specify the 0-based 'correct_index' of the right option.
4. Provide a clear, educational 'explanation' referencing the reason why the answer is correct.
5. Assign a concise 'topic' name (e.g. 'Dynamic Programming', 'Recursion', 'Binary Search Trees').
6. Assign a 'difficulty' ('Easy', 'Medium', 'Hard').
7. Return ONLY valid JSON without extra markdown backticks or text outside the JSON.

JSON SCHEMA:
{{
  "title": "{doc_title} Mastery Quiz",
  "topic": "Course Review",
  "questions": [
    {{
      "question_text": "Question statement here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this is correct...",
      "topic": "Topic Name",
      "difficulty": "Medium"
    }}
  ]
}}
"""
        response = self.groq_client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are a specialized test generator. Return ONLY valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1500,
        )

        content = response.choices[0].message.content.strip()
        # Clean markdown wrappers if present
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)

        data = json.loads(content)
        if "questions" in data and len(data["questions"]) > 0:
            return data
        return None

    def _generate_fallback_quiz(
        self,
        doc_title: str,
        chunks: List[DocumentChunk],
        num_questions: int,
    ) -> Dict[str, Any]:
        """
        Course-aware deterministic fallback quiz generator.
        Extracts questions and factual options directly from the document's actual chunks
        rather than relying on hardcoded DSA questions.
        """
        questions = []
        selected_chunks = chunks[:num_questions] if chunks else []

        for idx, chunk in enumerate(selected_chunks):
            page_num = chunk.page_number
            text = chunk.chunk_text.strip()
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 25]
            if not sentences:
                sentences = [text[:150]]

            target_fact = sentences[0]
            if len(target_fact) > 160:
                target_fact = target_fact[:157] + "..."

            topic = f"{doc_title} (Page {page_num})"
            first_line = text.split("\n")[0].strip()
            clean_first = re.sub(r'^[#*\s0-9.-]+', '', first_line).strip()
            if 3 < len(clean_first) < 40:
                topic = clean_first

            question_text = f"According to {doc_title} on [Page {page_num}], which of the following is true regarding this topic?"
            options = [
                target_fact,
                f"This concept is explicitly deprecated and contradicted by {doc_title}.",
                "This topic applies only under hypothetical assumptions without practical application.",
                "The referenced material does not provide any verifiable facts on this statement."
            ]

            questions.append({
                "question_text": question_text,
                "options": options,
                "correct_index": 0,
                "explanation": f"Grounded directly in {doc_title}, Page {page_num}: \"{target_fact}\"",
                "topic": topic,
                "difficulty": "Medium" if idx % 2 == 0 else "Easy",
            })

        if not questions:
            questions.append({
                "question_text": f"What is the foundational subject addressed in '{doc_title}'?",
                "options": [
                    f"Core principles and analytical methods of {doc_title}",
                    "Unrelated non-technical speculation",
                    "Random conversational summaries",
                    "Deprecated legacy implementations"
                ],
                "correct_index": 0,
                "explanation": f"The document '{doc_title}' introduces core principles of the subject.",
                "topic": "Fundamentals",
                "difficulty": "Easy"
            })

        return {
            "title": f"{doc_title} Grounded Review Quiz",
            "topic": "Comprehensive Review",
            "questions": questions[:num_questions],
        }

    def grade_attempt(
        self,
        quiz_id: int,
        student_name: str,
        user_answers: Dict[int, int],  # {question_id: selected_index}
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates a submitted quiz attempt, updates attempt records,
        and computes per-topic performance.
        """
        quiz = self.db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise ValueError(f"Quiz with ID {quiz_id} not found.")

        questions = quiz.questions
        total_questions = len(questions)
        score = 0
        topic_stats = {}  # {topic: {"correct": int, "total": int}}
        question_evaluations = []

        for q in questions:
            topic = q.topic or "General"
            if topic not in topic_stats:
                topic_stats[topic] = {"correct": 0, "total": 0}
            topic_stats[topic]["total"] += 1

            # Fix: Never use Python `or` on option indices because index 0 evaluates as falsy!
            selected_idx = None
            if q.id in user_answers:
                selected_idx = user_answers[q.id]
            elif str(q.id) in user_answers:
                selected_idx = user_answers[str(q.id)]

            is_correct = (selected_idx is not None and int(selected_idx) == q.correct_index)

            if is_correct:
                score += 1
                topic_stats[topic]["correct"] += 1

            question_evaluations.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "selected_index": selected_idx,
                "correct_index": q.correct_index,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "topic": topic,
                "difficulty": q.difficulty,
            })

        percentage = round((score / total_questions) * 100, 1) if total_questions > 0 else 0.0

        # Save attempt to DB
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=quiz.id,
            student_name=student_name or "Student",
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            user_answers=user_answers,
            topic_results=topic_stats,
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)

        return {
            "attempt_id": attempt.id,
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "student_name": attempt.student_name,
            "score": score,
            "total_questions": total_questions,
            "percentage": percentage,
            "created_at": attempt.created_at.isoformat() if attempt.created_at else datetime.datetime.utcnow().isoformat(),
            "topic_results": topic_stats,
            "questions": question_evaluations,
        }
