from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

async def fetch_tunein_stations(query: str = None, genre: str = None) -> list:
    """Fetch stations from TuneIn API"""
    stations = []
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
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
            
            for outline in root.iter('outline'):
                if outline.get('type') == 'audio' and outline.get('item') == 'station':
                    # Skip unavailable stations
                    if outline.get('key') == 'unavailable':
                        continue
                    
                    stream_url = outline.get('URL', '')
                    if not stream_url:
                        continue
                    
                    # Generate a unique ID from the URL
                    station_id = hashlib.md5(stream_url.encode()).hexdigest()
                    
                    station = {
                        "stationuuid": f"tunein-{station_id}",
                        "name": outline.get('text', 'Unknown Station'),
                        "url": stream_url,
                        "url_resolved": stream_url,
                        "homepage": outline.get('guide_id', ''),
                        "favicon": outline.get('image', ''),
                        "country": outline.get('subtext', '').split(',')[-1].strip() if outline.get('subtext') else 'Unknown',
                        "countrycode": "",
                        "state": "",
                        "language": "",
                        "languagecodes": "",
                        "votes": 0,
                        "codec": outline.get('formats', ''),
                        "bitrate": int(outline.get('bitrate', 0)) if outline.get('bitrate', '').isdigit() else 0,
                        "tags": outline.get('genre_id', ''),
                        "clickcount": int(outline.get('playing_image', '0').replace(',', '')) if outline.get('playing_image', '').replace(',', '').isdigit() else 0,
                        "source": "tunein"
                    }
                    stations.append(station)
            
            return stations
            
        except Exception as e:
            logger.error(f"TuneIn API error: {e}")
            return []

async def verify_stream_url(url: str, timeout: float = 5.0) -> bool:
    """Quick check if a stream URL is accessible"""
    try:
        async with httpx.AsyncClient(timeout=timeout) as http_client:
            response = await http_client.head(url, follow_redirects=True)
            return response.status_code < 400
    except:
        return False

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
