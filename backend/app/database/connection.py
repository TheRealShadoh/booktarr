"""
Database connection and session management
"""
import os
import pathlib
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
import logging

logger = logging.getLogger(__name__)

# Database URL configuration - using persistent file-based database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///app/data/booktarr.db")
SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL", "sqlite:///app/data/booktarr.db")

# Extract the data directory from the DATABASE_URL
if "///app/data/" in DATABASE_URL:
    data_dir = pathlib.Path("/app/data")
elif "///data/" in DATABASE_URL:
    # Local development - relative to current working directory
    data_dir = pathlib.Path("data")
else:
    # Default fallback
    data_dir = pathlib.Path("data")
data_dir.mkdir(parents=True, exist_ok=True)

# Test write permissions
try:
    test_file = data_dir / "test_write.tmp"
    test_file.write_text("test")
    test_file.unlink()
    logger.info(f"✅ Database directory is writable: {data_dir}")
except PermissionError as e:
    logger.error(f"❌ Database directory is not writable: {data_dir} - {e}")
    # Fall back to in-memory database if directory is not writable
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    SYNC_DATABASE_URL = "sqlite:///:memory:"
    logger.warning("⚠️ Falling back to in-memory database due to permission issues")
except Exception as e:
    logger.error(f"❌ Error testing directory permissions: {e}")
    # Fall back to in-memory database on any error
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    SYNC_DATABASE_URL = "sqlite:///:memory:"
    logger.warning("⚠️ Falling back to in-memory database due to permission testing error")

logger.info(f"📁 Using database: {DATABASE_URL}")
if ":memory:" in DATABASE_URL:
    logger.info("📝 Database mode: In-memory (data will be lost on restart)")
else:
    logger.info(f"💾 Database mode: Persistent file at /app/data/booktarr.db")

# Create async engine for SQLAlchemy 2.0
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    future=True,
    pool_pre_ping=True,
)

# Create sync engine for migrations
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

# Session makers
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)

# Base class for all models
Base = declarative_base()

async def get_async_session() -> AsyncSession:
    """Get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

def get_sync_session():
    """Get sync database session for migrations"""
    session = SessionLocal()
    try:
        yield session
    except Exception as e:
        logger.error(f"Sync database session error: {e}")
        session.rollback()
        raise
    finally:
        session.close()

async def init_database():
    """Initialize database tables"""
    global DATABASE_URL, SYNC_DATABASE_URL, async_engine, sync_engine
    
    try:
        # Import all models to ensure they're registered
        from .models import BookModel, SettingsModel, SyncHistoryModel
        
        if ":memory:" in DATABASE_URL:
            logger.info("🔄 Initializing in-memory database...")
        else:
            logger.info("🔄 Initializing persistent database...")
        
        async with async_engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database tables created successfully")
            
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        
        # If persistent database fails, fall back to in-memory
        if ":memory:" not in DATABASE_URL:
            logger.warning("⚠️ Persistent database failed, falling back to in-memory database")
            
            # Update URLs to in-memory
            DATABASE_URL = "sqlite+aiosqlite:///:memory:"
            SYNC_DATABASE_URL = "sqlite:///:memory:"
            
            # Recreate engines with new URLs
            from sqlalchemy import create_engine
            from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
            from sqlalchemy.orm import sessionmaker
            
            async_engine = create_async_engine(
                DATABASE_URL,
                echo=False,
                future=True,
                pool_pre_ping=True,
            )
            
            sync_engine = create_engine(
                SYNC_DATABASE_URL,
                echo=False,
                future=True,
                pool_pre_ping=True,
            )
            
            # Update global session makers
            global AsyncSessionLocal, SessionLocal
            AsyncSessionLocal = async_sessionmaker(
                bind=async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False,
            )
            
            SessionLocal = sessionmaker(
                bind=sync_engine,
                autocommit=False,
                autoflush=False,
            )
            
            logger.info("📝 Database mode: In-memory (data will be lost on restart)")
            
            # Try to initialize again with in-memory database
            try:
                logger.info("🔄 Initializing in-memory database...")
                async with async_engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                    logger.info("✅ Database tables created successfully")
            except Exception as retry_e:
                logger.error(f"❌ Failed to initialize in-memory database: {retry_e}")
                raise
        else:
            raise

async def close_database():
    """Close database connections"""
    await async_engine.dispose()
    logger.info("🔌 Database connections closed")