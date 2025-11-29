import requests

BASE_URL = "http://localhost:47851"
TIMEOUT = 30  # seconds

# Provide valid POS user credentials here for authentication
POS_USER_CREDENTIALS = {
    "username": "posuser",
    "password": "posuserpassword"
}

def test_post_api_v1_cash_open_should_start_new_cash_register_session():
    try:
        # Step 1: Authenticate with /api/v1/auth/pos/login to get JWT token
        login_url = f"{BASE_URL}/api/v1/auth/pos/login"
        login_resp = requests.post(login_url, json=POS_USER_CREDENTIALS, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "token" in login_data, "JWT token not returned in login response"
        token = login_data["token"]
        
        # Step 2: POST to /api/v1/cash/open with Authorization header
        open_cash_url = f"{BASE_URL}/api/v1/cash/open"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        open_resp = requests.post(open_cash_url, headers=headers, timeout=TIMEOUT)
        assert open_resp.status_code == 200, f"Open cash session failed with status {open_resp.status_code}"
        open_data = open_resp.json()

        # Validate the returned session details structure
        # Expected fields might include at least: session id, start time, user info
        assert isinstance(open_data, dict), "Response is not a JSON object"
        assert "id" in open_data or "session_id" in open_data, "Session ID missing in response"
        # Optionally check for start time and user info keys if they exist
        # E.g. "start_time", "user_id", "status"
        # As PRD doesn't define exact schema, do basic sanity checks
        
        # Example assertions on expected keys
        session_id_key = "id" if "id" in open_data else "session_id"
        assert open_data[session_id_key], "Session ID value is empty"

        # Optionally verify status code or status field if present
        if "status" in open_data:
            assert open_data["status"] in ["open", "active", "started"], "Unexpected session status"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_v1_cash_open_should_start_new_cash_register_session()