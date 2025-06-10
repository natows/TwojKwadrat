from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import user
import uvicorn, os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routers.user import  limiter



app = FastAPI()


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)



print("Including user router:", user.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"]
)


app.include_router(user.router, prefix="/api/users")

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

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=5000)