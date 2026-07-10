from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api import assets
from fastapi import FastAPI

from app.database import Base
from app.database import engine

import app.models



@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    yield
    print("Application shutting down...")


app = FastAPI(
    title="Secure Cloud Vault",
    version="1.0.0",
    description="Cloud Native Secure Asset Vault",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(assets.router)

@app.get("/")
def root():
    return {
        "message": "Secure Cloud Vault API running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }