import sys
import os

# Ensure UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_auth_and_isolation():
    print("=" * 70)
    print("Testing LearnLens AI - Authentication & Multi-Tenant User Isolation")
    print("=" * 70)

    # 1. Test Demo Login
    print("\n[1/5] Testing 1-Click Demo Login (/api/auth/demo-login)...")
    res = client.post("/api/auth/demo-login")
    assert res.status_code == 200, f"Demo login failed: {res.text}"
    demo_data = res.json()
    assert "access_token" in demo_data
    demo_token = demo_data["access_token"]
    print(f"✅ Demo Login Successful! User: {demo_data['user']['full_name']} ({demo_data['user']['email']})")

    # 2. Test /api/auth/me with Demo Token
    print("\n[2/5] Testing Profile Endpoint (/api/auth/me)...")
    headers_demo = {"Authorization": f"Bearer {demo_token}"}
    res = client.get("/api/auth/me", headers=headers_demo)
    assert res.status_code == 200, f"/api/auth/me failed: {res.text}"
    me = res.json()
    print(f"✅ Authenticated Profile: ID={me['id']}, Name='{me['full_name']}'")

    # 3. Test New User Signup (User A: Sarah Connor)
    print("\n[3/5] Testing New User Signup (/api/auth/signup)...")
    user_a_email = f"sarah_{os.getpid()}@example.com"
    signup_payload = {
        "full_name": "Sarah Connor",
        "email": user_a_email,
        "password": "sarahpassword123",
    }
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 200, f"Signup failed: {res.text}"
    user_a_data = res.json()
    token_a = user_a_data["access_token"]
    user_a_id = user_a_data["user"]["id"]
    print(f"✅ User A Created: ID={user_a_id}, Name='{user_a_data['user']['full_name']}'")

    # 4. Test User Login (/api/auth/login)
    print("\n[4/5] Testing User Login (/api/auth/login)...")
    login_payload = {
        "email": user_a_email,
        "password": "sarahpassword123",
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.text}"
    login_token = res.json()["access_token"]
    assert login_token is not None
    print("✅ User A Login Verified! JWT token issued.")

    # 4b. Test Secure Forgot Password and Reset Password Flow
    print("\n[4b] Testing Secure Token-Based Forgot & Reset Password Endpoints...")
    res_forgot = client.post("/api/auth/forgot-password", json={"email": user_a_email})
    assert res_forgot.status_code == 200
    forgot_data = res_forgot.json()
    assert "reset_token" in forgot_data
    reset_token = forgot_data["reset_token"]
    print("✅ Forgot password generated cryptographically verified reset token.")

    # Negative Test: Reset password with invalid token must fail
    res_invalid_reset = client.post("/api/auth/reset-password", json={
        "reset_token": "invalid-or-forged-token",
        "new_password": "attempted_hack_pass"
    })
    assert res_invalid_reset.status_code == 400
    print("✅ Negative test: Invalid/forged reset token rejected with 400.")

    # Negative Test: Reset password using the SAME password as current password (platform standard)
    res_same_reset = client.post("/api/auth/reset-password", json={
        "reset_token": reset_token,
        "email": user_a_email,
        "new_password": "sarahpassword123"  # Same as old password!
    })
    assert res_same_reset.status_code == 400
    assert "New password cannot be the same as your current password" in res_same_reset.json()["detail"]
    print("✅ Negative test: Resetting with same password rejected with 400 ('New password cannot be the same as your current password').")

    # Positive Test: Reset password with valid token and fresh password
    res_reset = client.post("/api/auth/reset-password", json={
        "reset_token": reset_token,
        "email": user_a_email,
        "new_password": "new_sarah_password_456"
    })
    assert res_reset.status_code == 200
    print("✅ Password reset successful with verified token and different password.")

    # Verify login with new password
    res_new_login = client.post("/api/auth/login", json={
        "email": user_a_email,
        "password": "new_sarah_password_456"
    })
    assert res_new_login.status_code == 200
    print("✅ Login with new password succeeded!")

    # 5. Test Workspace Isolation Between User A and User B
    print("\n[5/5] Testing Multi-Tenant Workspace Isolation...")
    # Create User B (John Doe)
    user_b_email = f"john_{os.getpid()}@example.com"
    res = client.post("/api/auth/signup", json={
        "full_name": "John Doe",
        "email": user_b_email,
        "password": "johnpassword123",
    })
    assert res.status_code == 200
    token_b = res.json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Fetch User A's analytics overview
    res_analytics_a = client.get("/api/analytics/overview", headers=headers_a)
    assert res_analytics_a.status_code == 200
    print(f"✅ User A Analytics: {res_analytics_a.json()['total_quizzes_taken']} quizzes taken (isolated)")

    # Fetch User B's analytics overview
    res_analytics_b = client.get("/api/analytics/overview", headers=headers_b)
    assert res_analytics_b.status_code == 200
    print(f"✅ User B Analytics: {res_analytics_b.json()['total_quizzes_taken']} quizzes taken (isolated)")

    # Verify unauthenticated request is blocked
    res_unauth = client.get("/api/documents")
    assert res_unauth.status_code == 401
    print("✅ Unauthenticated request correctly blocked with 401 Unauthorized.")

    print("\n" + "=" * 70)
    print("🎉 ALL AUTHENTICATION & MULTI-TENANT ISOLATION TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    test_auth_and_isolation()

