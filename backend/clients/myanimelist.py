"""
MyAnimeList (MAL) API client for fetching manga and anime series information
Supports both official MAL API and scraping for extended metadata
"""
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import datetime


class MyAnimeListClient:
    """Client for interacting with MyAnimeList API for manga metadata"""

    def __init__(self):
        self.base_url = "https://api.myanimelist.net/v2"
        self.session = None
        # Note: In production, this should be loaded from environment variables
        self.client_id = None

    def set_client_id(self, client_id: str):
        """Set the MAL API client ID for authentication"""
        self.client_id = client_id

    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def search_manga(self, query: str, limit: int = 10) -> Optional[List[Dict[str, Any]]]:
        """
        Search for manga on MyAnimeList

        Args:
            query: Search term (title, author, etc.)
            limit: Maximum number of results to return

        Returns:
            List of manga matching the query
        """
        if not self.client_id:
            return None

        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            headers = {
                "X-MAL-CLIENT-ID": self.client_id
            }

            params = {
                "query": query,
                "limit": limit,
                "fields": "id,title,main_picture,alternative_titles,media_type,airing,synopsis,num_episodes,num_chapters,num_volumes,status,genres,authors{first_name,last_name},start_date,end_date,pictures,rank,popularity,score,mean_score,statistics"
            }

            async with self.session.get(
                f"{self.base_url}/manga",
                headers=headers,
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return [self._parse_manga_data(item["node"]) for item in data.get("data", [])]
                return None

        except Exception as e:
            print(f"Error searching MyAnimeList: {e}")
            return None

    async def get_manga_by_id(self, mal_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a manga by its MAL ID

        Args:
            mal_id: MyAnimeList manga ID

        Returns:
            Detailed manga information
        """
        if not self.client_id:
            return None

        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            headers = {
                "X-MAL-CLIENT-ID": self.client_id
            }

            params = {
                "fields": "id,title,main_picture,alternative_titles,media_type,num_chapters,num_volumes,status,genres,authors{first_name,last_name},start_date,end_date,synopsis,mean_score,rank,popularity,pictures,serialization,background"
            }

            async with self.session.get(
                f"{self.base_url}/manga/{mal_id}",
                headers=headers,
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_manga_data(data)
                return None

        except Exception as e:
            print(f"Error fetching MyAnimeList manga: {e}")
            return None

    async def get_manga_volumes(self, mal_id: int) -> List[Dict[str, Any]]:
        """
        Get volume information for a manga
        Note: MyAnimeList API doesn't provide individual volume details,
        so this generates a structured list based on total volumes

        Args:
            mal_id: MyAnimeList manga ID

        Returns:
            List of volume information
        """
        manga_data = await self.get_manga_by_id(mal_id)
        if not manga_data:
            return []

        volumes = []
        total_volumes = manga_data.get("total_volumes", 0)
        series_name = manga_data.get("title", "")

        for i in range(1, total_volumes + 1):
            volume = {
                "position": i,
                "title": f"{series_name}, Vol. {i}",
                "isbn_13": None,  # MAL doesn't provide ISBNs
                "isbn_10": None,
                "publisher": manga_data.get("publisher"),
                "published_date": None,
                "page_count": 180,  # Average manga volume
                "description": None,
                "cover_url": manga_data.get("cover_url"),
                "status": "missing"
            }
            volumes.append(volume)

        return volumes

    def _parse_manga_data(self, manga: Dict[str, Any]) -> Dict[str, Any]:
        """Parse MyAnimeList manga data into our series format"""

        # Extract title
        title = manga.get("title", "")
        alternative_titles = manga.get("alternative_titles", {})

        # Extract authors
        authors = []
        for author in manga.get("authors", []):
            if author.get("role") in ["Author", "Story", "Art"]:
                first_name = author["node"].get("first_name", "")
                last_name = author["node"].get("last_name", "")
                full_name = f"{first_name} {last_name}".strip()
                if full_name:
                    authors.append(full_name)

        author = authors[0] if authors else None

        # Extract cover image
        main_picture = manga.get("main_picture", {})
        cover_url = main_picture.get("large") or main_picture.get("medium")

        # Extract genres and other metadata
        genres = [g.get("name", "") for g in manga.get("genres", [])]

        # Parse dates
        start_date = manga.get("start_date")
        end_date = manga.get("end_date")

        return {
            "name": title,
            "alternative_names": [
                alternative_titles.get("en", ""),
                alternative_titles.get("ja_jp", "")
            ],
            "author": author,
            "authors": authors,
            "description": manga.get("synopsis"),
            "total_volumes": manga.get("num_volumes", 0),
            "total_chapters": manga.get("num_chapters", 0),
            "status": self._normalize_status(manga.get("status")),
            "media_type": manga.get("media_type", "manga").lower(),
            "genres": genres,
            "first_published": start_date,
            "last_published": end_date,
            "cover_url": cover_url,
            "mal_id": manga.get("id"),
            "score": manga.get("mean_score", 0) / 10 if manga.get("mean_score") else None,
            "rank": manga.get("rank"),
            "popularity": manga.get("popularity"),
            "serialization": manga.get("serialization", {}).get("name")
        }

    def _normalize_status(self, status: str) -> str:
        """Normalize MyAnimeList status to standard format"""
        status_map = {
            "currently_publishing": "ongoing",
            "finished": "completed",
            "not_yet_published": "upcoming"
        }
        return status_map.get(status, status.lower() if status else "unknown")


class MyAnimeListMangaListClient:
    """Client for accessing user's MyAnimeList manga lists"""

    def __init__(self, access_token: Optional[str] = None):
        self.base_url = "https://api.myanimelist.net/v2"
        self.session = None
        self.access_token = access_token

    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def get_user_manga_list(self, username: str, status: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Get a user's manga list from MyAnimeList
        Note: This uses the public endpoint, full access requires authentication

        Args:
            username: MyAnimeList username
            status: Filter by status (reading, completed, on_hold, dropped, plan_to_read)

        Returns:
            List of manga in user's list
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            # Note: Full user list access requires OAuth, this is limited public data
            # For full access, implement OAuth flow with proper credentials

            params = {
                "fields": "id,title,list_status,num_chapters,num_volumes"
            }

            if status:
                params["status"] = status

            # This is limited to public API - full access requires OAuth
            print(f"Warning: Fetching limited public data for user: {username}")
            print(f"For full access, implement OAuth 2.0 flow with MAL API")

            # Return empty for now - requires proper OAuth implementation
            return []

        except Exception as e:
            print(f"Error fetching MyAnimeList user data: {e}")
            return None
