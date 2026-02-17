from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.modules.account.account_router import account_router
from src.modules.auth.auth_router import router as auth_router
from src.modules.complaint.complaint_router import complaint_router
from src.modules.location.location_router import location_router
from src.modules.party.party_router import party_router
from src.modules.police.police_router import police_router
from src.modules.student.student_router import student_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
def handle_http_exception(req: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
def handle_general_exception(req: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred.", "detail": str(exc)},
    )


@app.get("/api")
def read_root():
    return {"message": "Successful Test"}


app.include_router(auth_router)
app.include_router(account_router)
app.include_router(party_router)
app.include_router(student_router)
app.include_router(location_router)
app.include_router(police_router)
app.include_router(complaint_router)
