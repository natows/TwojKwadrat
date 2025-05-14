from fastapi import FastAPI
from routers import posts
import uvicorn

app = FastAPI()
app.include_router(posts.router, prefix="/api/posts")


@app.get("/")
async def root():
    return {"message": "backend dziala"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)