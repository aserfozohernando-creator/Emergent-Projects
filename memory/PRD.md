# Global Radio Station - Product Requirements Document

## Original Problem Statement
Build a "Global Radio Station" application to listen to music from all over the world.

## Core Features (Implemented)

### Radio Station Features
- **Station Browsing**: Browse by world map, region (Europe, Americas, Asia, Russia, Africa, Oceania), and specific countries
- **Search & Filter**: Search stations by name, filter by genre/tags
- **Audio Player**: Persistent bottom audio player with play/pause, volume control
- **Station Health**: Visual indicators (green/red dots) showing stream reliability
- **Favorites System**: Save favorite stations (MongoDB-backed persistence)
- **Recently Played**: Track listening history (localStorage)
- **Similar Stations**: "Stations Like This" recommendations based on genre/tags
- **Shuffle Similar**: Random station playback from similar stations

### Podcast Features
- **Podcast Discovery**: Browse and search podcasts via iTunes API
- **Genre Filtering**: Filter podcasts by category
- **Episode Listing**: Expandable episode lists for each podcast
- **In-App Playback**: Full podcast player modal with:
  - Play/pause controls
  - Progress bar with seek
  - Skip forward/backward (30s/15s)
  - Volume control
  - Episode metadata display

### Additional Features
- **Sleep Timer**: Auto-stop after set duration (5/10/15/30/60 min)
- **Wake-Up Alarm**: Schedule station playback
- **Keyboard Shortcuts**: Space (play/pause), arrows (volume), M (mute), Esc (stop)
- **Theme Toggle**: Dark/Light mode
- **PWA Support**: Background audio playback
- **Notifications**: "Now Playing" toast notifications

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (for favorites persistence)
- **External APIs**: 
  - Radio Browser API (community radio database)
  - TuneIn API (additional radio stations)
  - iTunes Podcast API (podcast search and episodes)

## API Endpoints

### Stations
- `GET /api/stations/top` - Top stations by popularity
- `GET /api/stations/search` - Search with filters
- `GET /api/stations/by-country/{code}` - By country code
- `GET /api/stations/by-region/{region}` - By region
- `GET /api/stations/by-genre/{genre}` - By genre
- `GET /api/stations/shuffle-similar` - Random similar station

### Favorites
- `GET /api/favorites` - List all favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/{stationuuid}` - Remove favorite
- `GET /api/favorites/check/{stationuuid}` - Check if favorited

### Podcasts
- `GET /api/podcasts/search` - Search podcasts
- `GET /api/podcasts/top` - Top podcasts by genre
- `GET /api/podcasts/{id}/episodes` - Get episode list with audio URLs
- `GET /api/podcasts/genres` - Available genres

## Completed Work (Feb 27, 2026)

### Session Tasks Completed
1. ✅ **Fixed Favorites Bug**: Verified favorites work on playing stations and green-health stations
2. ✅ **Podcast Episode Playback**: Full in-app player modal with controls
3. ✅ **Shuffle Similar Button**: Random station from recommendations

### Testing Results
- Backend: 100% (20/20 tests passed)
- Frontend: 100% (all features verified)
- Test file: `/app/backend/tests/test_global_radio.py`

## Remaining/Future Tasks

### P1 (High Priority)
- None currently

### P2 (Medium Priority)
- AI-powered station recommendations
- User accounts for cross-device favorites sync

### P3 (Low Priority)
- Social sharing improvements
- Station comments/ratings
- Playlist creation
