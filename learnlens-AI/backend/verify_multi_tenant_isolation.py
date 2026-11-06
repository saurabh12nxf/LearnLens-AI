import sys
import os
import uuid

# Ensure UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, LearningResource, Quiz, QuizAttempt, StudyPlan

client = TestClient(app)

def run_multi_tenant_verification():
    print("=" * 75)
    print("LearnLens AI: Comprehensive Multi-Tenant Isolation Verification")
    print("=" * 75)

    uid = uuid.uuid4().hex[:6]
    user1_email = f"alice_{uid}@example.com"
    user2_email = f"bob_{uid}@example.com"

    # Step 1: Sign up User 1 (Alice)
    print(f"\n[1/6] Registering User 1: Alice ({user1_email})...")
    res1 = client.post("/api/auth/signup", json={
        "full_name": "Alice Smith",
        "email": user1_email,
        "password": "alicepassword123"
    })
    assert res1.status_code == 200, f"Alice signup failed: {res1.text}"
    token_alice = res1.json()["access_token"]
    alice_id = res1.json()["user"]["id"]
    headers_alice = {"Authorization": f"Bearer {token_alice}"}
    print(f"✅ User 1 registered with ID: {alice_id}")

    # Step 2: Sign up User 2 (Bob)
    print(f"\n[2/6] Registering User 2: Bob ({user2_email})...")
    res2 = client.post("/api/auth/signup", json={
        "full_name": "Bob Jones",
        "email": user2_email,
        "password": "bobpassword123"
    })
    assert res2.status_code == 200, f"Bob signup failed: {res2.text}"
    token_bob = res2.json()["access_token"]
    bob_id = res2.json()["user"]["id"]
    headers_bob = {"Authorization": f"Bearer {token_bob}"}
    print(f"✅ User 2 registered with ID: {bob_id}")

    # Step 3: Populate Alice's private workspace with a quiz and attempt
    print("\n[3/6] Creating isolated quiz & quiz attempt for Alice...")
    db = SessionLocal()
    # Create an isolated document for Alice
    alice_doc = LearningResource(
        user_id=alice_id,
        title="Alice Advanced Algorithms",
        filename="alice_algorithms.pdf",
        file_path="/tmp/alice.pdf",
        page_count=10,
        chunk_count=20
    )
    db.add(alice_doc)
    db.commit()
    db.refresh(alice_doc)

    # Create Alice's quiz
    alice_quiz = Quiz(
        user_id=alice_id,
        resource_id=alice_doc.id,
        title="Alice DP Quiz",
        topic="Dynamic Programming"
    )
    db.add(alice_quiz)
    db.commit()
    db.refresh(alice_quiz)

    # Create Alice's quiz attempt
    alice_attempt = QuizAttempt(
        user_id=alice_id,
        quiz_id=alice_quiz.id,
        student_name="Alice Smith",
        score=5,
        total_questions=5,
        percentage=100.0,
        topic_results={"Dynamic Programming": {"correct": 5, "total": 5}}
    )
    db.add(alice_attempt)
    db.commit()

    # Create Alice's study plan
    alice_plan = StudyPlan(
        user_id=alice_id,
        resource_id=alice_doc.id,
        student_name="Alice Smith",
        title="Alice 7-Day Mastery",
        duration_days=7,
        days_data=[{"day": 1, "tasks": [{"id": "t1", "title": "Review DP", "completed": True}]}],
        status="active"
    )
    db.add(alice_plan)
    db.commit()
    alice_doc_id = alice_doc.id
    alice_quiz_id = alice_quiz.id
    alice_plan_id = alice_plan.id
    db.close()
    print("✅ Created Alice's document, quiz, attempt (100% score), and study plan.")

    # Step 4: Verify Alice sees her items
    print("\n[4/6] Verifying Alice's private workspace contains her data...")
    alice_docs_res = client.get("/api/documents", headers=headers_alice).json()
    alice_has_doc = any(d["title"] == "Alice Advanced Algorithms" for d in alice_docs_res)
    assert alice_has_doc, "Alice should see her own document!"

    alice_quizzes_res = client.get("/api/quizzes", headers=headers_alice).json()
    alice_has_quiz = any(q["title"] == "Alice DP Quiz" for q in alice_quizzes_res)
    assert alice_has_quiz, "Alice should see her own quiz!"

    alice_analytics = client.get("/api/analytics/overview", headers=headers_alice).json()
    assert alice_analytics["total_quizzes_taken"] == 1, "Alice should have 1 quiz attempt!"
    assert alice_analytics["average_score_percentage"] == 100.0

    alice_plans = client.get("/api/study-plans", headers=headers_alice).json()
    assert any(p["title"] == "Alice 7-Day Mastery" for p in alice_plans), "Alice should see her study plan!"
    print("✅ Alice's workspace contains all her private assets & 100% mastery score.")

    # Step 5: Verify Bob's workspace is completely isolated and cannot see Alice's data
    print("\n[5/6] Verifying Bob's workspace CANNOT see Alice's data (Tenant Isolation)...")
    bob_docs_res = client.get("/api/documents", headers=headers_bob).json()
    bob_sees_alice_doc = any(d["title"] == "Alice Advanced Algorithms" for d in bob_docs_res)
    assert not bob_sees_alice_doc, "CRITICAL: Bob should NOT see Alice's document!"

    bob_quizzes_res = client.get("/api/quizzes", headers=headers_bob).json()
    bob_sees_alice_quiz = any(q["title"] == "Alice DP Quiz" for q in bob_quizzes_res)
    assert not bob_sees_alice_quiz, "CRITICAL: Bob should NOT see Alice's quiz!"

    bob_analytics = client.get("/api/analytics/overview", headers=headers_bob).json()
    assert bob_analytics["total_quizzes_taken"] == 0, "CRITICAL: Bob's quiz count must be 0!"

    bob_plans = client.get("/api/study-plans", headers=headers_bob).json()
    bob_sees_alice_plan = any(p["title"] == "Alice 7-Day Mastery" for p in bob_plans)
    assert not bob_sees_alice_plan, "CRITICAL: Bob should NOT see Alice's study plan!"
    print("✅ Verified: Bob cannot access Alice's documents, quizzes, analytics, or study plans!")

    # Step 6: Verify direct cross-tenant ID access is blocked
    print("\n[6/6] Verifying cross-tenant ID unauthorized access is forbidden...")
    unauth_doc_res = client.get(f"/api/documents/{alice_doc_id}/chunks", headers=headers_bob)
    assert unauth_doc_res.status_code == 404, "Bob should get 404/Forbidden trying to access Alice's document chunks!"

    unauth_quiz_res = client.get(f"/api/quizzes/{alice_quiz_id}", headers=headers_bob)
    assert unauth_quiz_res.status_code == 404, "Bob should get 404/Forbidden trying to access Alice's quiz!"

    unauth_plan_res = client.get(f"/api/study-plans/{alice_plan_id}", headers=headers_bob)
    assert unauth_plan_res.status_code == 404, "Bob should get 404/Forbidden trying to access Alice's study plan!"

    print("✅ Cross-tenant ID access blocked cleanly with 404.")
    print("\n" + "=" * 75)
    print("🏆 ALL MULTI-TENANT ISOLATION & AUTHENTICATION CHECKS PASSED PERFECTLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_multi_tenant_verification()
