from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import user
import uvicorn, os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routers.user import  limiter
import time
from jose import jwt
from fastapi import HTTPException
import redis

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'), 
    port=int(os.getenv('REDIS_PORT', '6379')), 
    decode_responses=True
)


app = FastAPI()



def blacklist_token(token: str, expiration: int):
    try:
        ttl = max(0, expiration - int(time.time()))
        if ttl > 0:
            redis_client.setex(f"bl:{token}", ttl, "1")
            print(f"Token blacklisted in Redis for {ttl}s")
            return True
    except Exception as e:
        print(f"Redis blacklist error: {e}")
        return False

def is_token_blacklisted(token: str) -> bool:
    try:
        result = redis_client.exists(f"bl:{token}") > 0
        print(f"Checking Redis blacklist for token: {'blacklisted' if result else 'not blacklisted'}")
        return result
    except Exception as e:
        print(f"Redis check error: {e}")
        return False

def get_blacklist_size():
    try:
        keys = redis_client.keys("bl:*")
        return len(keys)
    except Exception as e:
        print(f"Redis count error: {e}")
        return


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.state.is_token_blacklisted = is_token_blacklisted
app.state.blacklist_token = blacklist_token



print("Including user router:", user.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"]
)


app.include_router(user.router, prefix="/api/users")

from routers.user import set_blacklist_function
set_blacklist_function(is_token_blacklisted)

# @app.get("/")
# async def root():
#     return {"message": "users backend dziala"}

@limiter.limit("10/minute")
@app.get("/health")
async def health(request: Request):
    user_agent = request.headers.get("user-agent", "")
    if "kube-probe" in user_agent.lower():
        pass
    return {"status": "ok"}




@limiter.limit("5/minute")
@app.post('/logout')
async def logout(request: Request):
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header required")

        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
        
        token = auth_header[7:]  
        
        print(f"Logout - token to blacklist (first 20): {token[:20]}...")
        
        try:
            unverified_token = jwt.decode(
                token, 
                key="dummy", 
                algorithms=["RS256"], 
                options={
                    "verify_signature": False,  
                    "verify_aud": False,      
                    "verify_exp": False        
                }
            )
            expiration = unverified_token.get('exp', 0)
            
            if expiration == 0:
                expiration = int(time.time()) + 3600
                
        except Exception as e:
            print(f"Error parsing token for expiration: {e}")
            expiration = int(time.time()) + 3600

        blacklist_token(token, expiration)
        
        print(f"Token blacklisted successfully")
        
        return {
            "message": "Logged out successfully",
            "blacklisted_until": time.ctime(expiration),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=5000)