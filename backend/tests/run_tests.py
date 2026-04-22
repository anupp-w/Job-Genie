import sys
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

print("Starting script...")
# Ensure backend directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

print("Importing crud...")
import crud
print("Importing auth...")
import auth
print("Importing models...")
import models
print("Importing schemas...")
import schemas
from database import Base
print("Imports done.")

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_test(name, func, *args, **kwargs):
    print(f"Running {name}...", end=" ", flush=True)
    try:
        func(*args, **kwargs)
        print("PASSED")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

# UT-01
def test_ut01():
    password = "MySecurePassword123"
    hashed = crud.get_password_hash(password)
    assert hashed != password
    assert len(hashed) > 20
    assert hashed.startswith("$2")

# UT-02
def test_ut02():
    password = "MySecurePassword123"
    hashed = crud.get_password_hash(password)
    assert crud.verify_password(password, hashed) is True

# UT-03
def test_ut03():
    password = "MySecurePassword123"
    hashed = crud.get_password_hash(password)
    assert crud.verify_password("WrongPassword", hashed) is False

# UT-04
def test_ut04():
    email = "user@example.com"
    token = auth.create_access_token(data={"sub": email})
    payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    assert payload.get("sub") == email

# UT-05
def test_ut05():
    email = "user@example.com"
    token = auth.create_access_token(data={"sub": email}, expires_delta=timedelta(minutes=-1))
    try:
        jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        raise Exception("Should have raised JWTError")
    except JWTError:
        pass

# UT-06
def test_ut06(db):
    email = "reset@example.com"
    user_data = schemas.UserCreate(email=email, full_name="Reset User", password="password123")
    crud.create_user(db, user_data)
    
    # Expired
    expired_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    crud.set_reset_code(db, email=email, code="123456", expire_time=expired_time)
    db_user = crud.get_user_by_email(db, email)
    assert db_user.reset_code_expire.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    
    # Valid
    valid_time = datetime.now(timezone.utc) + timedelta(minutes=15)
    crud.set_reset_code(db, email=email, code="654321", expire_time=valid_time)
    db_user = crud.get_user_by_email(db, email)
    assert db_user.reset_code_expire.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)

# UT-07
def test_ut07(db):
    user1 = crud.create_user(db, schemas.UserCreate(email="u1@ex.com", full_name="U1", password="p1"))
    user2 = crud.create_user(db, schemas.UserCreate(email="u2@ex.com", full_name="U2", password="p2"))
    
    resume1 = models.Resume(user_id=user1.id, title="User 1 Resume")
    db.add(resume1)
    db.commit()
    db.refresh(resume1)
    
    owned = db.query(models.Resume).filter(models.Resume.id == resume1.id, models.Resume.user_id == user1.id).first()
    assert owned is not None
    
    forbidden = db.query(models.Resume).filter(models.Resume.id == resume1.id, models.Resume.user_id == user2.id).first()
    assert forbidden is None

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    results = []
    results.append(run_test("UT-01 Password hashing produces a non-plaintext hash", test_ut01))
    results.append(run_test("UT-02 Correct password passes verification", test_ut02))
    results.append(run_test("UT-03 Wrong password fails verification", test_ut03))
    results.append(run_test("UT-04 JWT token encodes correct user email", test_ut04))
    results.append(run_test("UT-05 Expired JWT token raises an error on decode", test_ut05))
    results.append(run_test("UT-06 Password reset code expiry check works correctly", test_ut06, db))
    results.append(run_test("UT-07 Resume ownership check blocks cross-user access", test_ut07, db))
    
    db.close()
    Base.metadata.drop_all(bind=engine)
    
    passed = sum(results)
    total = len(results)
    print(f"\nSummary: {passed}/{total} tests passed.")
    if passed < total:
        sys.exit(1)
