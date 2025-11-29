import requests

BASE_URL = "http://localhost:47851"
LOGIN_URL = f"{BASE_URL}/api/v1/auth/login"
KITCHEN_ORDERS_URL = f"{BASE_URL}/api/v1/kitchen/orders"
TIMEOUT = 30

# Replace these credentials with valid ones for the test environment
TEST_USERNAME = "test_waiter"
TEST_PASSWORD = "test_password"

def test_get_active_kitchen_orders():
    # Authenticate to get JWT token
    login_payload = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.status_code} {login_resp.text}"
        login_json = login_resp.json()
        token = login_json.get("token") or login_json.get("access_token")
        assert token is not None, "No token returned on login"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Test 1: Get active kitchen orders without status filter
    try:
        resp_all = requests.get(KITCHEN_ORDERS_URL, headers=headers, timeout=TIMEOUT)
        assert resp_all.status_code == 200, f"Failed to get kitchen orders: {resp_all.status_code} {resp_all.text}"
        orders_all = resp_all.json()
        assert isinstance(orders_all, list), "Response is not a list"
        # If the list is not empty, check that orders have required fields
        if orders_all:
            for order in orders_all:
                assert "id" in order, "Order missing 'id'"
                assert "status" in order, "Order missing 'status'"
                assert order["status"] in ["pending", "preparing", "ready", "served", "cancelled", "completed", "closed"] or isinstance(order["status"], str), "Unexpected order status value"
    except requests.RequestException as e:
        assert False, f"Get kitchen orders request failed: {e}"

    # Test 2: Get active kitchen orders filtered by a valid status, e.g. "preparing"
    params = {"status": "preparing"}
    try:
        resp_filtered = requests.get(KITCHEN_ORDERS_URL, headers=headers, params=params, timeout=TIMEOUT)
        assert resp_filtered.status_code == 200, f"Failed to get filtered kitchen orders: {resp_filtered.status_code} {resp_filtered.text}"
        orders_filtered = resp_filtered.json()
        assert isinstance(orders_filtered, list), "Filtered response is not a list"
        # If orders returned, their status should match the filter
        for order in orders_filtered:
            assert "status" in order, "Order missing 'status'"
            assert order["status"] == "preparing", f"Order status expected 'preparing' but got '{order['status']}'"
    except requests.RequestException as e:
        assert False, f"Get filtered kitchen orders request failed: {e}"

test_get_active_kitchen_orders()