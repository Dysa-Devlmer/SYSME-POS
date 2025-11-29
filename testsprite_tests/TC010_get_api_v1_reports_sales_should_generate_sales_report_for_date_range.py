import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:47851"
LOGIN_ENDPOINT = "/api/v1/auth/login"
REPORTS_SALES_ENDPOINT = "/api/v1/reports/sales"

TIMEOUT = 30

def test_get_api_v1_reports_sales_date_range():
    # Credentials for an existing user with permission to generate reports
    login_payload = {
        "username": "manager",  # Replace with valid username for report access
        "password": "managerpassword"  # Replace with valid password
    }
    try:
        # Login to get JWT token
        login_response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert "token" in login_data, "No token in login response"
        token = login_data["token"]

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

        # Define date range: last 7 days example
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=7)
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }

        # Request sales report for the date range
        report_response = requests.get(
            BASE_URL + REPORTS_SALES_ENDPOINT,
            headers=headers,
            params=params,
            timeout=TIMEOUT
        )
        assert report_response.status_code == 200, f"Failed to get sales report: {report_response.text}"

        report_data = report_response.json()
        # Basic validations on response content:
        # Expecting some report structure with keys like 'total_sales', 'items', etc.
        assert isinstance(report_data, dict), "Report response is not a JSON object"
        expected_keys = ["total_sales", "total_transactions", "date_range", "sales_items"]
        for key in expected_keys:
            assert key in report_data, f"Missing '{key}' in sales report response"
        # Check date_range matches requested range
        date_range = report_data["date_range"]
        assert date_range.get("start_date") == start_date.isoformat(), "Start date in report does not match requested start_date"
        assert date_range.get("end_date") == end_date.isoformat(), "End date in report does not match requested end_date"
        # sales_items should be a list (can be empty)
        assert isinstance(report_data["sales_items"], list), "sales_items should be a list"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_v1_reports_sales_date_range()