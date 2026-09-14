"""FastAPI entrypoint for the Heri Health text intake vertical slice."""

import os
import time
from collections import defaultdict, deque
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .orchestrator import triage_input
from .sanitize import sanitize_patient_output
from .schemas import SymptomInput, TriageResponse

app = FastAPI(
    title="Heri Health Safety and Intake API",
    version="0.1.0",
    description="Patient intake support with a deterministic emergency safety gate.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("HERI_HEALTH_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        host.strip()
        for host in os.getenv("HERI_HEALTH_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
        if host.strip()
    ],
)

_requests: dict[str, deque[float]] = defaultdict(deque)
_rate_limit = int(os.getenv("HERI_HEALTH_RATE_LIMIT_PER_MINUTE", "30"))


@app.middleware("http")
async def security_and_rate_limits(request: Request, call_next):
    """Dependency-free baseline; use shared edge rate limiting when scaled."""
    request_id = str(uuid4())
    if request.url.path.startswith("/v1/"):
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        recent = _requests[client]
        while recent and recent[0] <= now - 60:
            recent.popleft()
        if len(recent) >= _rate_limit:
            return JSONResponse(
                {"detail": "Too many requests. Please wait a moment and try again."},
                status_code=429,
                headers={"X-Request-ID": request_id},
            )
        recent.append(now)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 100_000:
            return JSONResponse(
                {"detail": "Request is too large."}, status_code=413,
                headers={"X-Request-ID": request_id},
            )
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


class SanitizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8_000)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "storage": "none", "llm": "optional"}


@app.post("/v1/triage", response_model=TriageResponse)
def triage(input_data: SymptomInput) -> TriageResponse:
    return triage_input(input_data)


@app.post("/v1/sanitize")
def sanitize(payload: SanitizeRequest) -> dict[str, str]:
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="text is required")
    return {"text": sanitize_patient_output(payload.text)}
