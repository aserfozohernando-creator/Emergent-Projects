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

# Radio Browser API base URL
RADIO_BROWSER_API = "https://de1.api.radio-browser.info/json"

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

# Popular genres
GENRES = [
    "pop", "rock", "jazz", "classical", "electronic", "hip hop", "country", 
    "r&b", "reggae", "latin", "folk", "blues", "metal", "indie", "soul",
    "dance", "ambient", "world", "news", "talk", "sports"
]

async def fetch_radio_browser(endpoint: str, params: dict = None) -> list:
    """Fetch data from Radio Browser API"""
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            response = await http_client.get(
                f"{RADIO_BROWSER_API}/{endpoint}",
                params=params,
                headers={"User-Agent": "GlobalRadioStation/1.0"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Radio Browser API error: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch radio stations")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Global Radio Station API"}

@api_router.get("/stations/search", response_model=List[Station])
async def search_stations(
    name: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    countrycode: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """Search for radio stations"""
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
    
    stations = await fetch_radio_browser("stations/search", params)
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
    
    # Fetch stations from multiple countries
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        for code in country_codes[:10]:  # Limit to 10 countries for performance
            try:
                response = await http_client.get(
                    f"{RADIO_BROWSER_API}/stations/search",
                    params={
                        "countrycode": code,
                        "limit": 10,
                        "order": "clickcount",
                        "reverse": "true",
                        "hidebroken": "true"
                    },
                    headers={"User-Agent": "GlobalRadioStation/1.0"}
                )
                if response.status_code == 200:
                    all_stations.extend(response.json())
            except Exception as e:
                logger.warning(f"Failed to fetch stations for {code}: {e}")
    
    # Sort by clickcount and limit
    all_stations.sort(key=lambda x: x.get('clickcount', 0), reverse=True)
    return all_stations[:limit]

@api_router.get("/stations/by-genre/{genre}", response_model=List[Station])
async def get_stations_by_genre(
    genre: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """Get stations by genre/tag"""
    params = {
        "tag": genre.lower(),
        "limit": limit,
        "offset": offset,
        "order": "clickcount",
        "reverse": "true",
        "hidebroken": "true"
    }
    stations = await fetch_radio_browser("stations/search", params)
    return stations

@api_router.get("/countries")
async def get_countries():
    """Get list of countries with station counts"""
    countries = await fetch_radio_browser("countries", {"order": "stationcount", "reverse": "true"})
    return countries[:100]  # Top 100 countries

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

# Favorites endpoints (stored in MongoDB)
@api_router.post("/favorites", response_model=FavoriteStation)
async def add_favorite(favorite: FavoriteCreate):
    """Add a station to favorites"""
    # Check if already exists
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
