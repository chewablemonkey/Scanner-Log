from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from fastapi.staticfiles import StaticFiles
import os

from app.database import init_db
from app.routers import auth, items, notifications
from app.auth import get_current_active_user

app = FastAPI(title="Scanner Log API")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(notifications.router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/protected-healthz")
async def protected_healthz(user = Depends(get_current_active_user)):
    return {"status": "ok", "user": user.username}

@app.on_event("startup")
async def startup_event():
    await init_db()
