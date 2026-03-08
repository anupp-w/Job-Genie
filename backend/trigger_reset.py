import requests

res = requests.post("http://localhost:8000/api/v1/auth/forgot-password", json={"email": "anupwagle181@gmail.com"})
print(f"Status Code: {res.status_code}")
print(f"Response: {res.text}")
