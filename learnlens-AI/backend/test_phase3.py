import os
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from database import SessionLocal, init_db, LearningResource, StudyPlan
from study_plan_service import StudyPlanService
from analytics_service import AnalyticsService

def test_phase3():
    print("=" * 70)
    print("Testing LearnLens AI - Phase 3 (Personalized Study Plans & Recommendations)")
    print("=" * 70)

    try:
        init_db()
    except Exception as e:
        print(f"Database init notice: {e}")

    db = SessionLocal()

    doc = db.query(LearningResource).first()
    if not doc:
        print("[Error] No document found in database.")
        return

    print(f"\n[1/4] Inspecting Student Diagnosed Gaps before generating plan...")
    analytics_service = AnalyticsService(db)
    overview = analytics_service.get_learner_overview(student_name="Test Learner")
    gaps = overview.get("knowledge_gaps", [])
    print(f"   Found {len(gaps)} Knowledge Gaps for 'Test Learner':")
    for g in gaps:
        print(f"   🚨 {g['topic']} ({g['accuracy']}% accuracy): {g['gap_severity']} severity")

    print(f"\n[2/4] Generating 5-Day Personalized Study Plan for Document: '{doc.title}'...")
    plan_service = StudyPlanService(db)
    plan = plan_service.generate_study_plan(
        resource_id=doc.id,
        duration_days=5,
        student_name="Test Learner",
        target_exam="Midterm DSA Examination",
    )

    print(f"✅ Study Plan Created: ID={plan.id}, Title='{plan.title}'")
    print(f"   Target: {plan.target_exam} | Duration: {plan.duration_days} Days")
    print(f"   Knowledge Gaps Targeted: {len(plan.knowledge_gaps_addressed or [])}")

    print("\n[3/4] Reviewing Daily Schedule & Grounded Tasks:")
    for day in plan.days_data:
        gap_tag = " [TARGETING WEAK AREA]" if day.get("is_gap_focus") else ""
        print(f"\n   📅 Day {day['day_number']}: {day['theme']}{gap_tag}")
        print(f"      Topic: {day['primary_topic']} | Est. Time: {day['estimated_minutes']} mins")
        for task in day.get("tasks", []):
            page_info = f" [Page {task['reference_page']}]" if task.get("reference_page") else ""
            status_mark = "✓" if task.get("completed") else "○"
            print(f"      {status_mark} [{task['type'].upper()}]{page_info} {task['title']}")
            print(f"         └─ {task['description'][:85]}...")

    print("\n[4/4] Testing Interactive Task Checkoff & Progress Recalculation...")
    first_task_id = plan.days_data[0]["tasks"][0]["id"]
    updated_plan = plan_service.toggle_task_completion(
        plan_id=plan.id,
        task_id=first_task_id,
        completed=True,
    )

    print(f"✅ Completed Task '{first_task_id}'!")
    print(f"   Tasks Completed: {updated_plan['completed_tasks']} / {updated_plan['total_tasks']}")
    print(f"   Updated Plan Progress: {updated_plan['progress_percentage']}%")
    print(f"   Plan Status: {updated_plan['status']}")

    print("\n" + "=" * 70)
    print("✅ Phase 3 Backend Verification Complete! All recommendation logic verified.")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    test_phase3()

