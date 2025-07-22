try:
    from backend.clients.google_books import GoogleBooksClient
    from backend.clients.openlibrary import OpenLibraryClient
    from backend.clients.amazon import AmazonClient, AudibleClient, AmazonIntegrationService
except ImportError:
    from .google_books import GoogleBooksClient
    from .openlibrary import OpenLibraryClient
    from .amazon import AmazonClient, AudibleClient, AmazonIntegrationService

__all__ = ["GoogleBooksClient", "OpenLibraryClient", "AmazonClient", "AudibleClient", "AmazonIntegrationService"]