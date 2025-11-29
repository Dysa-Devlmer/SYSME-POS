import requests

BASE_URL = "http://localhost:47851"
TIMEOUT = 30

# Credentials for a user with permission to open/close cash sessions (should be replaced with valid test user credentials)
TEST_USERNAME = "test_cashier"
TEST_PASSWORD = "TestPassword123!"
TEST_PIN = "123"

def test_post_api_v1_cash_close_should_close_active_cash_session():
    session = requests.Session()
    try:
        # Step 1: Authenticate using /api/v1/auth/pos/login to get JWT token (POS-specific login)
        login_url = f"{BASE_URL}/api/v1/auth/pos/login"
        login_payload = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD,
            "pin": TEST_PIN
        }
        login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data, "No token found in login response"
        token = login_data["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Step 2: Ensure an active cash session exists - if none, open one using /api/v1/cash/open
        current_cash_url = f"{BASE_URL}/api/v1/cash/current"
        current_resp = session.get(current_cash_url, headers=headers, timeout=TIMEOUT)
        assert current_resp.status_code == 200, f"Failed to get current cash session: {current_resp.text}"
        current_data = current_resp.json()
        active_session_exists = current_data and (current_data.get("status","").lower() == "active")
        
        created_session_id = None
        if not active_session_exists:
            # Open new cash session
            open_cash_url = f"{BASE_URL}/api/v1/cash/open"
            open_payload = {}  # Assuming no required payload based on PRD
            open_resp = session.post(open_cash_url, headers=headers, json=open_payload, timeout=TIMEOUT)
            assert open_resp.status_code == 201, f"Failed to open cash session: {open_resp.text}"
            open_data = open_resp.json()
            created_session_id = open_data.get("id")
            assert created_session_id is not None, "No id in opened cash session response"
        else:
            created_session_id = current_data.get("id")

        # Step 3: Close the active cash session using /api/v1/cash/close POST
        close_cash_url = f"{BASE_URL}/api/v1/cash/close"
        close_resp = session.post(close_cash_url, headers=headers, timeout=TIMEOUT)
        assert close_resp.status_code == 200, f"Failed to close cash session: {close_resp.text}"
        close_data = close_resp.json()

        # Validate the response indicates session is closed
        assert close_data.get("status", "").lower() == "closed" or close_data.get("closed_at") is not None, \
            "Cash session was not marked as closed"

        # Step 4: Confirm there is no longer an active session
        current_resp_after = session.get(current_cash_url, headers=headers, timeout=TIMEOUT)
        assert current_resp_after.status_code in (200, 404), "Unexpected status code when fetching current cash session after close"

        current_data_after = current_resp_after.json() if current_resp_after.status_code == 200 else None
        if current_data_after:
            assert current_data_after.get("status", "").lower() != "active", "Cash session still active after close"
    finally:
        # Cleanup: If we opened a new session, try to reopen if needed or log the cleanup state
        pass

test_post_api_v1_cash_close_should_close_active_cash_session()
