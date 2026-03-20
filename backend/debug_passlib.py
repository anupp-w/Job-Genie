
import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "Uniglobe@123"
print(f"Testing password: {password}")
print(f"Length: {len(password)}")

try:
    hashed = pwd_context.hash(password)
    print(f"Hashed successfully: {hashed}")
    
    verify_result = pwd_context.verify(password, hashed)
    print(f"Verification result: {verify_result}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
