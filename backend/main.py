from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Always use relative imports when in backend directory
from database import init_db
from routes import books_router, settings_router
from routes.reading import router as reading_router
from routes.series_simple import router as series_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    init_db()
    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(
    title="BookTarr API",
    description="A book collection management API with metadata enrichment and ownership tracking",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(books_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(reading_router, prefix="/api/reading")
app.include_router(series_router, prefix="/api/series")


@app.get("/")
async def root():
    return {"message": "BookTarr API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy"}


# Redirect endpoints for direct calls without /api prefix
from fastapi.responses import RedirectResponse

@app.get("/books")
async def redirect_books():
    return RedirectResponse(url="/api/books", status_code=307)

@app.get("/settings")
async def redirect_settings():
    return RedirectResponse(url="/api/settings", status_code=307)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)