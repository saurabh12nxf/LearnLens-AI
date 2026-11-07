# LearnLens AI - Vercel Serverless Entrypoint for FastAPI
from main import app

# Expose 'app' for Vercel / ASGI serverless runners
__all__ = ["app"]

