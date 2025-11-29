import requests

BASE_URL = "http://localhost:47851"
TIMEOUT = 30

# Dummy function to get an auth token - replace with valid credentials and logic as needed
def get_auth_token():
    login_url = f"{BASE_URL}/api/v1/auth/login"
    login_payload = {
        "username": "admin",      # Use valid username
        "password": "admin123"    # Use valid password
    }
    try:
        resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token") or data.get("accessToken") or data.get("jwt")
        if not token:
            raise Exception("Auth token not found in login response")
        return token
    except Exception as e:
        raise Exception(f"Failed to authenticate: {e}")

def test_get_products_list_with_filters_and_pagination():
    token = get_auth_token()
    headers = {
        "Authorization": f"Bearer {token}"
    }
    url = f"{BASE_URL}/api/v1/products"

    # Test parameters for filtering and pagination
    params = {
        "page": 1,
        "limit": 5,
        "category": "1",     # Example filter param if supported
        "name": "coffee",    # Example filter param for product name if supported
        # Add more filter params here if applicable
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
        response.raise_for_status()
        json_data = response.json()

        # Check response structure - typical paginated response might have keys: data, total, page, limit
        assert isinstance(json_data, dict), "Response is not a JSON object"
        assert "data" in json_data, "'data' key missing in response"
        assert isinstance(json_data["data"], list), "'data' is not a list"

        # Validate pagination meta properties if available
        # Acceptable keys might be total, page, limit
        if "total" in json_data:
            assert isinstance(json_data["total"], int), "'total' should be an integer"
        if "page" in json_data:
            assert isinstance(json_data["page"], int), "'page' should be an integer"
            assert json_data["page"] == params["page"], f"Returned page {json_data['page']} does not match requested page {params['page']}"
        if "limit" in json_data:
            assert isinstance(json_data["limit"], int), "'limit' should be an integer"
            assert json_data["limit"] == params["limit"], f"Returned limit {json_data['limit']} does not match requested limit {params['limit']}"

        # Check individual product items for expected fields typically present in product objects
        for product in json_data["data"]:
            assert isinstance(product, dict), "Product item is not an object"
            assert "id" in product, "Product missing 'id'"
            assert "name" in product, "Product missing 'name'"
            assert "price" in product, "Product missing 'price'"

    except requests.HTTPError as http_err:
        assert False, f"HTTP error occurred: {http_err} - Response Content: {response.content if response else 'None'}"
    except Exception as err:
        assert False, f"Test failed with error: {err}"

test_get_products_list_with_filters_and_pagination()