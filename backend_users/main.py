from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import user
import uvicorn

app = FastAPI()

print("Including user router:", user.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(user.router, prefix="/api/users")

@app.get("/")
async def root():
    return {"message": "users backend dziala"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)