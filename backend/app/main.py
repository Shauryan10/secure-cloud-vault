from contextlib import asynccontextmanager
from app.api.routes.auth import router as auth_router

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
app.include_router(auth_router)


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