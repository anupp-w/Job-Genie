
import sys
import os
from unittest.mock import MagicMock, patch

# Ensure app can be imported
sys.path.append(os.getcwd())

# Mock modules that require DB or env vars
sys.modules["app.core.config"] = MagicMock()
sys.modules["app.db.session"] = MagicMock()
sys.modules["app.db.base_class"] = MagicMock()

# Now import the target endpoint
# We need to be careful about imports inside app.api.v1.endpoints.auth
# It imports: crud, schemas, deps, security, config
# We need to mock 'app.crud' and 'app.core.security' BEFORE importing auth if possible,
# or patch them after.

with patch("app.crud.crud_user.get_user_by_email") as mock_get_user, \
     patch("app.core.security.verify_password") as mock_verify:
    
    from app.api.v1.endpoints.auth import login_for_access_token
    from fastapi import HTTPException
    
    # Mock User
    mock_user = MagicMock()
    mock_user.email = "anupwagle77@gmail.com"
    mock_user.password_hash = "$2b$12$..." # Fake hash
    
    mock_get_user.return_value = mock_user
    
    # Mock Form Data
    mock_form = MagicMock()
    mock_form.username = "anupwagle77@gmail.com"
    mock_form.password = "Uniglobe@123"
    
    print(f"Testing login with password: {mock_form.password}")
    
    # CASE 1: verify_password returns True
    mock_verify.return_value = True
    print("Simulating successful login...")
    try:
        token = login_for_access_token(db=MagicMock(), form_data=mock_form)
        print("Success! Token generated.")
    except Exception as e:
        print(f"FAILED: {e}")

    # CASE 2: verify_password returns False
    mock_verify.return_value = False
    print("Simulating failed login (wrong password)...")
    try:
        login_for_access_token(db=MagicMock(), form_data=mock_form)
        print("Should have raised 401 but didn't.")
    except HTTPException as e:
        print(f"Caught expected 401: {e.detail}")
    except Exception as e:
        print(f"FAILED with unexpected error: {e}")

