"""
AniList API client for fetching comprehensive manga series information
"""
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import datetime


class AniListClient:
    """Client for interacting with AniList GraphQL API for manga metadata"""
    
    def __init__(self):
        self.base_url = "https://graphql.anilist.co"
        self.session = None
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def search_manga_series(self, series_name: str, author: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Search for a manga series and get complete volume information
        """
        query = """
        query ($search: String, $author: String) {
          Media(search: $search, type: MANGA) {
            id
            title {
              romaji
              english
              native
            }
            volumes
            chapters
            status
            description(asHtml: false)
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            staff(perPage: 10) {
              edges {
                role
                node {
                  name {
                    full
                  }
                }
              }
            }
            genres
            tags {
              name
              rank
            }
            coverImage {
              large
            }
          }
        }
        """
        
        # Handle special cases for well-known series
        search_term = self._normalize_series_name(series_name)
        
        variables = {
            "search": search_term
        }
        
        if author:
            variables["author"] = author
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            async with self.session.post(
                self.base_url,
                json={"query": query, "variables": variables}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    media = data.get("data", {}).get("Media")
                    
                    if media:
                        return self._parse_manga_data(media)
            
            return None
            
        except Exception as e:
            print(f"Error searching AniList: {e}")
            return None
    
    async def get_manga_volumes(self, series_name: str, total_volumes: int) -> List[Dict[str, Any]]:
        """
        Generate volume list for a manga series
        Since AniList doesn't provide individual volume details, we'll create a structured list
        """
        volumes = []
        
        # For popular series, we can add specific volume titles and dates
        volume_data = self._get_known_volume_data(series_name)
        
        for i in range(1, total_volumes + 1):
            volume_info = volume_data.get(i, {})
            
            volume = {
                "position": i,
                "title": volume_info.get("title", f"{series_name}, Vol. {i}"),
                "isbn_13": volume_info.get("isbn_13"),
                "isbn_10": volume_info.get("isbn_10"),
                "publisher": volume_info.get("publisher", "VIZ Media" if "Bleach" in series_name else None),
                "published_date": volume_info.get("published_date"),
                "page_count": volume_info.get("page_count", 200),  # Average manga volume
                "description": volume_info.get("description"),
                "cover_url": volume_info.get("cover_url"),
                "status": "missing"  # Default status
            }
            volumes.append(volume)
        
        return volumes
    
    def _parse_manga_data(self, media: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AniList media data into our series format"""
        # Extract title
        title = media["title"]["english"] or media["title"]["romaji"]
        
        # Extract author from staff
        author = None
        for edge in media.get("staff", {}).get("edges", []):
            if edge["role"] in ["Story", "Story & Art", "Original Creator"]:
                author = edge["node"]["name"]["full"]
                break
        
        # Parse dates
        start_date = None
        end_date = None
        
        if media.get("startDate"):
            sd = media["startDate"]
            if sd.get("year"):
                start_date = f"{sd['year']}-{sd.get('month', 1):02d}-{sd.get('day', 1):02d}"
        
        if media.get("endDate"):
            ed = media["endDate"]
            if ed.get("year"):
                end_date = f"{ed['year']}-{ed.get('month', 1):02d}-{ed.get('day', 1):02d}"
        
        # Extract genres and tags
        genres = media.get("genres", [])
        tags = [tag["name"] for tag in media.get("tags", []) if tag.get("rank", 0) > 50]
        
        return {
            "name": title,
            "author": author,
            "description": media.get("description"),
            "total_volumes": media.get("volumes") or 0,
            "total_chapters": media.get("chapters") or 0,
            "status": media.get("status", "UNKNOWN").lower(),
            "genres": genres,
            "tags": tags,
            "first_published": start_date,
            "last_published": end_date,
            "cover_url": media.get("coverImage", {}).get("large"),
            "anilist_id": media.get("id")
        }
    
    def _normalize_series_name(self, series_name: str) -> str:
        """
        Normalize series name for better AniList matching
        """
        # Handle common English/Romaji variations
        name_mappings = {
            "bleach": "Bleach",
            "naruto": "Naruto",
            "one piece": "One Piece",
            "dragon ball": "Dragon Ball",
            "attack on titan": "Shingeki no Kyojin",
            "demon slayer": "Kimetsu no Yaiba",
            "my hero academia": "Boku no Hero Academia",
            "death note": "Death Note",
            "fullmetal alchemist": "Fullmetal Alchemist",
            "jujutsu kaisen": "Jujutsu Kaisen"
        }
        
        normalized = series_name.lower().strip()
        
        # Check for exact mappings
        if normalized in name_mappings:
            return name_mappings[normalized]
        
        # Return original with proper capitalization
        return series_name.title()
    
    def _get_known_volume_data(self, series_name: str) -> Dict[int, Dict[str, Any]]:
        """
        Return known volume data for popular series
        This can be expanded with more series over time
        """
        if "Bleach" in series_name:
            # Bleach has 74 total volumes - return comprehensive data
            bleach_volumes = {}
            
            # Add known volume data for first few volumes
            known_volumes = {
                1: {
                    "title": "Bleach, Vol. 1: Strawberry and the Soul Reapers",
                    "published_date": "2004-07-06",
                    "isbn_13": "9781591164418"
                },
                2: {
                    "title": "Bleach, Vol. 2: Goodbye Parakeet, Good Night My Sister",
                    "published_date": "2004-08-03",
                    "isbn_13": "9781591164426"
                },
                3: {
                    "title": "Bleach, Vol. 3: Memories in the Rain",
                    "published_date": "2004-11-09",
                    "isbn_13": "9781591165729"
                },
                4: {
                    "title": "Bleach, Vol. 4: Quincy Archer Hates You",
                    "published_date": "2004-12-07",
                    "isbn_13": "9781591166078"
                },
                74: {
                    "title": "Bleach, Vol. 74: The Death and the Strawberry",
                    "published_date": "2018-10-02",
                    "isbn_13": "9781974700523"
                }
            }
            
            # Generate all 74 volumes
            for i in range(1, 75):  # Volumes 1-74
                if i in known_volumes:
                    bleach_volumes[i] = known_volumes[i]
                else:
                    bleach_volumes[i] = {
                        "title": f"Bleach, Vol. {i}",
                        "published_date": None,
                        "isbn_13": None
                    }
            
            return bleach_volumes
        
        return {}
    
    async def close(self):
        if self.session:
            await self.session.close()