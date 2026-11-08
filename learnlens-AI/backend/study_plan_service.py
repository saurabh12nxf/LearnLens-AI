import os
import json
import re
import copy
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import StudyPlan, LearningResource, DocumentChunk
from analytics_service import AnalyticsService
from vector_store import VectorStore


class StudyPlanService:
    """
    Core Recommendation Engine for LearnLens AI (Phase 3):
    Synthesizes adaptive, evidence-based daily study roadmaps tailored to each
    learner's diagnosed Knowledge Gaps and target exam timeline.
    """

    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
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
                print(f"[StudyPlanService] Groq client init issue: {e}")

    def generate_study_plan(
        self,
        resource_id: Optional[int] = None,
        duration_days: int = 5,
        student_name: str = "Student",
        target_exam: str = "Comprehensive Mastery",
        focus_topic: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> StudyPlan:
        """
        Creates an adaptive study plan tailored to the student's weaknesses
        and target timeframe.
        """
        # 1. Fetch Learner Analytics & Knowledge Gaps
        overview = self.analytics_service.get_learner_overview(student_name=student_name, user_id=user_id)
        knowledge_gaps = overview.get("knowledge_gaps", [])
        topic_mastery = overview.get("topic_mastery", [])

        # 2. Identify Target Learning Resource
        resource = None
        if resource_id:
            query = self.db.query(LearningResource).filter(LearningResource.id == resource_id)
            if user_id:
                query = query.filter(LearningResource.user_id == user_id)
            resource = query.first()
        if not resource:
            # Fall back to latest uploaded resource for this user
            res_query = self.db.query(LearningResource)
            if user_id:
                res_query = res_query.filter(LearningResource.user_id == user_id)
            resource = res_query.order_by(LearningResource.id.desc()).first()

        doc_title = resource.title if resource else "Study Course"

        # 3. Determine Topics to Address
        target_topics = []
        if focus_topic:
            # Specific focus requested by student
            target_topics.append({
                "topic": focus_topic,
                "accuracy": next((g["accuracy"] for g in knowledge_gaps if g["topic"].lower() == focus_topic.lower()), 50.0),
                "is_gap": True,
            })

        # Add diagnosed gaps (< 60% accuracy)
        for gap in knowledge_gaps:
            if not any(t["topic"].lower() == gap["topic"].lower() for t in target_topics):
                target_topics.append({
                    "topic": gap["topic"],
                    "accuracy": gap["accuracy"],
                    "is_gap": True,
                })

        # If still need more topics to fill schedule (or cold-start with 0 gaps)
        for tm in topic_mastery:
            if not any(t["topic"].lower() == tm["topic"].lower() for t in target_topics):
                target_topics.append({
                    "topic": tm["topic"],
                    "accuracy": tm["accuracy_percentage"],
                    "is_gap": tm["accuracy_percentage"] < 60.0,
                })

        # Fallback topics if no quiz data at all (Cold Start)
        if not target_topics:
            target_topics = [
                {"topic": "Core Fundamentals & Definitions", "accuracy": 0.0, "is_gap": False},
                {"topic": "Data Structures & Trees", "accuracy": 0.0, "is_gap": False},
                {"topic": "Recursive Divide & Conquer", "accuracy": 0.0, "is_gap": False},
                {"topic": "Dynamic Programming & Optimization", "accuracy": 0.0, "is_gap": False},
            ]

        # 4. Search document chunks for page citations and text context
        topic_citations = self._retrieve_citations_for_topics(target_topics, resource.id if resource else None)

        # 5. Generate Daily Schedule with LLM or Grounded Fallback
        plan_data = None
        if self.groq_client:
            try:
                plan_data = self._generate_with_llm(
                    doc_title=doc_title,
                    duration_days=duration_days,
                    target_exam=target_exam,
                    target_topics=target_topics,
                    topic_citations=topic_citations,
                )
            except Exception as e:
                print(f"[StudyPlanService] LLM Study Plan error: {e}. Using deterministic grounded generator.")
                plan_data = None

        if not plan_data or not plan_data.get("days"):
            plan_data = self._generate_fallback_plan(
                doc_title=doc_title,
                duration_days=duration_days,
                target_exam=target_exam,
                target_topics=target_topics,
                topic_citations=topic_citations,
            )

        # 6. Save Study Plan to Database
        title = plan_data.get("title", f"{duration_days}-Day {target_exam} Roadmap")
        study_plan = StudyPlan(
            user_id=user_id,
            resource_id=resource.id if resource else None,
            student_name=student_name or "Student",
            title=title,
            duration_days=duration_days,
            target_exam=target_exam,
            knowledge_gaps_addressed=target_topics,
            days_data=plan_data.get("days", []),
            status="active",
        )
        self.db.add(study_plan)
        self.db.commit()
        self.db.refresh(study_plan)

        return study_plan

    def _retrieve_citations_for_topics(
        self,
        target_topics: List[Dict[str, Any]],
        resource_id: Optional[int],
    ) -> Dict[str, Dict[str, Any]]:
        """
        Retrieves the exact page references and key excerpts for each topic
        from indexed document chunks using semantic search.
        """
        citations = {}
        if not resource_id:
            return citations

        try:
            store = VectorStore(self.db)
            for item in target_topics:
                topic_name = item["topic"]
                results = store.search_semantic(
                    query=topic_name,
                    resource_id=resource_id,
                    top_k=2,
                )
                if results:
                    top_match = results[0]
                    citations[topic_name] = {
                        "page_number": top_match["page_number"],
                        "snippet": top_match["text_snippet"][:180],
                    }
                else:
                    citations[topic_name] = {"page_number": 1, "snippet": ""}
        except Exception as e:
            print(f"[StudyPlanService] Citation retrieval error: {e}")

        return citations

    def _generate_with_llm(
        self,
        doc_title: str,
        duration_days: int,
        target_exam: str,
        target_topics: List[Dict[str, Any]],
        topic_citations: Dict[str, Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Calls Groq LLM with a strict JSON output schema."""
        topics_str = "\n".join([
            f"- Topic: {t['topic']} (Current Accuracy: {t['accuracy']}%, Diagnosed Gap: {t['is_gap']})"
            for t in target_topics
        ])

        citations_str = "\n".join([
            f"- {topic}: Found on Page {info.get('page_number', 1)}"
            for topic, info in topic_citations.items()
        ])

        prompt = f"""
You are an expert academic learning advisor. Design a personalized {duration_days}-day study plan for a student studying '{doc_title}'.
Target Objective: {target_exam}

STUDENT TOPIC PERFORMANCE & DIAGNOSED KNOWLEDGE GAPS:
{topics_str}

DOCUMENT CITATIONS & PAGES:
{citations_str}

REQUIREMENTS:
1. Distribute the review across exactly {duration_days} days.
2. Prioritize diagnosed Knowledge Gaps (topics with low accuracy) in the early days.
3. Every day must include 2 to 3 actionable tasks (e.g. concept reading with specific page numbers, targeted practice drill, self-reflection).
4. For reading tasks, reference the exact Page number from the citations where available.
5. Provide realistic study times (e.g. 30 to 45 minutes per day).
6. Return ONLY valid JSON without extra markdown.

JSON SCHEMA:
{{
  "title": "{duration_days}-Day {target_exam} Master Plan",
  "days": [
    {{
      "day_number": 1,
      "theme": "Theme title",
      "primary_topic": "Topic name",
      "is_gap_focus": true,
      "gap_accuracy": 0.0,
      "estimated_minutes": 45,
      "tasks": [
        {{
          "id": "task_1_1",
          "title": "Task title",
          "description": "Clear actionable instructions referencing page numbers...",
          "type": "reading",
          "reference_page": 3,
          "completed": false
        }},
        {{
          "id": "task_1_2",
          "title": "Topic Practice Drill",
          "description": "Solve 3-5 concept check questions on this topic.",
          "type": "drill",
          "topic": "Topic name",
          "completed": false
        }}
      ]
    }}
  ]
}}
"""
        response = self.groq_client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are a personalized study advisor. Return ONLY valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=2200,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)

        data = json.loads(content)
        if "days" in data and len(data["days"]) > 0:
            return data
        return None

    def _generate_fallback_plan(
        self,
        doc_title: str,
        duration_days: int,
        target_exam: str,
        target_topics: List[Dict[str, Any]],
        topic_citations: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Deterministic, grounded study plan generator.
        Constructs an adaptive schedule without relying on external network.
        """
        days = []
        topic_count = len(target_topics)

        for day_num in range(1, duration_days + 1):
            # Select topic cyclically, prioritizing weak topics first
            topic_idx = (day_num - 1) % topic_count
            t_info = target_topics[topic_idx]
            topic_name = t_info["topic"]
            is_gap = t_info.get("is_gap", False)
            accuracy = t_info.get("accuracy", 0.0)

            page = topic_citations.get(topic_name, {}).get("page_number", max(1, day_num))

            if is_gap or accuracy < 60.0:
                theme = f"Core Gap Remediation: {topic_name}"
                task_1_desc = f"Carefully review notes on [Page {page}] regarding {topic_name}. Focus on fundamental principles, definitions, and step-by-step examples."
                task_2_desc = f"Practice 3-5 targeted practice questions for {topic_name} to raise mastery level above 60%."
            elif day_num == duration_days:
                theme = "Comprehensive Course Review & Mock Test"
                task_1_desc = f"Review high-level summaries and formulas across all topics in '{doc_title}'."
                task_2_desc = "Take a full 5-question multi-topic assessment to benchmark final readiness."
            else:
                theme = f"Concept Deep-Dive: {topic_name}"
                task_1_desc = f"Read core sections for {topic_name} on [Page {page}], analyzing algorithmic performance and trade-offs."
                task_2_desc = f"Complete practice drills and write a short 2-minute summary of {topic_name} key takeaways."

            tasks = [
                {
                    "id": f"task_{day_num}_1",
                    "title": f"Review {topic_name} Notes",
                    "description": task_1_desc,
                    "type": "reading",
                    "reference_page": page,
                    "completed": False,
                },
                {
                    "id": f"task_{day_num}_2",
                    "title": f"Practice Drill: {topic_name}",
                    "description": task_2_desc,
                    "type": "drill",
                    "topic": topic_name,
                    "completed": False,
                },
            ]

            if day_num == duration_days:
                tasks.append({
                    "id": f"task_{day_num}_3",
                    "title": "Mastery Verification Check",
                    "description": "Inspect your Learner Analytics dashboard to verify all Knowledge Gaps are resolved.",
                    "type": "reflection",
                    "completed": False,
                })

            days.append({
                "day_number": day_num,
                "theme": theme,
                "primary_topic": topic_name,
                "is_gap_focus": is_gap,
                "gap_accuracy": accuracy,
                "estimated_minutes": 45 if is_gap else 35,
                "tasks": tasks,
            })

        return {
            "title": f"{duration_days}-Day {target_exam} Personalized Roadmap",
            "days": days,
        }

    def get_study_plans(
        self,
        student_name: Optional[str] = None,
        resource_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Lists all study plans with their completion metrics."""
        query = self.db.query(StudyPlan).order_by(StudyPlan.id.desc())
        if user_id:
            query = query.filter(StudyPlan.user_id == user_id)
        elif student_name:
            query = query.filter(StudyPlan.student_name == student_name)
        if resource_id:
            query = query.filter(StudyPlan.resource_id == resource_id)

        plans = query.all()
        return [self._format_plan_summary(p) for p in plans]

    def get_study_plan_by_id(self, plan_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves complete details of a specific study plan."""
        plan = self.db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
        if not plan:
            return None
        return self._format_plan_detail(plan)

    def toggle_task_completion(
        self,
        plan_id: int,
        task_id: str,
        completed: bool,
    ) -> Optional[Dict[str, Any]]:
        """
        Updates task completion status in days_data and computes
        overall plan progress.
        """
        plan = self.db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
        if not plan:
            return None

        days = copy.deepcopy(plan.days_data)
        found = False

        for day in days:
            for task in day.get("tasks", []):
                if task["id"] == task_id:
                    task["completed"] = completed
                    found = True
                    break
            if found:
                break

        if not found:
            return None

        # Recompute overall completion
        total_tasks = sum(len(d.get("tasks", [])) for d in days)
        completed_tasks = sum(sum(1 for t in d.get("tasks", []) if t.get("completed", False)) for d in days)

        if total_tasks > 0 and completed_tasks == total_tasks:
            plan.status = "completed"
        else:
            plan.status = "active"

        # Explicitly assign days_data and inform SQLAlchemy the JSON column mutated
        plan.days_data = days
        flag_modified(plan, "days_data")
        self.db.commit()
        self.db.refresh(plan)

        return self._format_plan_detail(plan)

    def delete_study_plan(self, plan_id: int) -> bool:
        """Deletes a study plan."""
        plan = self.db.query(StudyPlan).filter(StudyPlan.id == plan_id).first()
        if not plan:
            return False
        self.db.delete(plan)
        self.db.commit()
        return True

    def _format_plan_summary(self, plan: StudyPlan) -> Dict[str, Any]:
        """Calculates high-level metrics for list view."""
        days = plan.days_data or []
        total_tasks = sum(len(d.get("tasks", [])) for d in days)
        completed_tasks = sum(sum(1 for t in d.get("tasks", []) if t.get("completed", False)) for d in days)
        progress_percentage = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

        gaps_count = len([d for d in days if d.get("is_gap_focus", False)])

        return {
            "id": plan.id,
            "resource_id": plan.resource_id,
            "document_title": plan.resource.title if plan.resource else "Study Material",
            "title": plan.title,
            "duration_days": plan.duration_days,
            "target_exam": plan.target_exam,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "progress_percentage": progress_percentage,
            "knowledge_gaps_addressed": len(plan.knowledge_gaps_addressed or []),
            "status": plan.status,
            "created_at": plan.created_at.isoformat() if plan.created_at else None,
        }

    def _format_plan_detail(self, plan: StudyPlan) -> Dict[str, Any]:
        """Returns full plan structure with days, tasks, and progress."""
        summary = self._format_plan_summary(plan)
        summary["days"] = plan.days_data or []
        summary["knowledge_gaps_detail"] = plan.knowledge_gaps_addressed or []
        return summary

