from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from database import Base, engine
import models
from routers import auth, blog, shopping, admin, recipes, tags
from rate_limit import limiter
import os

Base.metadata.create_all(bind=engine)
os.makedirs(os.getenv("UPLOAD_DIR", "/app/uploads"), exist_ok=True)

app = FastAPI(title="Markus Homepage API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "https://markus-schwarz.cc").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)

app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_DIR", "/app/uploads")), name="uploads")

app.include_router(auth.router)
app.include_router(blog.router)
app.include_router(shopping.router)
app.include_router(admin.router)
app.include_router(recipes.router)
app.include_router(tags.router)

@app.get("/")
def root():
    return {"status": "API läuft!"}
