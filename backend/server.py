from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
import xml.etree.ElementTree as ET
import asyncio
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# API endpoints
RADIO_BROWSER_API = "https://de1.api.radio-browser.info/json"
RADIO_BROWSER_API_BACKUP = "https://nl1.api.radio-browser.info/json"
TUNEIN_API = "https://opml.radiotime.com"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class Station(BaseModel):
    model_config = ConfigDict(extra="ignore")
    stationuuid: str
    name: str
    url: str
    url_resolved: Optional[str] = ""
    homepage: Optional[str] = ""
    favicon: Optional[str] = ""
    country: str
    countrycode: str
    state: Optional[str] = ""
    language: Optional[str] = ""
    languagecodes: Optional[str] = ""
    votes: int = 0
    codec: Optional[str] = ""
    bitrate: int = 0
    tags: Optional[str] = ""
    clickcount: int = 0
    source: Optional[str] = "radio-browser"  # Track which API the station came from

class FavoriteStation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stationuuid: str
    name: str
    url: str
    favicon: Optional[str] = ""
    country: str
    countrycode: str
    tags: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FavoriteCreate(BaseModel):
    stationuuid: str
    name: str
    url: str
    favicon: Optional[str] = ""
    country: str
    countrycode: str
    tags: Optional[str] = ""

class Podcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = ""
    author: Optional[str] = ""
    image: Optional[str] = ""
    url: str
    feed_url: Optional[str] = ""
    categories: Optional[str] = ""
    language: Optional[str] = ""
    episode_count: int = 0

class PodcastEpisode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = ""
    audio_url: str
    duration: Optional[int] = 0
    published: Optional[str] = ""
    image: Optional[str] = ""

# Podcast API (iTunes/Apple Podcasts Search API - Free)
ITUNES_PODCAST_API = "https://itunes.apple.com"

# Region to countries mapping
REGIONS = {
    "europe": ["DE", "FR", "GB", "IT", "ES", "NL", "BE", "PL", "SE", "NO", "DK", "FI", "AT", "CH", "PT", "IE", "GR", "CZ", "HU", "RO", "UA", "SK", "BG", "HR", "RS", "SI", "LT", "LV", "EE"],
    "americas": ["US", "CA", "MX", "BR", "AR", "CO", "CL", "PE", "VE", "EC", "BO", "PY", "UY", "CR", "PA", "CU", "DO", "PR", "JM", "TT"],
    "asia": ["JP", "KR", "CN", "IN", "TH", "VN", "ID", "PH", "MY", "SG", "TW", "HK", "PK", "BD", "LK", "NP", "MM", "KH", "LA"],
    "russia": ["RU"],
    "africa": ["ZA", "EG", "NG", "KE", "GH", "TZ", "MA", "DZ", "TN", "ET"],
    "oceania": ["AU", "NZ", "FJ", "PG"]
}

# Country code to full name mapping for TuneIn
COUNTRY_NAMES = {
    "US": "United States", "GB": "United Kingdom", "DE": "Germany", "FR": "France",
    "IT": "Italy", "ES": "Spain", "NL": "Netherlands", "PL": "Poland", "SE": "Sweden",
    "NO": "Norway", "DK": "Denmark", "FI": "Finland", "AT": "Austria", "CH": "Switzerland",
    "PT": "Portugal", "IE": "Ireland", "GR": "Greece", "CZ": "Czech Republic",
    "HU": "Hungary", "RO": "Romania", "UA": "Ukraine", "RU": "Russia", "JP": "Japan",
    "KR": "South Korea", "CN": "China", "IN": "India", "AU": "Australia", "CA": "Canada",
    "MX": "Mexico", "BR": "Brazil", "AR": "Argentina"
}

# Popular genres
GENRES = [
    "pop", "rock", "jazz", "classical", "electronic", "hip hop", "country", 
    "r&b", "reggae", "latin", "folk", "blues", "metal", "indie", "soul",
    "dance", "ambient", "world", "news", "talk", "sports"
]

async def fetch_radio_browser(endpoint: str, params: dict = None, use_backup: bool = False) -> list:
    """Fetch data from Radio Browser API with fallback"""
    api_url = RADIO_BROWSER_API_BACKUP if use_backup else RADIO_BROWSER_API
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            response = await http_client.get(
                f"{api_url}/{endpoint}",
                params=params,
                headers={"User-Agent": "GlobalRadioStation/1.0"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Radio Browser API error: {e}")
            # Try backup if primary fails
            if not use_backup:
                return await fetch_radio_browser(endpoint, params, use_backup=True)
            raise HTTPException(status_code=502, detail="Failed to fetch radio stations")

async def resolve_tunein_stream(tune_url: str, http_client: httpx.AsyncClient) -> str:
    """Resolve TuneIn Tune.ashx URL to actual stream URL"""
    try:
        # TuneIn Tune.ashx returns a playlist (PLS or M3U) with the actual stream URL
        response = await http_client.get(tune_url, follow_redirects=True)
        content = response.text
        
        # Try to extract stream URL from PLS format
        if '[playlist]' in content.lower():
            for line in content.split('\n'):
                if line.lower().startswith('file1='):
                    return line.split('=', 1)[1].strip()
        
        # Try to extract from M3U format
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and (line.startswith('http://') or line.startswith('https://')):
                return line
        
        # If response is already a direct URL
        if response.url and str(response.url) != tune_url:
            return str(response.url)
            
        return tune_url
    except Exception as e:
        logger.warning(f"Failed to resolve TuneIn URL {tune_url}: {e}")
        return tune_url

async def fetch_tunein_stations(query: str = None, genre: str = None, limit: int = 20) -> list:
    """Fetch stations from TuneIn API"""
    stations = []
    
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as http_client:
        try:
            # Build search URL
            if query:
                url = f"{TUNEIN_API}/Search.ashx"
                params = {"query": query}
            elif genre:
                url = f"{TUNEIN_API}/Browse.ashx"
                params = {"c": "music", "filter": genre}
            else:
                url = f"{TUNEIN_API}/Browse.ashx"
                params = {"c": "music"}
            
            response = await http_client.get(url, params=params)
            response.raise_for_status()
            
            # Parse OPML/XML response
            root = ET.fromstring(response.text)
            
            station_data = []
            for outline in root.iter('outline'):
                if outline.get('type') == 'audio' and outline.get('item') == 'station':
                    # Skip unavailable stations
                    if outline.get('key') == 'unavailable':
                        continue
                    
                    tune_url = outline.get('URL', '')
                    if not tune_url:
                        continue
                    
                    station_data.append({
                        'tune_url': tune_url,
                        'name': outline.get('text', 'Unknown Station'),
                        'image': outline.get('image', ''),
                        'subtext': outline.get('subtext', ''),
                        'genre_id': outline.get('genre_id', ''),
                        'bitrate': outline.get('bitrate', '0'),
                        'formats': outline.get('formats', ''),
                        'guide_id': outline.get('guide_id', '')
                    })
                    
                    if len(station_data) >= limit:
                        break
            
            # Resolve stream URLs in parallel (limit to prevent too many requests)
            async def process_station(data):
                stream_url = await resolve_tunein_stream(data['tune_url'], http_client)
                station_id = hashlib.md5(stream_url.encode()).hexdigest()
                
                return {
                    "stationuuid": f"tunein-{station_id}",
                    "name": data['name'],
                    "url": stream_url,
                    "url_resolved": stream_url,
                    "homepage": f"https://tunein.com/radio/{data['guide_id']}/",
                    "favicon": data['image'],
                    "country": data['subtext'].split(',')[-1].strip() if data['subtext'] else 'TuneIn',
                    "countrycode": "",
                    "state": "",
                    "language": "",
                    "languagecodes": "",
                    "votes": 0,
                    "codec": data['formats'],
                    "bitrate": int(data['bitrate']) if data['bitrate'].isdigit() else 0,
                    "tags": data['genre_id'],
                    "clickcount": 0,
                    "source": "tunein"
                }
            
            # Process stations (limit parallel requests)
            tasks = [process_station(data) for data in station_data[:limit]]
            stations = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            return [s for s in stations if isinstance(s, dict)]
            
        except Exception as e:
            logger.error(f"TuneIn API error: {e}")
            return []

async def verify_stream_url(url: str, timeout: float = 8.0) -> bool:
    """
    Robust check if a stream URL is accessible and actually serving audio.
    Uses HEAD first, then GET with Range header if needed.
    """
    try:
        # Audio content types that indicate a valid stream
        audio_types = [
            'audio/', 'application/ogg', 'application/octet-stream',
            'video/mp4', 'application/x-mpegurl', 'application/vnd.apple.mpegurl',
            'audio/x-mpegurl', 'audio/mpegurl'
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'audio/mpeg,audio/*,*/*',
            'Icy-MetaData': '1'
        }
        
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as http_client:
            # First try HEAD request (fast, works for most servers)
            try:
                response = await http_client.head(url, headers=headers)
                
                if response.status_code < 400:
                    content_type = response.headers.get('content-type', '').lower()
                    
                    # If we got audio content type from HEAD, it's likely live
                    if any(audio_type in content_type for audio_type in audio_types):
                        return True
                    
                    # Check for ICY headers (SHOUTcast/Icecast)
                    if response.headers.get('icy-name') or response.headers.get('icy-genre'):
                        return True
                    
            except Exception:
                pass  # HEAD failed, try GET
            
            # Try GET with Range header to get just first bytes
            try:
                range_headers = {**headers, 'Range': 'bytes=0-512'}
                
                # Use stream=True and don't read all content
                async with http_client.stream('GET', url, headers=range_headers) as response:
                    if response.status_code >= 400:
                        # Some servers don't like Range, try without
                        pass
                    else:
                        content_type = response.headers.get('content-type', '').lower()
                        
                        # Check content type
                        if any(audio_type in content_type for audio_type in audio_types):
                            return True
                        
                        # Check ICY headers
                        if response.headers.get('icy-name') or response.headers.get('icy-genre'):
                            return True
                        
                        # If status is OK, try to read a small chunk
                        if response.status_code in [200, 206]:
                            try:
                                chunk = await response.aread()
                                if len(chunk) > 0:
                                    return True
                            except Exception:
                                # Streaming response, assume it's working
                                return True
                        
            except Exception:
                pass
            
            # Last resort: simple GET without Range (for servers like BBC)
            try:
                async with http_client.stream('GET', url, headers=headers) as response:
                    if response.status_code < 400:
                        content_type = response.headers.get('content-type', '').lower()
                        if any(audio_type in content_type for audio_type in audio_types):
                            return True
                        # Try reading a tiny bit
                        try:
                            async for chunk in response.aiter_bytes(512):
                                if len(chunk) > 0:
                                    return True
                                break
                        except Exception:
                            return True  # Stream started sending
            except Exception:
                return False
            
            return False
            
    except httpx.TimeoutException:
        return False
    except Exception as e:
        logger.debug(f"Stream verification failed for {url}: {e}")
        return False

class StationVerifyRequest(BaseModel):
    stations: List[dict]

class StationVerifyResult(BaseModel):
    stationuuid: str
    is_live: bool
    checked_at: str

@api_router.post("/stations/verify-batch", response_model=List[StationVerifyResult])
async def verify_stations_batch(request: StationVerifyRequest):
    """Verify multiple stations' stream URLs in parallel with robust checking"""
    results = []
    
    async def check_station(station):
        url = station.get('url_resolved') or station.get('url', '')
        stationuuid = station.get('stationuuid', '')
        
        if not url or not stationuuid:
            return None
        
        # Use longer timeout for more reliable results
        is_live = await verify_stream_url(url, timeout=12.0)
        return StationVerifyResult(
            stationuuid=stationuuid,
            is_live=is_live,
            checked_at=datetime.now(timezone.utc).isoformat()
        )
    
    # Process stations in smaller batches to avoid overwhelming and reduce timeouts
    batch_size = 5
    stations = request.stations[:50]  # Limit to 50 stations max
    
    for i in range(0, len(stations), batch_size):
        batch = stations[i:i + batch_size]
        tasks = [check_station(s) for s in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in batch_results:
            if isinstance(result, StationVerifyResult):
                results.append(result)
            elif isinstance(result, Exception):
                logger.debug(f"Station check failed: {result}")
    
    return results

@api_router.get("/stations/verify/{stationuuid}")
async def verify_single_station(stationuuid: str, url: str = Query(...)):
    """Verify a single station's stream URL - useful for quick re-checks"""
    is_live = await verify_stream_url(url, timeout=15.0)
    return StationVerifyResult(
        stationuuid=stationuuid,
        is_live=is_live,
        checked_at=datetime.now(timezone.utc).isoformat()
    )

async def get_combined_stations(
    name: str = None,
    country: str = None,
    countrycode: str = None,
    tag: str = None,
    limit: int = 50,
    offset: int = 0,
    include_tunein: bool = True
) -> list:
    """Get stations from multiple sources and combine results"""
    all_stations = []
    
    # Fetch from Radio Browser
    params = {
        "limit": limit,
        "offset": offset,
        "order": "clickcount",
        "reverse": "true",
        "hidebroken": "true"
    }
    if name:
        params["name"] = name
    if country:
        params["country"] = country
    if countrycode:
        params["countrycode"] = countrycode
    if tag:
        params["tag"] = tag
    
    try:
        rb_stations = await fetch_radio_browser("stations/search", params)
        for station in rb_stations:
            station["source"] = "radio-browser"
        all_stations.extend(rb_stations)
    except Exception as e:
        logger.error(f"Radio Browser fetch failed: {e}")
    
    # Fetch from TuneIn if enabled and we have a search query
    if include_tunein and (name or tag):
        try:
            tunein_stations = await fetch_tunein_stations(query=name, genre=tag)
            all_stations.extend(tunein_stations)
        except Exception as e:
            logger.error(f"TuneIn fetch failed: {e}")
    
    # Remove duplicates based on station name (case-insensitive)
    seen_names = set()
    unique_stations = []
    for station in all_stations:
        name_lower = station.get('name', '').lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            unique_stations.append(station)
    
    return unique_stations[:limit]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Global Radio Station API", "sources": ["radio-browser", "tunein"]}

@api_router.get("/stations/search", response_model=List[Station])
async def search_stations(
    name: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    countrycode: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    include_tunein: bool = Query(True)
):
    """Search for radio stations from multiple sources"""
    stations = await get_combined_stations(
        name=name,
        country=country,
        countrycode=countrycode,
        tag=tag,
        limit=limit,
        offset=offset,
        include_tunein=include_tunein
    )
    return stations

@api_router.get("/stations/top", response_model=List[Station])
async def get_top_stations(limit: int = Query(50, le=200)):
    """Get top stations by click count"""
    params = {
        "limit": limit,
        "order": "clickcount",
        "reverse": "true",
        "hidebroken": "true"
    }
    stations = await fetch_radio_browser("stations/search", params)
    for station in stations:
        station["source"] = "radio-browser"
    return stations

@api_router.get("/stations/by-country/{countrycode}", response_model=List[Station])
async def get_stations_by_country(
    countrycode: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """Get stations by country code"""
    params = {
        "countrycode": countrycode.upper(),
        "limit": limit,
        "offset": offset,
        "order": "clickcount",
        "reverse": "true",
        "hidebroken": "true"
    }
    stations = await fetch_radio_browser("stations/search", params)
    for station in stations:
        station["source"] = "radio-browser"
    return stations

@api_router.get("/stations/by-region/{region}", response_model=List[Station])
async def get_stations_by_region(
    region: str,
    limit: int = Query(100, le=200)
):
    """Get stations by region (europe, americas, asia, russia, africa, oceania)"""
    region_lower = region.lower()
    if region_lower not in REGIONS:
        raise HTTPException(status_code=400, detail=f"Invalid region. Choose from: {list(REGIONS.keys())}")
    
    country_codes = REGIONS[region_lower]
    all_stations = []
    
    # Fetch stations from multiple countries in parallel
    async def fetch_country(code: str):
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                response = await http_client.get(
                    f"{RADIO_BROWSER_API}/stations/search",
                    params={
                        "countrycode": code,
                        "limit": 15,
                        "order": "clickcount",
                        "reverse": "true",
                        "hidebroken": "true"
                    },
                    headers={"User-Agent": "GlobalRadioStation/1.0"}
                )
                if response.status_code == 200:
                    stations = response.json()
                    for s in stations:
                        s["source"] = "radio-browser"
                    return stations
        except Exception as e:
            logger.warning(f"Failed to fetch stations for {code}: {e}")
        return []
    
    # Fetch from first 12 countries in parallel
    tasks = [fetch_country(code) for code in country_codes[:12]]
    results = await asyncio.gather(*tasks)
    
    for stations in results:
        all_stations.extend(stations)
    
    # Sort by clickcount and limit
    all_stations.sort(key=lambda x: x.get('clickcount', 0), reverse=True)
    return all_stations[:limit]

@api_router.get("/stations/by-genre/{genre}", response_model=List[Station])
async def get_stations_by_genre(
    genre: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """Get stations by genre/tag from multiple sources"""
    stations = await get_combined_stations(
        tag=genre.lower(),
        limit=limit,
        offset=offset,
        include_tunein=True
    )
    return stations

@api_router.get("/stations/verify/{station_id}")
async def verify_station(station_id: str):
    """Verify if a station's stream is accessible"""
    # Try to get station info from favorites or search
    favorite = await db.favorites.find_one({"stationuuid": station_id}, {"_id": 0})
    
    if favorite:
        url = favorite.get('url', '')
        is_accessible = await verify_stream_url(url)
        return {"station_id": station_id, "url": url, "is_accessible": is_accessible}
    
    return {"station_id": station_id, "is_accessible": None, "error": "Station not found in favorites"}

@api_router.get("/countries")
async def get_countries():
    """Get list of countries with station counts"""
    countries = await fetch_radio_browser("countries", {"order": "stationcount", "reverse": "true"})
    return countries[:100]

@api_router.get("/tags")
async def get_tags():
    """Get popular tags/genres"""
    tags = await fetch_radio_browser("tags", {"order": "stationcount", "reverse": "true", "limit": 100})
    return tags

@api_router.get("/regions")
async def get_regions():
    """Get available regions"""
    return {
        "regions": list(REGIONS.keys()),
        "mapping": REGIONS
    }

@api_router.get("/genres")
async def get_genres():
    """Get predefined genres"""
    return {"genres": GENRES}

@api_router.get("/sources")
async def get_sources():
    """Get available radio station sources"""
    return {
        "sources": [
            {
                "id": "radio-browser",
                "name": "Radio Browser",
                "description": "Community database with 30,000+ stations",
                "url": "https://www.radio-browser.info"
            },
            {
                "id": "tunein",
                "name": "TuneIn",
                "description": "Popular radio streaming platform",
                "url": "https://tunein.com"
            }
        ]
    }

# Podcast endpoints (using iTunes Search API)
@api_router.get("/podcasts/search", response_model=List[Podcast])
async def search_podcasts(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, le=50)
):
    """Search for podcasts by name or topic"""
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            response = await http_client.get(
                f"{ITUNES_PODCAST_API}/search",
                params={
                    "term": query,
                    "media": "podcast",
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()
            
            podcasts = []
            for item in data.get("results", []):
                podcast = Podcast(
                    id=str(item.get("collectionId", "")),
                    title=item.get("collectionName", "Unknown"),
                    description=item.get("description", "") or item.get("collectionName", ""),
                    author=item.get("artistName", ""),
                    image=item.get("artworkUrl600", "") or item.get("artworkUrl100", ""),
                    url=item.get("collectionViewUrl", ""),
                    feed_url=item.get("feedUrl", ""),
                    categories=item.get("primaryGenreName", ""),
                    language=item.get("country", ""),
                    episode_count=item.get("trackCount", 0)
                )
                podcasts.append(podcast)
            
            return podcasts
        except Exception as e:
            logger.error(f"Podcast search error: {e}")
            raise HTTPException(status_code=502, detail="Failed to search podcasts")

@api_router.get("/podcasts/related")
async def get_related_podcasts(
    station_name: str = Query(...),
    tags: Optional[str] = Query(None),
    limit: int = Query(10, le=20)
):
    """Get podcasts related to a radio station based on name and tags"""
    # Build search query from station name and tags
    search_terms = [station_name]
    if tags:
        # Add first 2 tags to search
        tag_list = [t.strip() for t in tags.split(",")[:2]]
        search_terms.extend(tag_list)
    
    query = " ".join(search_terms)
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            response = await http_client.get(
                f"{ITUNES_PODCAST_API}/search",
                params={
                    "term": query,
                    "media": "podcast",
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()
            
            podcasts = []
            for item in data.get("results", []):
                podcast = {
                    "id": str(item.get("collectionId", "")),
                    "title": item.get("collectionName", "Unknown"),
                    "author": item.get("artistName", ""),
                    "image": item.get("artworkUrl600", "") or item.get("artworkUrl100", ""),
                    "url": item.get("collectionViewUrl", ""),
                    "feed_url": item.get("feedUrl", ""),
                    "categories": item.get("primaryGenreName", ""),
                    "episode_count": item.get("trackCount", 0)
                }
                podcasts.append(podcast)
            
            return {"podcasts": podcasts, "search_query": query}
        except Exception as e:
            logger.error(f"Related podcasts error: {e}")
            return {"podcasts": [], "search_query": query, "error": str(e)}

@api_router.get("/podcasts/top")
async def get_top_podcasts(
    genre: Optional[str] = Query(None),
    country: str = Query("US"),
    limit: int = Query(20, le=50)
):
    """Get top podcasts, optionally filtered by genre"""
    # iTunes genre IDs for podcasts
    genre_ids = {
        "music": 1310,
        "news": 1489,
        "comedy": 1303,
        "sports": 1545,
        "arts": 1301,
        "technology": 1318,
        "business": 1321,
        "health": 1512,
        "education": 1304,
        "society": 1324,
        "science": 1533,
        "history": 1487,
        "true crime": 1488,
        "fiction": 1483
    }
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            params = {
                "country": country,
                "limit": limit,
                "media": "podcast",
                "explicit": "no"
            }
            
            if genre and genre.lower() in genre_ids:
                params["genreId"] = genre_ids[genre.lower()]
                url = f"{ITUNES_PODCAST_API}/search"
                params["term"] = genre
            else:
                # Get top podcasts overall
                url = f"{ITUNES_PODCAST_API}/search"
                params["term"] = "top podcasts"
            
            response = await http_client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            podcasts = []
            for item in data.get("results", []):
                podcast = {
                    "id": str(item.get("collectionId", "")),
                    "title": item.get("collectionName", "Unknown"),
                    "author": item.get("artistName", ""),
                    "image": item.get("artworkUrl600", "") or item.get("artworkUrl100", ""),
                    "url": item.get("collectionViewUrl", ""),
                    "feed_url": item.get("feedUrl", ""),
                    "categories": item.get("primaryGenreName", ""),
                    "episode_count": item.get("trackCount", 0)
                }
                podcasts.append(podcast)
            
            return {"podcasts": podcasts, "genre": genre, "country": country}
        except Exception as e:
            logger.error(f"Top podcasts error: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch top podcasts")

@api_router.get("/podcasts/genres")
async def get_podcast_genres():
    """Get available podcast genres"""
    return {
        "genres": [
            "music", "news", "comedy", "sports", "arts", "technology",
            "business", "health", "education", "society", "science",
            "history", "true crime", "fiction"
        ]
    }

@api_router.get("/podcasts/{podcast_id}/episodes", response_model=List[PodcastEpisode])
async def get_podcast_episodes(
    podcast_id: str,
    limit: int = Query(20, le=50)
):
    """Get episodes for a specific podcast by fetching and parsing its RSS feed"""
    async with httpx.AsyncClient(timeout=20.0) as http_client:
        try:
            # First get the podcast info to get the feed URL
            lookup_response = await http_client.get(
                f"{ITUNES_PODCAST_API}/lookup",
                params={"id": podcast_id, "entity": "podcast"}
            )
            lookup_response.raise_for_status()
            lookup_data = lookup_response.json()
            
            if not lookup_data.get("results"):
                raise HTTPException(status_code=404, detail="Podcast not found")
            
            podcast_info = lookup_data["results"][0]
            feed_url = podcast_info.get("feedUrl")
            
            if not feed_url:
                raise HTTPException(status_code=404, detail="Podcast feed not available")
            
            # Fetch and parse the RSS feed
            feed_response = await http_client.get(feed_url, follow_redirects=True)
            feed_response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(feed_response.text)
            channel = root.find("channel")
            
            if channel is None:
                raise HTTPException(status_code=500, detail="Invalid podcast feed")
            
            episodes = []
            podcast_image = podcast_info.get("artworkUrl600", "")
            
            for item in channel.findall("item")[:limit]:
                # Get episode ID from guid or generate from title
                guid = item.find("guid")
                episode_id = guid.text if guid is not None and guid.text else hashlib.md5(
                    (item.find("title").text or "").encode()
                ).hexdigest()
                
                # Get audio URL from enclosure
                enclosure = item.find("enclosure")
                audio_url = ""
                if enclosure is not None:
                    audio_url = enclosure.get("url", "")
                
                # Skip episodes without audio
                if not audio_url:
                    continue
                
                # Get duration
                duration = 0
                duration_elem = item.find("{http://www.itunes.com/dtds/podcast-1.0.dtd}duration")
                if duration_elem is not None and duration_elem.text:
                    try:
                        # Duration can be in seconds or HH:MM:SS format
                        dur_text = duration_elem.text
                        if ":" in dur_text:
                            parts = dur_text.split(":")
                            if len(parts) == 3:
                                duration = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                            elif len(parts) == 2:
                                duration = int(parts[0]) * 60 + int(parts[1])
                        else:
                            duration = int(dur_text)
                    except Exception:
                        pass
                
                # Get description
                description = ""
                desc_elem = item.find("description")
                if desc_elem is not None and desc_elem.text:
                    # Remove HTML tags
                    description = re.sub('<[^<]+?>', '', desc_elem.text)[:500]
                
                # Get published date
                pub_date = ""
                pub_elem = item.find("pubDate")
                if pub_elem is not None and pub_elem.text:
                    pub_date = pub_elem.text
                
                # Get episode image or use podcast image
                episode_image = podcast_image
                image_elem = item.find("{http://www.itunes.com/dtds/podcast-1.0.dtd}image")
                if image_elem is not None:
                    episode_image = image_elem.get("href", podcast_image)
                
                episode = PodcastEpisode(
                    id=episode_id,
                    title=item.find("title").text or "Untitled",
                    description=description,
                    audio_url=audio_url,
                    duration=duration,
                    published=pub_date,
                    image=episode_image
                )
                episodes.append(episode)
            
            return episodes
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch podcast episodes: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch podcast episodes")
        except ET.ParseError as e:
            logger.error(f"Failed to parse podcast feed: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse podcast feed")

# Shuffle similar stations endpoint
@api_router.get("/stations/shuffle-similar")
async def shuffle_similar_station(
    tag: str = Query(..., description="Primary tag/genre to find similar stations"),
    exclude_id: Optional[str] = Query(None, description="Station ID to exclude from results")
):
    """Get a random station similar to the current one based on tags"""
    params = {
        "tag": tag.lower(),
        "limit": 50,
        "order": "random",
        "hidebroken": "true"
    }
    
    try:
        stations = await fetch_radio_browser("stations/search", params)
        
        # Filter out the excluded station
        if exclude_id:
            stations = [s for s in stations if s.get('stationuuid') != exclude_id]
        
        if not stations:
            raise HTTPException(status_code=404, detail="No similar stations found")
        
        # Pick a random station
        station = random.choice(stations)
        station["source"] = "radio-browser"
        return station
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch shuffle station: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch similar station")

# Favorites endpoints (stored in MongoDB)
@api_router.post("/favorites", response_model=FavoriteStation)
async def add_favorite(favorite: FavoriteCreate):
    """Add a station to favorites"""
    existing = await db.favorites.find_one({"stationuuid": favorite.stationuuid}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Station already in favorites")
    
    favorite_obj = FavoriteStation(**favorite.model_dump())
    doc = favorite_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.favorites.insert_one(doc)
    return favorite_obj

@api_router.get("/favorites", response_model=List[FavoriteStation])
async def get_favorites():
    """Get all favorite stations"""
    favorites = await db.favorites.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for fav in favorites:
        if isinstance(fav.get('created_at'), str):
            fav['created_at'] = datetime.fromisoformat(fav['created_at'])
    return favorites

@api_router.delete("/favorites/{stationuuid}")
async def remove_favorite(stationuuid: str):
    """Remove a station from favorites"""
    result = await db.favorites.delete_one({"stationuuid": stationuuid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Favorite removed"}

@api_router.get("/favorites/check/{stationuuid}")
async def check_favorite(stationuuid: str):
    """Check if a station is in favorites"""
    exists = await db.favorites.find_one({"stationuuid": stationuuid}, {"_id": 0})
    return {"is_favorite": exists is not None}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
