import requests

BASE_URL = "http://localhost:47851"
LOGIN_ENDPOINT = "/api/v1/auth/login"
LOGOUT_ENDPOINT = "/api/v1/auth/logout"
ME_ENDPOINT = "/api/v1/auth/me"
TIMEOUT = 30

def test_post_api_v1_auth_logout_should_invalidate_user_session():
    # Credentials for login - these must be valid for the system under test
    login_payload = {
        "username": "testuser",
        "password": "TestPassword123!"
    }

    try:
        # Step 1: Login to get a JWT token
        login_response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_data = login_response.json()
        assert "token" in login_data and login_data["token"], "Login response missing token"
        token = login_data["token"]

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Step 2: Call logout to invalidate the token
        logout_response = requests.post(
            BASE_URL + LOGOUT_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT
        )
        assert logout_response.status_code == 200 or logout_response.status_code == 204, \
            f"Logout failed with status code {logout_response.status_code}"

        # Step 3: Attempt to access a protected endpoint using the invalidated token
        me_response = requests.get(
            BASE_URL + ME_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT
        )
        # After logout, token should be invalid. Expect 401 Unauthorized or similar
        assert me_response.status_code == 401 or me_response.status_code == 403, \
            f"Expected unauthorized after logout but got {me_response.status_code}"

    except requests.RequestException as e:
        assert False, f"HTTP Request failed: {e}"

test_post_api_v1_auth_logout_should_invalidate_user_session()