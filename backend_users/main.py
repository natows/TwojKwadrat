from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import user
import uvicorn, os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routers.user import  limiter
from threading import RLock
import time
from jose import jwt
from fastapi import HTTPException




app = FastAPI()


token_blacklist = {}
blacklist_lock = RLock()


def blacklist_token(token: str, expiration: int):

    with blacklist_lock:
        clean_token = token.replace('Bearer ', '') if token.startswith('Bearer ') else token
        token_blacklist[clean_token] = expiration
        print(f"Token blacklisted until: {time.ctime(expiration)}")

def is_token_blacklisted(token: str) -> bool:
    with blacklist_lock:
        clean_token = token.replace('Bearer ', '') if token.startswith('Bearer ') else token
        
        if clean_token not in token_blacklist:
            return False
        
        expiration = token_blacklist[clean_token]
        if time.time() > expiration:
            del token_blacklist[clean_token]
            return False
        
        return True

def cleanup_expired_tokens():
    with blacklist_lock:
        current_time = time.time()
        expired_tokens = [token for token, exp in token_blacklist.items() if current_time > exp]
        for token in expired_tokens:
            del token_blacklist[token]
        if expired_tokens:
            print(f"Cleaned up {len(expired_tokens)} expired tokens")

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



import asyncio
async def periodic_cleanup():
    while True:
        await asyncio.sleep(3600)  
        cleanup_expired_tokens()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_cleanup())
    print("Token cleanup task started")


@app.post('/logout')
async def logout(request: Request):
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header required")

        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
        
        token = auth_header[7:]  
        try:
            unverified_token = jwt.decode(token, options={"verify_signature": False})
            expiration = unverified_token.get('exp', 0)
            
            if expiration == 0:
                expiration = int(time.time()) + 3600
            
        except Exception as e:
            print(f"Error parsing token for expiration: {e}")
            expiration = int(time.time()) + 3600

        blacklist_token(token, expiration)
        
        return {
            "message": "Logged out successfully",
            "blacklisted_until": time.ctime(expiration),
            "active_blacklisted_tokens": len(token_blacklist)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")



if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=5000)