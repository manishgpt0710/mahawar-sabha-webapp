"""Mahawar Sabha — Minimal FastAPI health stub.

The real backend runs externally on Railway:
    https://mahawar-sabha-webapp-production.up.railway.app

This stub exists so the Emergent deployment health check on port 8001
passes. All actual API traffic goes to the external Node.js backend
(configured via REACT_APP_BACKEND_URL in /app/frontend/.env).
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

EXTERNAL_BACKEND = os.environ.get(
    "EXTERNAL_BACKEND_URL",
    "https://mahawar-sabha-webapp-production.up.railway.app",
)

app = FastAPI(title="Mahawar Sabha (stub)")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Liveness probe used by the Emergent deployment infra."""
    return {"ok": True}


@app.get("/api/")
async def root():
    """Informational — the real API lives on Railway."""
    return JSONResponse(
        {
            "message": "Mahawar Sabha API — external",
            "runtime": "stub",
            "backend": EXTERNAL_BACKEND,
            "note": (
                "This deployment does not host the API. The frontend calls "
                "the external backend directly via REACT_APP_BACKEND_URL."
            ),
        }
    )


@app.get("/")
async def index():
    return {"service": "mahawar-sabha-health-stub", "backend": EXTERNAL_BACKEND}
