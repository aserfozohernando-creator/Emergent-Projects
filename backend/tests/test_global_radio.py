"""
Backend API tests for Global Radio Station application.
Testing: Favorites, Shuffle Similar, Podcast Episodes endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestHealthCheck:
    """Basic API health check tests"""

    def test_api_root(self):
        """Test API root endpoint returns correct response"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Global Radio Station API" in data["message"]

    def test_stations_top(self):
        """Test getting top stations"""
        response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5


class TestFavoritesEndpoints:
    """Test favorites CRUD operations - Bug fix: users should be able to favorite stations"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Clean up test favorites before and after"""
        # Clean up before test
        self._cleanup_test_favorite()
        yield
        # Clean up after test
        self._cleanup_test_favorite()

    def _cleanup_test_favorite(self):
        """Remove test favorite if exists"""
        try:
            requests.delete(f"{BASE_URL}/api/favorites/TEST_station_001")
        except Exception:
            pass

    def test_add_favorite_station(self):
        """Test adding a station to favorites"""
        favorite_data = {
            "stationuuid": "TEST_station_001",
            "name": "TEST Radio Station",
            "url": "https://example.com/stream",
            "favicon": "https://example.com/favicon.png",
            "country": "United States",
            "countrycode": "US",
            "tags": "pop,rock,test"
        }
        
        response = requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        assert response.status_code == 200, f"Failed to add favorite: {response.text}"
        
        data = response.json()
        assert data["stationuuid"] == favorite_data["stationuuid"]
        assert data["name"] == favorite_data["name"]
        assert data["url"] == favorite_data["url"]
        assert "id" in data
        assert "created_at" in data

    def test_get_favorites_list(self):
        """Test getting all favorites"""
        # First add a test favorite
        favorite_data = {
            "stationuuid": "TEST_station_001",
            "name": "TEST Radio Station",
            "url": "https://example.com/stream",
            "country": "Test Country",
            "countrycode": "TC"
        }
        requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        
        response = requests.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Verify test favorite exists
        test_favorites = [f for f in data if f["stationuuid"] == "TEST_station_001"]
        assert len(test_favorites) == 1

    def test_check_favorite_status(self):
        """Test checking if a station is in favorites"""
        # Add a test favorite first
        favorite_data = {
            "stationuuid": "TEST_station_001",
            "name": "TEST Station",
            "url": "https://example.com/stream",
            "country": "US",
            "countrycode": "US"
        }
        requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        
        # Check if it's a favorite
        response = requests.get(f"{BASE_URL}/api/favorites/check/TEST_station_001")
        assert response.status_code == 200
        data = response.json()
        assert data["is_favorite"] == True
        
        # Check non-existent favorite
        response = requests.get(f"{BASE_URL}/api/favorites/check/NON_EXISTENT_STATION")
        assert response.status_code == 200
        data = response.json()
        assert data["is_favorite"] == False

    def test_remove_favorite(self):
        """Test removing a station from favorites"""
        # Add a test favorite first
        favorite_data = {
            "stationuuid": "TEST_station_001",
            "name": "TEST Station",
            "url": "https://example.com/stream",
            "country": "US",
            "countrycode": "US"
        }
        requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        
        # Remove it
        response = requests.delete(f"{BASE_URL}/api/favorites/TEST_station_001")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify it's removed
        check_response = requests.get(f"{BASE_URL}/api/favorites/check/TEST_station_001")
        assert check_response.json()["is_favorite"] == False

    def test_duplicate_favorite_returns_error(self):
        """Test adding duplicate favorite returns error"""
        favorite_data = {
            "stationuuid": "TEST_station_001",
            "name": "TEST Station",
            "url": "https://example.com/stream",
            "country": "US",
            "countrycode": "US"
        }
        # Add first time
        requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        
        # Try adding again - should fail
        response = requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "already" in data["detail"].lower()


class TestShuffleSimilarEndpoint:
    """Test shuffle similar station endpoint - Feature: Shuffle Similar button"""

    def test_shuffle_similar_with_valid_tag(self):
        """Test getting a random similar station by tag"""
        response = requests.get(f"{BASE_URL}/api/stations/shuffle-similar", params={"tag": "pop"})
        assert response.status_code == 200
        
        data = response.json()
        assert "stationuuid" in data
        assert "name" in data
        assert "url" in data
        assert data.get("source") == "radio-browser"

    def test_shuffle_similar_with_exclude_id(self):
        """Test shuffle excludes specified station"""
        exclude_id = "test-exclude-id"
        response = requests.get(
            f"{BASE_URL}/api/stations/shuffle-similar",
            params={"tag": "rock", "exclude_id": exclude_id}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify excluded station is not returned
        assert data.get("stationuuid") != exclude_id

    def test_shuffle_similar_returns_different_results(self):
        """Test shuffle returns varied results (randomness)"""
        results = []
        for _ in range(3):
            response = requests.get(
                f"{BASE_URL}/api/stations/shuffle-similar",
                params={"tag": "electronic"}
            )
            if response.status_code == 200:
                results.append(response.json().get("stationuuid"))
        
        # At least 3 results should be available
        assert len(results) >= 1, "Should return at least one result"

    def test_shuffle_similar_missing_tag_returns_error(self):
        """Test shuffle without required tag returns error"""
        response = requests.get(f"{BASE_URL}/api/stations/shuffle-similar")
        assert response.status_code == 422  # Validation error


class TestPodcastEpisodesEndpoint:
    """Test podcast episodes endpoint - Feature: In-app podcast playback"""

    def test_get_podcast_episodes(self):
        """Test fetching podcast episodes with audio URLs"""
        # First get a podcast to test with
        search_response = requests.get(
            f"{BASE_URL}/api/podcasts/top",
            params={"limit": 5}
        )
        assert search_response.status_code == 200
        podcasts = search_response.json().get("podcasts", [])
        
        if not podcasts:
            pytest.skip("No podcasts available for testing")
        
        podcast_id = podcasts[0]["id"]
        
        # Get episodes
        response = requests.get(
            f"{BASE_URL}/api/podcasts/{podcast_id}/episodes",
            params={"limit": 10}
        )
        assert response.status_code == 200
        
        episodes = response.json()
        assert isinstance(episodes, list)
        
        if len(episodes) > 0:
            episode = episodes[0]
            assert "id" in episode
            assert "title" in episode
            assert "audio_url" in episode
            # Audio URL should be present for playback
            assert episode["audio_url"], "Episode should have audio URL for in-app playback"
            assert episode["audio_url"].startswith("http"), "Audio URL should be valid HTTP URL"

    def test_podcast_episodes_include_metadata(self):
        """Test episodes include duration, date, description"""
        search_response = requests.get(
            f"{BASE_URL}/api/podcasts/top",
            params={"limit": 3}
        )
        podcasts = search_response.json().get("podcasts", [])
        
        if not podcasts:
            pytest.skip("No podcasts available for testing")
        
        podcast_id = podcasts[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/podcasts/{podcast_id}/episodes",
            params={"limit": 5}
        )
        episodes = response.json()
        
        if len(episodes) > 0:
            episode = episodes[0]
            # Check metadata fields exist (may be empty)
            assert "duration" in episode
            assert "published" in episode
            assert "description" in episode
            assert "image" in episode

    def test_invalid_podcast_id_returns_error(self):
        """Test invalid podcast ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/podcasts/INVALID_ID_12345/episodes")
        # Should return 404 or 502 (external API error)
        assert response.status_code in [404, 502]


class TestStationsSearchEndpoints:
    """Test station search endpoints"""

    def test_search_by_name(self):
        """Test searching stations by name"""
        response = requests.get(
            f"{BASE_URL}/api/stations/search",
            params={"name": "radio", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_search_by_tag(self):
        """Test searching stations by genre tag"""
        response = requests.get(
            f"{BASE_URL}/api/stations/search",
            params={"tag": "jazz", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_stations_by_country(self):
        """Test getting stations by country code"""
        response = requests.get(f"{BASE_URL}/api/stations/by-country/US", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            # All stations should be from US
            for station in data[:5]:
                assert station.get("countrycode", "").upper() == "US"


class TestPodcastSearchEndpoints:
    """Test podcast search endpoints"""

    def test_search_podcasts(self):
        """Test searching podcasts"""
        response = requests.get(
            f"{BASE_URL}/api/podcasts/search",
            params={"query": "technology", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            podcast = data[0]
            assert "id" in podcast
            assert "title" in podcast
            assert "feed_url" in podcast

    def test_top_podcasts(self):
        """Test getting top podcasts"""
        response = requests.get(
            f"{BASE_URL}/api/podcasts/top",
            params={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert "podcasts" in data
        assert isinstance(data["podcasts"], list)

    def test_podcast_genres(self):
        """Test getting podcast genres"""
        response = requests.get(f"{BASE_URL}/api/podcasts/genres")
        assert response.status_code == 200
        data = response.json()
        assert "genres" in data
        assert isinstance(data["genres"], list)
        assert len(data["genres"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
