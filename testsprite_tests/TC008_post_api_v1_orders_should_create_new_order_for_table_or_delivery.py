import requests
import uuid

BASE_URL = "http://localhost:47851"
TIMEOUT = 30

# Credentials for login - should be replaced with valid test account credentials.
TEST_USERNAME = "test_waiter"
TEST_PASSWORD = "test_password"

# Corrected PIN to exactly 3 digits for POS login
TEST_PIN = "123"

def test_post_api_v1_orders_create_new_order():
    session = requests.Session()
    try:
        # Step 1: Authenticate user via POS login to get JWT token
        login_url = f"{BASE_URL}/api/v1/auth/pos/login"
        login_payload = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD,
            "pin": TEST_PIN
        }
        login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data, "JWT token not found in login response"

        token = login_data["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Step 2: Get available tables (unprotected endpoint, no auth required)
        tables_url = f"{BASE_URL}/api/v1/tables"
        tables_resp = session.get(tables_url, timeout=TIMEOUT)
        assert tables_resp.status_code == 200, f"Failed to get tables: {tables_resp.text}"
        tables_data = tables_resp.json()
        assert isinstance(tables_data, list), "Tables response is not a list"
        # Use a table ID if available, else None
        table_id = None
        for table in tables_data:
            if isinstance(table, dict) and table.get("id"):
                table_id = table["id"]
                break

        # Step 3: Prepare order payload - create either table or delivery order
        order_url = f"{BASE_URL}/api/v1/orders"
        order_payload = {
            "customer": {
                "name": "Test Customer",
                "phone": "+56912345678"
            },
            "items": [
                {
                    "product_id": str(uuid.uuid4()),  # dummy product id (should be valid, using dummy for test)
                    "quantity": 2,
                    "note": "Extra spicy"
                }
            ],
            "payment_method": "cash",
            "delivery_type": "table" if table_id else "takeaway",
        }
        if table_id:
            order_payload["table_id"] = table_id
        else:
            order_payload["address"] = "123 Test Street, Test City"

        # Step 4: Create a new order
        create_resp = session.post(order_url, json=order_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Order creation failed: {create_resp.status_code}, {create_resp.text}"
        create_data = create_resp.json()
        assert "id" in create_data, "Order ID not in creation response"
        order_id = create_data["id"]

        # Step 5: Validate order details
        # Check assigned table or delivery as expected
        if table_id:
            assert create_data.get("table_id") == table_id, "Order table_id mismatch"
            assert "address" not in create_data or not create_data["address"], "Order address should not be set for table order"
        else:
            assert create_data.get("delivery_type") == "takeaway" or create_data.get("delivery_type") == "delivery", \
                "Order delivery type mismatch"
            assert "address" in create_data and create_data["address"], "Order address missing for delivery/takeaway"

        # Validate order items
        assert "items" in create_data and isinstance(create_data["items"], list), "Order items missing or invalid"
        assert len(create_data["items"]) >= 1, "Order items empty"
        item = create_data["items"][0]
        assert item.get("product_id") == order_payload["items"][0]["product_id"], "Product ID mismatch in order item"
        assert item.get("quantity") == order_payload["items"][0]["quantity"], "Quantity mismatch in order item"
        assert item.get("note") == order_payload["items"][0]["note"], "Note mismatch in order item"

    finally:
        # Cleanup: delete the created order if possible
        if 'order_id' in locals():
            del_url = f"{BASE_URL}/api/v1/orders/{order_id}"
            try:
                del_resp = session.delete(del_url, headers=headers, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete order during cleanup: {del_resp.text}"
            except Exception:
                # Ignore cleanup errors
                pass

test_post_api_v1_orders_create_new_order()
