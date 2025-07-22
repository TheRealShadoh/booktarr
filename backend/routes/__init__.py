try:
    from backend.routes.books import router as books_router
    from backend.routes.settings import router as settings_router
    from backend.routes.series import router as series_router
except ImportError:
    from .books import router as books_router
    from .settings import router as settings_router
    from .series import router as series_router

__all__ = ["books_router", "settings_router", "series_router"]