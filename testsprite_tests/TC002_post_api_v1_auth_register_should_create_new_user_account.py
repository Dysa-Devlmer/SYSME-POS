import requests
import uuid

BASE_URL = "http://localhost:47851"
REGISTER_ENDPOINT = "/api/v1/auth/register"
TIMEOUT = 30

def test_post_api_v1_auth_register_should_create_new_user_account():
    url = BASE_URL + REGISTER_ENDPOINT

    # Generate unique user data to avoid conflicts
    unique_suffix = str(uuid.uuid4()).replace('-', '')[:8]
    user_data = {
        "username": f"testuser_{unique_suffix}",
        "email": f"testuser_{unique_suffix}@example.com",
        "password": "StrongPass!123",
        "fullName": "Test User",
        "role": "waiter"
    }

    headers = {
        "Content-Type": "application/json"
    }

    response = None
    try:
        response = requests.post(url, json=user_data, headers=headers, timeout=TIMEOUT)
        # Validate the response status code for success (usually 201 Created or 200 OK)
        assert response.status_code in (200, 201), f"Expected status 200 or 201, got {response.status_code}"

        json_response = response.json()

        # Validate important response fields indicating successful registration
        assert json_response.get("id") is not None, "Response missing user ID"
        assert json_response.get("username") == user_data["username"], "Username in response does not match request"
        assert json_response.get("email") == user_data["email"], "Email in response does not match request"
        assert "password" not in json_response, "Password should not be returned in response"
        assert json_response.get("createdAt") is not None or json_response.get("created_at") is not None, "Missing created timestamp"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON"
    finally:
        # Clean-up skipped due to lack of auth token.
        pass

test_post_api_v1_auth_register_should_create_new_user_account()
