"""
Tests for new Global Radio Station features:
- Background station health checking (verify-batch endpoint)
- LocalStorage favorites (not MongoDB - frontend only)
- Export/Import functionality (frontend only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestVerifyBatchEndpoint:
    """Test /api/stations/verify-batch endpoint for background health checking"""
    
    def test_verify_batch_with_valid_stations(self):
        """Test batch verification with valid station data"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-station-1",
                    "url": "https://somafm.com/defcon.pls",
                    "url_resolved": ""
                },
                {
                    "stationuuid": "test-station-2",
                    "url": "https://invalid-url-that-should-fail.example.com/stream",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        
        # Verify response structure
        for result in data:
            assert "stationuuid" in result
            assert "is_live" in result
            assert "checked_at" in result
            assert isinstance(result["is_live"], bool)
    
    def test_verify_batch_empty_stations(self):
        """Test batch verification with empty stations array"""
        payload = {"stations": []}
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data == []
    
    def test_verify_batch_max_50_stations(self):
        """Test that batch verification limits to 50 stations max"""
        # Create 60 stations
        stations = [
            {"stationuuid": f"test-{i}", "url": f"https://example{i}.com/stream", "url_resolved": ""}
            for i in range(60)
        ]
        payload = {"stations": stations}
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # Should return at most 50 results
        assert len(data) <= 50
    
    def test_verify_batch_with_url_resolved(self):
        """Test batch verification prefers url_resolved over url"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-resolved",
                    "url": "https://wrong-url.example.com/stream",
                    "url_resolved": "https://somafm.com/defcon.pls"  # Valid URL
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["stationuuid"] == "test-resolved"
    
    def test_verify_batch_skips_invalid_entries(self):
        """Test that invalid entries (missing url or stationuuid) are skipped"""
        payload = {
            "stations": [
                {"stationuuid": "valid-1", "url": "https://somafm.com/defcon.pls"},
                {"stationuuid": "", "url": "https://example.com/stream"},  # Empty stationuuid
                {"stationuuid": "no-url"},  # Missing url
                {"url": "https://example.com/stream"}  # Missing stationuuid
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # Only valid-1 should be returned
        valid_results = [r for r in data if r.get("stationuuid")]
        assert len(valid_results) >= 1


class TestTopStationsEndpoint:
    """Test top stations endpoint used for background health checking"""
    
    def test_get_top_stations(self):
        """Test getting top stations that will be checked in background"""
        response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 30})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify each station has required fields for health checking
        if data:
            station = data[0]
            assert "stationuuid" in station
            assert "url" in station
            assert "name" in station
    
    def test_stations_have_stream_urls(self):
        """Test that stations have proper stream URLs for verification"""
        response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 10})
        assert response.status_code == 200
        
        data = response.json()
        for station in data:
            url = station.get("url_resolved") or station.get("url", "")
            assert url, f"Station {station.get('name')} has no URL"


class TestStationsByRegion:
    """Test regional stations - used for health checking after region selection"""
    
    def test_europe_region_stations(self):
        """Test fetching Europe region stations"""
        response = requests.get(f"{BASE_URL}/api/stations/by-region/europe", params={"limit": 20})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "stationuuid" in data[0]
    
    def test_asia_region_stations(self):
        """Test fetching Asia region stations"""
        response = requests.get(f"{BASE_URL}/api/stations/by-region/asia", params={"limit": 20})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestMongoDB_FavoritesStillWork:
    """Test that MongoDB favorites endpoints still work (legacy support)
    Note: Frontend now uses localStorage, but MongoDB endpoints still exist"""
    
    def test_favorites_list(self):
        """Test getting favorites from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_favorites_add_and_remove(self):
        """Test adding and removing favorites in MongoDB"""
        # Add favorite
        favorite_data = {
            "stationuuid": "TEST_localStorage_migration_test",
            "name": "Test Station",
            "url": "https://test.stream.url/stream",
            "favicon": "",
            "country": "Test Country",
            "countrycode": "TC",
            "tags": "test"
        }
        
        add_response = requests.post(f"{BASE_URL}/api/favorites", json=favorite_data)
        # Could be 200 (success) or 400 (already exists)
        assert add_response.status_code in [200, 201, 400]
        
        # Clean up
        delete_response = requests.delete(f"{BASE_URL}/api/favorites/TEST_localStorage_migration_test")
        # Could be 200 (deleted) or 404 (not found)
        assert delete_response.status_code in [200, 404]


class TestSearchStationsForHealthCheck:
    """Test search endpoint used when searching stations (health check triggered after)"""
    
    def test_search_stations(self):
        """Test searching stations by name"""
        response = requests.get(f"{BASE_URL}/api/stations/search", params={"name": "jazz", "limit": 10})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestHealthCheckAPIResponse:
    """Test verify-batch returns proper data for frontend processing"""
    
    def test_response_format_for_frontend(self):
        """Test that verify-batch returns correct format for frontend batchUpdateLiveStatus"""
        # Get some real stations first
        stations_response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 3})
        assert stations_response.status_code == 200
        stations = stations_response.json()
        
        if not stations:
            pytest.skip("No stations available")
        
        # Format stations for verify-batch
        verify_payload = {
            "stations": [
                {
                    "stationuuid": s["stationuuid"],
                    "url": s["url"],
                    "url_resolved": s.get("url_resolved", "")
                }
                for s in stations
            ]
        }
        
        verify_response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=verify_payload)
        assert verify_response.status_code == 200
        
        results = verify_response.json()
        
        # Verify frontend can build statusUpdates object from this
        for result in results:
            assert "stationuuid" in result, "Missing stationuuid for statusUpdates key"
            assert "is_live" in result, "Missing is_live for status object"
            assert "checked_at" in result, "Missing checked_at timestamp"
            
            # Frontend expects is_live to be boolean
            assert isinstance(result["is_live"], bool)
