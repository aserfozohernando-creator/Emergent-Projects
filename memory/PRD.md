# Global Radio Station - Product Requirements Document

## Original Problem Statement
Build a "Global Radio Station" application to listen to music from all over the world.

## Core Features (Implemented)

### Radio Station Features
- **Station Browsing**: Browse by world map, region (Europe, Americas, Asia, Russia, Africa, Oceania), and specific countries
- **Search & Filter**: Search stations by name, filter by genre/tags
- **Audio Player**: Persistent bottom audio player with play/pause, volume control
- **Station Health Checking**: Background verification of all stations with live/offline status
  - Green indicator = Live (stream available)
  - Red indicator = Offline (not responding)
  - Stations sorted: live first, offline at bottom
  - Re-verify button to recheck offline stations
- **Favorites System**: Save favorite stations (localStorage-based, browser persistence)
- **Recently Played**: Track listening history (localStorage)
- **Similar Stations**: "Stations Like This" recommendations based on genre/tags
- **Shuffle Similar**: Random station playback from similar stations

### Podcast Features
- **Podcast Discovery**: Browse and search podcasts via iTunes API
- **Genre Filtering**: Filter podcasts by category
- **Episode Listing**: Expandable episode lists for each podcast
- **In-App Playback**: Full podcast player modal with controls
- **Podcast Favorites**: Save favorite podcasts (localStorage-based)

### Data Management Features
- **LocalStorage Database**: All favorites stored in browser
- **Export Functionality**: Download JSON backup of favorites and podcasts
- **Import Functionality**: Upload and merge backup from another device
- **Clear All**: Reset all local data with confirmation

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
- **Database**: LocalStorage (for favorites persistence)
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
- `POST /api/stations/verify-batch` - Verify multiple streams (health check)

### Podcasts
- `GET /api/podcasts/search` - Search podcasts
- `GET /api/podcasts/top` - Top podcasts by genre
- `GET /api/podcasts/{id}/episodes` - Get episode list with audio URLs
- `GET /api/podcasts/genres` - Available genres

## Completed Work

### Session 1 (Feb 27, 2026)
1. ✅ Fixed Favorites Bug (was already working)
2. ✅ Podcast Episode Playback with in-app player
3. ✅ Shuffle Similar button

### Session 2 (Feb 27, 2026)
1. ✅ Background Station Health Checking
   - Automatic verification after stations load
   - Live/offline counts in header
   - Stations sorted by health status
2. ✅ Re-verify Button for offline stations
3. ✅ LocalStorage Database for favorites
   - Station favorites in browser storage
   - Podcast favorites in browser storage
4. ✅ Export/Import Functionality
   - JSON backup download
   - Import and merge from backup

### Session 3 (Feb 27, 2026)
1. ✅ Auto-Offline on Playback Failure
   - When a station fails to play, automatically marked as offline
   - Station moves to bottom of list (with other offline stations)
   - Red indicator shown on station card
2. ✅ Navbar Export/Import Buttons
   - Download icon (Export) visible in navbar on all pages
   - Upload icon (Import) visible in navbar on all pages
   - Easy access to backup/restore favorites from any page

### Testing Results
- Backend: 100% (33/33 tests passed)
- Frontend: 100% (all features verified)
- Test files: `/app/test_reports/iteration_1.json`, `/app/test_reports/iteration_2.json`, `/app/test_reports/iteration_3.json`

## File Structure
```
/app
├── backend/
│   ├── server.py           # FastAPI: All API endpoints
│   └── tests/              # Backend tests
├── frontend/
│   └── src/
│       ├── components/     # UI components
│       ├── context/        
│       │   ├── PlayerContext.js    # Audio playback state
│       │   ├── ThemeContext.js     # Dark/Light theme
│       │   └── LocalDataContext.js # LocalStorage management
│       └── pages/          # Page components
```

## Remaining/Future Tasks

### P2 (Medium Priority)
- AI-powered station recommendations
- User accounts for cross-device sync (optional cloud backup)

### P3 (Low Priority)
- Social sharing improvements
- Station comments/ratings
- Playlist creation
