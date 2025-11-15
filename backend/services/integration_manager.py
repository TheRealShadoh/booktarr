"""
Integration Manager for coordinating multiple book metadata and sync services
Provides unified interface for AniList, MyAnimeList, Goodreads, Google Books, etc.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

try:
    from backend.clients.anilist import AniListClient
    from backend.clients.myanimelist import MyAnimeListClient
    from backend.clients.goodreads import GoodreadsClient, GoodreadsUserClient
    from backend.clients.google_books import GoogleBooksClient
    from backend.clients.openlibrary import OpenLibraryClient
except ImportError:
    from clients.anilist import AniListClient
    from clients.myanimelist import MyAnimeListClient
    from clients.goodreads import GoodreadsClient, GoodreadsUserClient
    from clients.google_books import GoogleBooksClient
    from clients.openlibrary import OpenLibraryClient


class MetadataSource(str, Enum):
    """Available metadata sources for book information"""
    GOOGLE_BOOKS = "google_books"
    OPEN_LIBRARY = "openlibrary"
    GOODREADS = "goodreads"
    ANILIST = "anilist"
    MYANIMELIST = "myanimelist"
    LOCAL = "local"


class IntegrationManager:
    """Unified manager for all book metadata and sync integrations"""

    def __init__(self):
        # Initialize all clients
        self.anilist_client = AniListClient()
        self.mal_client = MyAnimeListClient()
        self.goodreads_client = GoodreadsClient()
        self.google_books_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()

        # User preferences
        self.user_preferences = {
            "primary_source": MetadataSource.GOOGLE_BOOKS,
            "manga_source": MetadataSource.ANILIST,  # For manga, use AniList by default
            "fallback_sources": [
                MetadataSource.OPEN_LIBRARY,
                MetadataSource.ANILIST,
                MetadataSource.GOODREADS
            ],
            "enable_anilist": True,
            "enable_mal": False,
            "enable_goodreads": True,
            "sync_reading_progress": False,
            "sync_ratings": False
        }

        # Integration status tracking
        self.integration_status = {
            MetadataSource.GOOGLE_BOOKS: {"enabled": True, "last_checked": None, "errors": 0},
            MetadataSource.OPEN_LIBRARY: {"enabled": True, "last_checked": None, "errors": 0},
            MetadataSource.GOODREADS: {"enabled": False, "last_checked": None, "errors": 0},
            MetadataSource.ANILIST: {"enabled": True, "last_checked": None, "errors": 0},
            MetadataSource.MYANIMELIST: {"enabled": False, "last_checked": None, "errors": 0},
        }

    async def close(self):
        """Close all client connections"""
        await self.anilist_client.close()
        await self.mal_client.close()
        await self.goodreads_client.close()

    async def search_book_metadata(self, query: str, search_type: str = "title") -> Dict[str, Any]:
        """
        Search for book metadata across multiple sources with unified results

        Args:
            query: Search query (ISBN, title, author)
            search_type: Type of search (isbn, title, author)

        Returns:
            Unified metadata from all available sources
        """
        results = {
            "query": query,
            "search_type": search_type,
            "timestamp": datetime.now().isoformat(),
            "sources": {}
        }

        # Search primary source
        if search_type == "isbn":
            primary_results = await self._search_by_isbn(query)
        elif search_type == "author":
            primary_results = await self._search_by_author(query)
        else:
            primary_results = await self._search_by_title(query)

        if primary_results:
            results["sources"]["primary"] = primary_results

        # Search fallback sources if primary returned limited results
        if not primary_results or len(primary_results) < 3:
            for source in self.user_preferences["fallback_sources"]:
                if not self.integration_status[source]["enabled"]:
                    continue

                fallback_results = await self._search_source(query, source, search_type)
                if fallback_results:
                    results["sources"][source.value] = fallback_results

        return results

    async def search_manga_series(self, series_name: str) -> Dict[str, Any]:
        """
        Search for manga series information from anime databases

        Args:
            series_name: Manga series name

        Returns:
            Unified manga metadata from AniList and MyAnimeList
        """
        results = {
            "series_name": series_name,
            "timestamp": datetime.now().isoformat(),
            "sources": {}
        }

        # Search AniList (primary for manga)
        if self.integration_status[MetadataSource.ANILIST]["enabled"]:
            anilist_results = await self.anilist_client.search_manga_series(series_name)
            if anilist_results:
                results["sources"][MetadataSource.ANILIST.value] = anilist_results

        # Search MyAnimeList (if enabled)
        if self.integration_status[MetadataSource.MYANIMELIST]["enabled"]:
            try:
                mal_results = await self.mal_client.search_manga(series_name)
                if mal_results:
                    results["sources"][MetadataSource.MYANIMELIST.value] = mal_results
            except Exception as e:
                print(f"Error searching MyAnimeList: {e}")

        return results

    async def get_series_volumes(self, series_name: str, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get volume information for a series from specified source

        Args:
            series_name: Series name
            source: Specific source to use (anilist, mal, etc.)

        Returns:
            List of volume information
        """
        if source == "anilist":
            manga_data = await self.anilist_client.search_manga_series(series_name)
            if manga_data:
                return await self.anilist_client.get_manga_volumes(series_name, manga_data["total_volumes"])

        elif source == "myanimelist":
            results = await self.mal_client.search_manga(series_name, limit=1)
            if results:
                return await self.mal_client.get_manga_volumes(results[0]["mal_id"])

        return []

    async def search_goodreads(self, query: str) -> Optional[List[Dict[str, Any]]]:
        """Search Goodreads for book information"""
        try:
            return await self.goodreads_client.search_books(query)
        except Exception as e:
            print(f"Error searching Goodreads: {e}")
            self._record_error(MetadataSource.GOODREADS)
            return None

    async def get_goodreads_book_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        """Get Goodreads book information by ISBN"""
        try:
            return await self.goodreads_client.get_book_by_isbn(isbn)
        except Exception as e:
            print(f"Error fetching Goodreads book: {e}")
            self._record_error(MetadataSource.GOODREADS)
            return None

    async def export_to_goodreads_format(self, books: List[Dict[str, Any]]) -> str:
        """
        Export books in Goodreads-compatible CSV format

        Args:
            books: List of book dictionaries

        Returns:
            CSV formatted string
        """
        csv_lines = [
            "book id,title,author,author l-name,author f-name,isbn,isbn13,my rating,average rating,"
            "publisher,binding,number of pages,original publication year,date read,date added,bookshelves,"
            "bookshelves with positions,exclusive shelf"
        ]

        for book in books:
            # Build Goodreads-compatible CSV row
            authors = book.get("authors", [])
            author_name = authors[0] if authors else ""
            last_name = author_name.split()[-1] if author_name else ""
            first_name = author_name.replace(last_name, "").strip() if author_name else ""

            row = [
                f'"{book.get("id", "")}"',
                f'"{book.get("title", "").replace(chr(34), chr(34) + chr(34))}"',
                f'"{author_name}"',
                f'"{last_name}"',
                f'"{first_name}"',
                f'"{book.get("isbn", "")}"',
                f'"{book.get("isbn13", "")}"',
                str(book.get("rating", 0)),
                str(book.get("average_rating", 0)),
                f'"{book.get("publisher", "")}"',
                f'"{book.get("format", "Unknown")}"',
                str(book.get("page_count", 0)),
                str(book.get("published_date", "")[:4] if book.get("published_date") else ""),
                str(book.get("date_read", "")),
                str(book.get("date_added", "")),
                f'"{",".join(book.get("categories", []))}"',
                f'"{book.get("series", "")}"',
                "true" if not book.get("series") else "false"
            ]

            csv_lines.append(",".join(row))

        return "\n".join(csv_lines)

    def set_user_preferences(self, preferences: Dict[str, Any]):
        """Update user integration preferences"""
        self.user_preferences.update(preferences)

    def get_user_preferences(self) -> Dict[str, Any]:
        """Get current user integration preferences"""
        return self.user_preferences.copy()

    def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all integrations"""
        return {
            "integrations": self.integration_status.copy(),
            "preferences": self.user_preferences.copy(),
            "timestamp": datetime.now().isoformat()
        }

    def enable_integration(self, source: str):
        """Enable a specific integration"""
        try:
            source_enum = MetadataSource[source.upper()]
            if source_enum in self.integration_status:
                self.integration_status[source_enum]["enabled"] = True
        except KeyError:
            print(f"Unknown integration source: {source}")

    def disable_integration(self, source: str):
        """Disable a specific integration"""
        try:
            source_enum = MetadataSource[source.upper()]
            if source_enum in self.integration_status:
                self.integration_status[source_enum]["enabled"] = False
        except KeyError:
            print(f"Unknown integration source: {source}")

    # Private helper methods

    async def _search_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        """Search for book by ISBN"""
        try:
            result = await self.google_books_client.search_by_isbn(isbn)
            return result
        except Exception as e:
            print(f"Error searching by ISBN: {e}")
            return None

    async def _search_by_title(self, title: str) -> Optional[List[Dict[str, Any]]]:
        """Search for book by title"""
        try:
            results = await self.google_books_client.search(title)
            return results if results else None
        except Exception as e:
            print(f"Error searching by title: {e}")
            return None

    async def _search_by_author(self, author: str) -> Optional[List[Dict[str, Any]]]:
        """Search for books by author"""
        try:
            results = await self.google_books_client.search(f"author:{author}")
            return results if results else None
        except Exception as e:
            print(f"Error searching by author: {e}")
            return None

    async def _search_source(
        self, query: str, source: MetadataSource, search_type: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Search a specific source"""
        try:
            if source == MetadataSource.GOOGLE_BOOKS:
                if search_type == "isbn":
                    return await self.google_books_client.search_by_isbn(query)
                else:
                    return await self.google_books_client.search(query)

            elif source == MetadataSource.OPEN_LIBRARY:
                if search_type == "isbn":
                    return await self.openlibrary_client.search_by_isbn(query)
                else:
                    return await self.openlibrary_client.search(query)

            elif source == MetadataSource.GOODREADS:
                return await self.goodreads_client.search_books(query)

            elif source == MetadataSource.ANILIST:
                result = await self.anilist_client.search_manga_series(query)
                return [result] if result else None

            elif source == MetadataSource.MYANIMELIST:
                return await self.mal_client.search_manga(query)

        except Exception as e:
            print(f"Error searching {source.value}: {e}")
            self._record_error(source)

        return None

    def _record_error(self, source: MetadataSource):
        """Record an error for a specific integration"""
        if source in self.integration_status:
            self.integration_status[source]["errors"] += 1
            # Disable source after 5 consecutive errors
            if self.integration_status[source]["errors"] >= 5:
                self.integration_status[source]["enabled"] = False
                print(f"Integration {source.value} disabled due to repeated errors")


# Global integration manager instance
integration_manager: Optional[IntegrationManager] = None


async def get_integration_manager() -> IntegrationManager:
    """Get or create global integration manager"""
    global integration_manager
    if integration_manager is None:
        integration_manager = IntegrationManager()
    return integration_manager


async def close_integration_manager():
    """Close global integration manager"""
    global integration_manager
    if integration_manager:
        await integration_manager.close()
        integration_manager = None
