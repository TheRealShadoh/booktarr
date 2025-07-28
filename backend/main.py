from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

# Always use relative imports when in backend directory  
from database import init_db
from routes import books_router, settings_router
from routes.reading import router as reading_router
from routes.series import router as series_router
from routes.search import router as search_router
from routes.images import router as images_router
from routes.jobs import router as jobs_router
from routes.logs import router as logs_router

# Import library router directly from books module
try:
    from routes.books import library_router
except ImportError:
    from backend.routes.books import library_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    init_db()
    
    # Initialize job scheduler
    from services.job_scheduler import scheduler
    import asyncio
    
    # Register default jobs
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post("http://localhost:8000/api/jobs/register-defaults")
    except:
        # If API not ready yet, register directly
        from jobs.metadata_update_job import metadata_update_job
        scheduler.register_job(
            name="metadata_update",
            description="Updates missing metadata for all books from online sources",
            interval_hours=4.0,
            job_function=metadata_update_job,
            enabled=True
        )
    
    # Start scheduler
    scheduler.start()
    scheduler_task = asyncio.create_task(scheduler.scheduler_loop())
    
    yield
    
    # Cleanup on shutdown
    scheduler.stop()
    scheduler_task.cancel()


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
app.include_router(library_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(reading_router, prefix="/api/reading")
app.include_router(series_router, prefix="/api/series")
app.include_router(search_router, prefix="/api")
app.include_router(images_router, prefix="/api/images")
app.include_router(jobs_router, prefix="/api")
app.include_router(logs_router, prefix="/api")

# Mount static files for cover images
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


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