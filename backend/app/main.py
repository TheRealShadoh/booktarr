import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import books
from .routers import test_books
from .routers import settings
from .middleware import ErrorHandlingMiddleware, RequestLoggingMiddleware
from .config import setup_logging, setup_colored_logging, get_logger

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO")
if os.getenv("ENVIRONMENT") == "development":
    setup_colored_logging(log_level)
else:
    setup_logging(log_level)

logger = get_logger("booktarr.main")

app = FastAPI(title="Booktarr API", version="1.0.0")

# Add middleware (order matters - first added is outermost)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(books.router, prefix="/api")
app.include_router(test_books.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Booktarr API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    logger.debug("Health check endpoint accessed")
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Booktarr API starting up")
    logger.info("📚 Book library management system ready")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Booktarr API shutting down")