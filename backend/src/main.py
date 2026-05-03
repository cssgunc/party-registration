from typing import cast

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from src.core.config import env
from src.modules.account.account_router import account_router
from src.modules.auth.auth_router import router as auth_router
from src.modules.incident.incident_router import incident_router
from src.modules.location.location_router import location_router
from src.modules.party.party_router import party_router
from src.modules.police.police_router import police_router
from src.modules.student.student_router import student_router
from starlette.middleware.base import RequestResponseEndpoint
from starlette.types import ExceptionHandler

# If deployed behind a reverse proxy (e.g. nginx, Caddy, AWS ALB), replace
# get_remote_address with a function that reads request.headers["X-Forwarded-For"].
# Using get_remote_address behind a proxy means all users share one rate limit bucket.
# Using X-Forwarded-For without a proxy allows clients to spoof their IP and bypass limits.
limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, cast(ExceptionHandler, _rate_limit_exceeded_handler))
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[env.FRONTEND_BASE_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

API_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    ),
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next: RequestResponseEndpoint):
    response = await call_next(request)

    if request.url.path.startswith("/api"):
        for header, value in API_SECURITY_HEADERS.items():
            response.headers[header] = value

    return response


@app.exception_handler(HTTPException)
def handle_http_exception(req: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
def handle_general_exception(req: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )


@app.get("/api")
def read_root():
    return {"message": "Successful Test"}


app.include_router(auth_router)
app.include_router(account_router)
app.include_router(police_router)
app.include_router(party_router)
app.include_router(student_router)
app.include_router(location_router)
app.include_router(incident_router)
