import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import books
from .routers import books_admin
from .routers import test_books
from .routers import settings
from .routers import search
from .routers import reading_progress
from .routers import series
from .routers import amazon
from .middleware import ErrorHandlingMiddleware, RequestLoggingMiddleware
from .config import setup_logging, setup_colored_logging, get_logger
from .database.connection import init_database, close_database
from .services.database_service import DatabaseIntegrationService
from .services.background_job_service import background_worker
from .services.setup_scheduled_tasks import initialize_dynamic_system

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
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(books.router, prefix="/api")
app.include_router(books_admin.router, prefix="/api")
app.include_router(test_books.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(reading_progress.router)
app.include_router(series.router, prefix="/api")
app.include_router(amazon.router)

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
    
    # Initialize database
    try:
        await init_database()
        logger.info("💾 Database initialized successfully")
        
        # Initialize dynamic caching system
        try:
            await initialize_dynamic_system()
            logger.info("🔄 Dynamic caching system initialized")
        except Exception as e:
            logger.warning(f"⚠️ Dynamic system initialization failed: {e}")
        
        # Start background worker for jobs
        try:
            import asyncio
            asyncio.create_task(background_worker.start_worker())
            logger.info("⚙️ Background job worker started")
        except Exception as e:
            logger.warning(f"⚠️ Background worker failed to start: {e}")
        
        # Seed test data if database is empty
        try:
            await DatabaseIntegrationService.seed_test_data()
        except Exception as e:
            logger.warning(f"⚠️ Test data seeding failed: {e}")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    logger.info("📚 Book library management system ready with dynamic caching")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Booktarr API shutting down")
    
    # Stop background worker
    try:
        await background_worker.stop_worker()
        logger.info("⚙️ Background job worker stopped")
    except Exception as e:
        logger.error(f"❌ Error stopping background worker: {e}")
    
    # Close database connections
    try:
        await close_database()
        logger.info("💾 Database connections closed")
    except Exception as e:
        logger.error(f"❌ Error closing database connections: {e}")