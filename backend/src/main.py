from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.core.config import env
from src.modules.account.account_router import account_router
from src.modules.auth.auth_router import router as auth_router
from src.modules.incident.incident_router import incident_router
from src.modules.location.location_router import location_router
from src.modules.party.party_router import party_router
from src.modules.police.police_router import police_router
from src.modules.student.student_router import student_router
from starlette.middleware.base import RequestResponseEndpoint

app = FastAPI()

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
