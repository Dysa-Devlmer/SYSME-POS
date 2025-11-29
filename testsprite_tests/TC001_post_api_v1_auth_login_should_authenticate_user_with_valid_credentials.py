import requests

BASE_URL = "http://localhost:47851"
TIMEOUT = 30

def test_post_api_v1_auth_login_should_authenticate_user_with_valid_credentials():
    url = f"{BASE_URL}/api/v1/auth/login"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    # Use example valid credentials for testing
    payload = {
        "username": "validuser",
        "password": "validpassword"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0, "JWT token missing or invalid"
    assert "role" in data and isinstance(data["role"], str) and len(data["role"]) > 0, "User role missing or invalid"

test_post_api_v1_auth_login_should_authenticate_user_with_valid_credentials()