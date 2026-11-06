import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from study_plan_service import StudyPlanService

class MockDB:
    pass

def test_plan_logic():
    print("=" * 65)
    print("Verifying Study Plan Generation Logic (Offline & Fallback)")
    print("=" * 65)

    service = StudyPlanService(MockDB())

    target_topics = [
        {"topic": "Dynamic Programming", "accuracy": 0.0, "is_gap": True},
        {"topic": "Binary Search Trees", "accuracy": 85.0, "is_gap": False},
        {"topic": "Divide and Conquer", "accuracy": 100.0, "is_gap": False},
    ]

    topic_citations = {
        "Dynamic Programming": {"page_number": 3, "snippet": "Memoization reduces time complexity..."},
        "Binary Search Trees": {"page_number": 1, "snippet": "In-order traversal visits nodes in order..."},
        "Divide and Conquer": {"page_number": 2, "snippet": "Merge Sort breaks array into halves..."},
    }

    # Generate 5-day plan
    plan_dict = service._generate_fallback_plan(
        doc_title="sample_dsa_notes",
        duration_days=5,
        target_exam="Midterm Exam",
        target_topics=target_topics,
        topic_citations=topic_citations,
    )

    print(f"Title: {plan_dict['title']}")
    print(f"Total Days: {len(plan_dict['days'])}")

    assert len(plan_dict["days"]) == 5, "Expected 5 days in plan"
    day1 = plan_dict["days"][0]
    print(f"\nDay 1 Theme: {day1['theme']}")
    print(f"Day 1 Focus on Gap: {day1['is_gap_focus']} (Topic: {day1['primary_topic']})")
    assert day1["is_gap_focus"] == True, "Day 1 should focus on weak topic"
    assert day1["tasks"][0]["reference_page"] == 3, "Day 1 should cite Page 3"

    print("Tasks on Day 1:")
    for t in day1["tasks"]:
        print(f" - [{t['type'].upper()}] {t['title']} (Ref: Page {t.get('reference_page')})")

    # Day 5 (Final Day)
    day5 = plan_dict["days"][4]
    print(f"\nDay 5 Theme: {day5['theme']}")
    print(f"Day 5 Task count: {len(day5['tasks'])}")

    print("\n✅ All Study Plan generation logic passed with 100% precision!")

if __name__ == "__main__":
    test_plan_logic()

