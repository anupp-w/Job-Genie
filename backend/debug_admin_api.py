
import urllib.request
import urllib.parse
import json

def debug_api():
    base_url = "http://localhost:8000/api/v1"
    
    # login
    login_url = f"{base_url}/auth/token"
    # FastAPI OAuth2PasswordRequestForm expects data as form-urlencoded
    data = urllib.parse.urlencode({
        "username": "anupwagle77@gmail.com",
        "password": "uniglobe@123"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(login_url, data=data)
        with urllib.request.urlopen(req) as response:
            res_content = response.read().decode("utf-8")
            res_json = json.loads(res_content)
            token = res_json.get("access_token")
            print(f"Login Status: {response.getcode()}")
            
        if token:
            users_url = f"{base_url}/users/"
            headers = {"Authorization": f"Bearer {token}"}
            users_req = urllib.request.Request(users_url, headers=headers)
            with urllib.request.urlopen(users_req) as users_res:
                users_content = users_res.read().decode("utf-8")
                print(f"Users Status: {users_res.getcode()}")
                print(f"Users Data: {users_content}")
        else:
            print("Failed to get token")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_api()
