import httpx
from typing import Optional, List, Dict, Any
import os
import json
import base64
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode, parse_qs
import logging

logger = logging.getLogger(__name__)


class AmazonClient:
    """
    Enhanced Amazon integration client with proper OAuth flow and library access.
    Requires Amazon Developer account and proper API credentials.
    """
    
    def __init__(self):
        self.client_id = os.getenv('AMAZON_CLIENT_ID')
        self.client_secret = os.getenv('AMAZON_CLIENT_SECRET')
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={
                'User-Agent': 'BookTarr/1.0',
                'Accept': 'application/json'
            }
        )
        self.base_url = 'https://api.amazon.com'
        self.auth_url = 'https://www.amazon.com/ap/oa'
    
    def generate_auth_url(self, redirect_uri: str, state: str = None) -> str:
        """
        Generate Amazon OAuth authentication URL.
        """
        if not self.client_id:
            raise ValueError("AMAZON_CLIENT_ID environment variable not set")
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            'client_id': self.client_id,
            'scope': 'profile postal_code',  # Add digital content scope when available
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'state': state
        }
        
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        """
        if not self.client_id or not self.client_secret:
            return {
                "error": "Missing Amazon API credentials",
                "message": "AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET must be set"
            }
        
        try:
            # Create basic auth header
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            response = await self.client.post(
                'https://api.amazon.com/auth/o2/token',
                headers={
                    'Authorization': f'Basic {encoded_credentials}',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': redirect_uri
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                self.refresh_token = token_data.get('refresh_token')
                
                # Calculate token expiration
                expires_in = token_data.get('expires_in', 3600)
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
                
                return {
                    "success": True,
                    "access_token": self.access_token,
                    "expires_at": self.token_expires_at.isoformat()
                }
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return {
                    "error": f"Token exchange failed: {response.status_code}",
                    "details": error_data
                }
        
        except Exception as e:
            logger.error(f"Amazon token exchange failed: {e}")
            return {
                "error": "Token exchange failed",
                "message": str(e)
            }
    
    async def refresh_access_token(self) -> Dict[str, Any]:
        """
        Refresh the access token using the refresh token.
        """
        if not self.refresh_token:
            return {"error": "No refresh token available"}
        
        try:
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            response = await self.client.post(
                'https://api.amazon.com/auth/o2/token',
                headers={
                    'Authorization': f'Basic {encoded_credentials}',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': self.refresh_token
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                
                # Update expiration time
                expires_in = token_data.get('expires_in', 3600)
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
                
                return {"success": True, "access_token": self.access_token}
            else:
                return {"error": f"Token refresh failed: {response.status_code}"}
        
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return {"error": str(e)}
    
    async def ensure_valid_token(self) -> bool:
        """
        Ensure we have a valid access token, refreshing if necessary.
        """
        if not self.access_token:
            return False
        
        # Check if token is expired or expiring soon (within 5 minutes)
        if self.token_expires_at and datetime.now() + timedelta(minutes=5) >= self.token_expires_at:
            refresh_result = await self.refresh_access_token()
            return refresh_result.get('success', False)
        
        return True
    
    async def get_kindle_library(self) -> Dict[str, Any]:
        """
        Retrieve Kindle library. 
        Note: This is a mock implementation as Amazon's Digital Content API 
        is not publicly available. In a real implementation, this would
        require special API access from Amazon.
        """
        if not await self.ensure_valid_token():
            return {"error": "Not authenticated with Amazon"}
        
        # Mock implementation for demonstration
        # In reality, this would call something like:
        # GET https://api.amazon.com/user/digital-content/library
        
        try:
            # This is a mock response showing what the structure would look like
            mock_kindle_books = [
                {
                    "asin": "B08CMF2QQQ",
                    "title": "The Seven Moons of Maali Almeida",
                    "authors": ["Shehan Karunatilaka"],
                    "isbn_13": "9781682475446",
                    "cover_url": "https://m.media-amazon.com/images/I/51example.jpg",
                    "purchase_date": "2023-08-15T10:30:00Z",
                    "format": "Kindle Edition",
                    "file_size": "2.1 MB",
                    "reading_progress": {
                        "percentage": 45,
                        "last_read": "2023-09-01T14:20:00Z"
                    }
                },
                {
                    "asin": "B09XVZQ123",
                    "title": "Klara and the Sun",
                    "authors": ["Kazuo Ishiguro"],
                    "isbn_13": "9780571364909",
                    "cover_url": "https://m.media-amazon.com/images/I/51example2.jpg",
                    "purchase_date": "2023-07-22T16:45:00Z",
                    "format": "Kindle Edition",
                    "file_size": "1.8 MB",
                    "reading_progress": {
                        "percentage": 100,
                        "last_read": "2023-08-10T20:15:00Z",
                        "finished_date": "2023-08-10T20:15:00Z"
                    }
                }
            ]
            
            return {
                "success": True,
                "books": mock_kindle_books,
                "total_count": len(mock_kindle_books),
                "sync_timestamp": datetime.now().isoformat(),
                "note": "This is a mock implementation. Real implementation requires Amazon Digital Content API access."
            }
        
        except Exception as e:
            logger.error(f"Failed to fetch Kindle library: {e}")
            return {"error": f"Failed to fetch Kindle library: {str(e)}"}
    
    async def get_user_profile(self) -> Dict[str, Any]:
        """
        Get user profile information from Amazon.
        """
        if not await self.ensure_valid_token():
            return {"error": "Not authenticated with Amazon"}
        
        try:
            response = await self.client.get(
                'https://api.amazon.com/user/profile',
                headers={'Authorization': f'Bearer {self.access_token}'}
            )
            
            if response.status_code == 200:
                return {"success": True, "profile": response.json()}
            else:
                return {"error": f"Profile fetch failed: {response.status_code}"}
        
        except Exception as e:
            logger.error(f"Profile fetch failed: {e}")
            return {"error": str(e)}
    
    async def get_audible_library(self) -> Dict[str, Any]:
        """
        Retrieve Audible library.
        Note: This is a mock implementation as Audible's API is not publicly available.
        """
        if not await self.ensure_valid_token():
            return {"error": "Not authenticated with Amazon"}
        
        try:
            # Mock implementation for demonstration
            mock_audible_books = [
                {
                    "asin": "B089HPMKZ9",
                    "title": "Atomic Habits",
                    "authors": ["James Clear"],
                    "narrator": "James Clear",
                    "isbn_13": "9780735211292",
                    "cover_url": "https://m.media-amazon.com/images/I/51audible1.jpg",
                    "purchase_date": "2023-06-10T12:00:00Z",
                    "format": "Audible Audiobook",
                    "runtime_minutes": 324,
                    "listening_progress": {
                        "percentage": 78,
                        "last_listened": "2023-09-05T18:30:00Z",
                        "current_chapter": 8,
                        "total_chapters": 12
                    }
                },
                {
                    "asin": "B0779T8DNJ",
                    "title": "Becoming",
                    "authors": ["Michelle Obama"],
                    "narrator": "Michelle Obama",
                    "isbn_13": "9781524763138",
                    "cover_url": "https://m.media-amazon.com/images/I/51audible2.jpg",
                    "purchase_date": "2023-05-22T09:15:00Z",
                    "format": "Audible Audiobook",
                    "runtime_minutes": 1140,
                    "listening_progress": {
                        "percentage": 100,
                        "last_listened": "2023-07-30T21:45:00Z",
                        "finished_date": "2023-07-30T21:45:00Z",
                        "total_chapters": 24
                    }
                }
            ]
            
            return {
                "success": True,
                "books": mock_audible_books,
                "total_count": len(mock_audible_books),
                "sync_timestamp": datetime.now().isoformat(),
                "note": "This is a mock implementation. Real implementation requires Audible API access."
            }
        
        except Exception as e:
            logger.error(f"Failed to fetch Audible library: {e}")
            return {"error": f"Failed to fetch Audible library: {str(e)}"}
    
    async def close(self):
        await self.client.aclose()


class AudibleClient:
    """
    Placeholder for Audible-specific integration.
    This would require Audible API access.
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient()
    
    async def get_library(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Placeholder for Audible library retrieval.
        """
        return {
            "error": "Audible API access not implemented yet",
            "message": "This feature requires proper Audible API credentials"
        }
    
    async def close(self):
        await self.client.aclose()


# Service class to handle Amazon integration
class AmazonIntegrationService:
    """
    Service to handle Amazon/Audible integration and library synchronization.
    """
    
    def __init__(self):
        self.amazon_client = AmazonClient()
        self.audible_client = AudibleClient()
    
    async def sync_kindle_library(self, user_id: int) -> Dict[str, Any]:
        """
        Sync user's Kindle library with local database.
        """
        try:
            library = await self.amazon_client.get_kindle_library()
            
            if "error" in library:
                return library
            
            # In a real implementation, this would:
            # 1. Iterate through Kindle books
            # 2. Match them to local editions by ISBN/ASIN
            # 3. Mark matched editions as owned
            # 4. Add new books to database if not found
            
            return {
                "message": "Kindle library sync not fully implemented",
                "synced_books": 0,
                "new_books": 0,
                "errors": []
            }
        
        except Exception as e:
            return {"error": f"Failed to sync Kindle library: {str(e)}"}
    
    async def sync_audible_library(self, user_id: int) -> Dict[str, Any]:
        """
        Sync user's Audible library with local database.
        """
        try:
            library = await self.audible_client.get_library(
                self.amazon_client.access_token
            )
            
            if "error" in library:
                return library
            
            # In a real implementation, this would:
            # 1. Iterate through Audible books
            # 2. Match them to local editions by ISBN/ASIN
            # 3. Mark matched editions as owned
            # 4. Add new audiobook editions if not found
            
            return {
                "message": "Audible library sync not fully implemented",
                "synced_books": 0,
                "new_books": 0,
                "errors": []
            }
        
        except Exception as e:
            return {"error": f"Failed to sync Audible library: {str(e)}"}
    
    async def get_authentication_url(self, redirect_uri: str) -> str:
        """
        Generate Amazon OAuth authentication URL.
        """
        # In a real implementation, this would generate the proper OAuth URL
        return "https://www.amazon.com/ap/oa?client_id=YOUR_CLIENT_ID&scope=profile&response_type=code"
    
    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """
        Handle OAuth callback from Amazon.
        """
        # In a real implementation, this would:
        # 1. Exchange authorization code for access token
        # 2. Store tokens securely
        # 3. Return success/failure status
        
        return {
            "error": "OAuth callback handling not implemented yet",
            "message": "This feature requires proper Amazon OAuth setup"
        }
    
    async def close(self):
        await self.amazon_client.close()
        await self.audible_client.close()


# Note: To implement this properly, you would need:
# 1. Amazon Developer account
# 2. Access to Amazon's Digital Content API
# 3. Proper OAuth 2.0 implementation
# 4. Secure token storage
# 5. ASIN to ISBN mapping service
# 6. Audible API access (if available)

# This is a placeholder implementation that provides the structure
# for future development when proper API access is available.