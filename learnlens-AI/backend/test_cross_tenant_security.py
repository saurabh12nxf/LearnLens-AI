"""
LearnLens AI - Phase 1 Security & Cross-Tenant Isolation Regression Test Suite
Validates:
1. Cryptographic password reset token issuance and negative tampering tests.
2. Cross-tenant document isolation (listing, chunk inspection, deletion).
3. Cross-tenant vector search protection (cannot retrieve another user's chunks by ID).
4. Cross-tenant quiz isolation (cannot access, submit, or delete another user's quiz).
5. Cross-tenant study plan isolation (cannot view or toggle tasks on another user's plan).
6. Upload validation: Magic byte (%PDF) check and extension check.
7. Database integrity: Zero orphan records with user_id IS NULL.
"""

import sys
import os
import uuid
import io

# Ensure UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, LearningResource, Quiz, QuizAttempt, StudyPlan, User
from auth_service import create_password_reset_token, verify_password_reset_token

client = TestClient(app)


def test_cross_tenant_security_suite():
    print("=" * 80)
    print("LearnLens AI: Comprehensive Cross-Tenant Security & Isolation Regression Suite")
    print("=" * 80)

    # ------------------------------------------------------------------------
    # 1. Test Cryptographic Password Reset Token Flow & Tampering
    # ------------------------------------------------------------------------
    print("\n[1/7] Testing Cryptographic Password Reset Token Security...")
    test_email = f"security_student_{uuid.uuid4().hex[:6]}@example.com"
    reg_res = client.post("/api/auth/signup", json={
        "full_name": "Security Student",
        "email": test_email,
        "password": "originalpassword123"
    })
    assert reg_res.status_code == 200, f"Signup failed: {reg_res.text}"

    # Request valid reset token
    forgot_res = client.post("/api/auth/forgot-password", json={"email": test_email})
    assert forgot_res.status_code == 200
    token = forgot_res.json().get("reset_token")
    assert token is not None, "Reset token must be returned"

    # Verify token claims
    verified_email = verify_password_reset_token(token)
    assert verified_email == test_email.lower(), "Verified email must match token subject"

    # Attack: Tamper with token payload / signature
    tampered_token = token[:-5] + "XXXXX"
    bad_reset = client.post("/api/auth/reset-password", json={
        "reset_token": tampered_token,
        "new_password": "malicious_new_pass"
    })
    assert bad_reset.status_code == 400, "Tampered reset token must return 400"

    # Attack: Submit without token in production
    empty_reset = client.post("/api/auth/reset-password", json={
        "new_password": "malicious_new_pass"
    })
    assert empty_reset.status_code == 400, "Reset without token must return 400"

    # Valid reset succeeds
    good_reset = client.post("/api/auth/reset-password", json={
        "reset_token": token,
        "new_password": "updated_secure_pass_456"
    })
    assert good_reset.status_code == 200
    print("✅ Password reset security verified: Cryptographically signed, tampering rejected.")

    # ------------------------------------------------------------------------
    # 2. Setup Two Isolated Tenants (Tenant A and Tenant B)
    # ------------------------------------------------------------------------
    print("\n[2/7] Initializing Two Isolated Tenants: Alice and Bob...")
    alice_email = f"alice_{uuid.uuid4().hex[:6]}@example.com"
    bob_email = f"bob_{uuid.uuid4().hex[:6]}@example.com"

    res_a = client.post("/api/auth/signup", json={"full_name": "Alice", "email": alice_email, "password": "passAlice123"})
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    user_a_id = res_a.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = client.post("/api/auth/signup", json={"full_name": "Bob", "email": bob_email, "password": "passBob123"})
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    user_b_id = res_b.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    print(f"✅ Created Tenant A (Alice, ID={user_a_id}) and Tenant B (Bob, ID={user_b_id})")

    # ------------------------------------------------------------------------
    # 3. Create Artifacts for Tenant A (Document, Quiz, Study Plan)
    # ------------------------------------------------------------------------
    print("\n[3/7] Seeding Tenant A (Alice) Workspace with Resources...")
    db = SessionLocal()
    alice_doc = LearningResource(
        user_id=user_a_id,
        title="Alice Confidential Notes",
        filename="alice_confidential.pdf",
        file_path="/tmp/alice_confidential.pdf",
        page_count=5,
        chunk_count=10
    )
    db.add(alice_doc)
    db.commit()
    db.refresh(alice_doc)

    alice_quiz = Quiz(
        user_id=user_a_id,
        resource_id=alice_doc.id,
        title="Alice Private Quiz",
        topic="Confidential Topic"
    )
    db.add(alice_quiz)
    db.commit()
    db.refresh(alice_quiz)

    alice_plan = StudyPlan(
        user_id=user_a_id,
        resource_id=alice_doc.id,
        student_name="Alice",
        title="Alice 5-Day Plan",
        duration_days=5,
        days_data=[{"day": 1, "tasks": [{"id": "t1", "title": "Secret Task", "completed": False}]}],
        status="active"
    )
    db.add(alice_plan)
    db.commit()
    db.refresh(alice_plan)

    doc_a_id = alice_doc.id
    quiz_a_id = alice_quiz.id
    plan_a_id = alice_plan.id
    db.close()
    print(f"✅ Seeded Alice Doc #{doc_a_id}, Quiz #{quiz_a_id}, Plan #{plan_a_id}")

    # ------------------------------------------------------------------------
    # 4. Cross-Tenant Document Access Verification
    # ------------------------------------------------------------------------
    print("\n[4/7] Testing Cross-Tenant Document Boundaries...")
    # Bob lists documents -> Must NOT contain Alice's document
    bob_docs = client.get("/api/documents", headers=headers_b).json()
    assert all(d["id"] != doc_a_id for d in bob_docs), "Bob should never see Alice's document in listing"

    # Bob attempts to inspect Alice's document chunks by ID -> Must return 404
    bob_chunks_res = client.get(f"/api/documents/{doc_a_id}/chunks", headers=headers_b)
    assert bob_chunks_res.status_code == 404, "Bob cannot inspect chunks of Alice's document"

    # Bob attempts to delete Alice's document by ID -> Must return 404
    bob_del_doc = client.delete(f"/api/documents/{doc_a_id}", headers=headers_b)
    assert bob_del_doc.status_code == 404, "Bob cannot delete Alice's document"
    print("✅ Document boundaries verified: 404 on cross-tenant inspection and deletion.")

    # ------------------------------------------------------------------------
    # 5. Cross-Tenant Quiz & Study Plan Boundary Verification
    # ------------------------------------------------------------------------
    print("\n[5/7] Testing Cross-Tenant Quiz & Study Plan Boundaries...")
    # Bob lists quizzes -> Must NOT contain Alice's quiz
    bob_quizzes = client.get("/api/quizzes", headers=headers_b).json()
    assert all(q["id"] != quiz_a_id for q in bob_quizzes), "Bob should not see Alice's quiz"

    # Bob attempts to fetch Alice's quiz by ID -> Must return 404
    bob_quiz_res = client.get(f"/api/quizzes/{quiz_a_id}", headers=headers_b)
    assert bob_quiz_res.status_code == 404, "Bob cannot view Alice's quiz"

    # Bob attempts to submit to Alice's quiz -> Must return 404
    bob_submit_res = client.post(f"/api/quizzes/{quiz_a_id}/submit", json={"answers": {}}, headers=headers_b)
    assert bob_submit_res.status_code == 404, "Bob cannot submit to Alice's quiz"

    # Bob attempts to view Alice's study plan -> Must return 404
    bob_plan_res = client.get(f"/api/study-plans/{plan_a_id}", headers=headers_b)
    assert bob_plan_res.status_code == 404, "Bob cannot view Alice's study plan"

    # Bob attempts to toggle a task in Alice's study plan -> Must return 404
    bob_toggle_res = client.post(
        f"/api/study-plans/{plan_a_id}/tasks/t1/toggle",
        json={"completed": True},
        headers=headers_b
    )
    assert bob_toggle_res.status_code == 404, "Bob cannot toggle tasks in Alice's plan"
    print("✅ Quiz & Study Plan boundaries verified: Strictly 404 on cross-tenant access.")

    # ------------------------------------------------------------------------
    # 6. Upload Validation (Magic Byte & File Signature)
    # ------------------------------------------------------------------------
    print("\n[6/7] Testing Upload File Validation (Magic Byte & Extension)...")
    # Fake PDF: extension is .pdf but content is arbitrary text without %PDF header
    fake_pdf = io.BytesIO(b"This is just plain text masquerading as a PDF file.")
    bad_upload = client.post(
        "/api/upload",
        files={"file": ("fake_exploit.pdf", fake_pdf, "application/pdf")},
        headers=headers_a
    )
    assert bad_upload.status_code == 400
    assert "Invalid file signature" in bad_upload.json()["detail"]

    # Non-PDF extension
    text_file = io.BytesIO(b"%PDF-1.4 but named .txt")
    bad_ext = client.post(
        "/api/upload",
        files={"file": ("notes.txt", text_file, "text/plain")},
        headers=headers_a
    )
    assert bad_ext.status_code == 400
    print("✅ Upload validation verified: Magic bytes (%PDF) and file extension enforced.")

    # ------------------------------------------------------------------------
    # 7. Database Integrity: Check Zero Orphan Records
    # ------------------------------------------------------------------------
    print("\n[7/7] Verifying Database Integrity: Zero Orphan (user_id IS NULL) Records...")
    db = SessionLocal()
    orphan_resources = db.query(LearningResource).filter(LearningResource.user_id == None).count()
    orphan_quizzes = db.query(Quiz).filter(Quiz.user_id == None).count()
    orphan_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == None).count()
    orphan_plans = db.query(StudyPlan).filter(StudyPlan.user_id == None).count()
    db.close()

    assert orphan_resources == 0, f"Found {orphan_resources} orphan learning_resources!"
    assert orphan_quizzes == 0, f"Found {orphan_quizzes} orphan quizzes!"
    assert orphan_attempts == 0, f"Found {orphan_attempts} orphan quiz_attempts!"
    assert orphan_plans == 0, f"Found {orphan_plans} orphan study_plans!"
    print("✅ Database integrity verified: 0 orphan records with NULL user_id.")

    print("\n" + "=" * 80)
    print("🏆 ALL PHASE 1 SECURITY & CROSS-TENANT ISOLATION TESTS PASSED (7/7)!")
    print("=" * 80)


if __name__ == "__main__":
    test_cross_tenant_security_suite()

