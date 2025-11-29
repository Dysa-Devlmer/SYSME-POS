import requests

BASE_URL = "http://localhost:47851"
TIMEOUT = 30

# Replace these with valid credentials to obtain a JWT for authentication
AUTH_LOGIN_ENDPOINT = "/api/v1/auth/login"
PRODUCTS_ENDPOINT = "/api/v1/products"

# Sample valid user credentials for login (should be changed as per test environment)
VALID_USER_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

def test_post_api_v1_products_should_create_new_product():
    # Step 1: Authenticate user to get JWT token
    login_url = BASE_URL + AUTH_LOGIN_ENDPOINT
    try:
        login_resp = requests.post(login_url, json=VALID_USER_CREDENTIALS, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Authentication request failed: {e}"
    login_data = login_resp.json()
    assert "token" in login_data and isinstance(login_data["token"], str) and login_data["token"], "JWT token not found in login response"
    token = login_data["token"]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Define valid product data for creation
    new_product_data = {
        "name": "Test Product TC007",
        "description": "Test product created by TC007 test case.",
        "price": 12.99,
        "stock": 100,
        "category_id": None,  # Assuming nullable or can be omitted if not required
        "sku": "TC007SKU12345",
        "active": True
    }

    product_url = BASE_URL + PRODUCTS_ENDPOINT
    product_id = None

    try:
        # Create new product
        resp = requests.post(product_url, headers=headers, json=new_product_data, timeout=TIMEOUT)
        assert resp.status_code == 201 or resp.status_code == 200, f"Expected 201 or 200 status code, got {resp.status_code}"
        product = resp.json()
        # Validate fields returned in response
        assert isinstance(product, dict), "Response is not a JSON object"
        assert "id" in product and isinstance(product["id"], int), "Product ID missing or invalid"
        product_id = product["id"]
        assert product.get("name") == new_product_data["name"], "Product name does not match"
        assert product.get("description") == new_product_data["description"], "Product description does not match"
        assert isinstance(product.get("price"), (float, int)) and product.get("price") == new_product_data["price"], "Product price does not match or invalid"
        assert isinstance(product.get("stock"), int) and product.get("stock") == new_product_data["stock"], "Product stock does not match or invalid"
        assert "category_id" in product, "Category ID missing in response"
        assert "sku" in product and product.get("sku") == new_product_data["sku"], "Product SKU does not match"
        assert "active" in product and product.get("active") == new_product_data["active"], "Product active status does not match"
    finally:
        # Clean up: Delete created product if created
        if product_id is not None:
            try:
                del_resp = requests.delete(f"{product_url}/{product_id}", headers=headers, timeout=TIMEOUT)
                # Accept 200 OK or 204 No Content for successful deletion
                assert del_resp.status_code in (200, 204), f"Failed to delete product with ID {product_id}"
            except requests.RequestException as e:
                pass  # Ignore cleanup failure but can log if needed

test_post_api_v1_products_should_create_new_product()