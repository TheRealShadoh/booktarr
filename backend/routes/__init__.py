try:
    from backend.routes.books import router as books_router
    from backend.routes.settings import router as settings_router
except ImportError:
    from .books import router as books_router
    from .settings import router as settings_router

__all__ = ["books_router", "settings_router"]