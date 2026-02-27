"""
Tests for robust stream verification feature.
Testing:
- Audio signature validation (MP3, OGG, AAC, FLAC)
- ICY header detection for streaming servers
- Detailed failure reasons (timeout, connect_failed, invalid_audio, etc.)
- Batch verification endpoint
- Single station verification endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestStreamVerificationBasics:
    """Test basic stream verification functionality"""
    
    def test_verify_batch_endpoint_exists(self):
        """Test verify-batch endpoint is accessible"""
        payload = {"stations": []}
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_verify_single_station_endpoint_exists(self):
        """Test single station verify endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/test-station",
            params={"url": "https://example.com/stream"}
        )
        assert response.status_code == 200
        result = response.json()
        assert "is_live" in result
        assert "reason" in result


class TestAudioSignatureDetection:
    """Test audio signature validation for different formats"""
    
    def test_icy_stream_detection(self):
        """Test ICY headers detection for streaming servers"""
        # SomaFM is known to use ICY headers
        payload = {
            "stations": [
                {
                    "stationuuid": "test-icy-stream",
                    "url": "https://ice5.somafm.com/groovesalad-128-mp3",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        result = results[0]
        
        # Should detect ICY stream as live
        assert result["is_live"] == True
        assert result["reason"] == "icy_stream"
        assert result["content_type"] is not None
    
    def test_mp3_stream_verification(self):
        """Test MP3 stream with ICY headers is verified correctly"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/mp3-test",
            params={"url": "http://icecast.radiofrance.fr/franceinter-midfi.mp3"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # Should be live with ICY or valid_audio reason
        if result["is_live"]:
            assert result["reason"] in ["icy_stream", "valid_audio", "binary_audio"]
    
    def test_playlist_handling(self):
        """Test that playlist files (PLS) are handled"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-playlist",
                    "url": "https://somafm.com/defcon.pls",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        # PLS files should be detected as audio/x-scpls content type
        assert results[0]["content_type"] == "audio/x-scpls"


class TestFailureReasonReporting:
    """Test that failure reasons are properly reported"""
    
    def test_connect_failed_reason(self):
        """Test that connection failures report correct reason"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-connect-failed",
                    "url": "https://nonexistent-stream-12345.example.com/stream",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        result = results[0]
        
        # Should not be live
        assert result["is_live"] == False
        # Reason should indicate connection failure
        assert result["reason"] in ["connect_failed", "timeout", "error:Name or service not known"]
    
    def test_not_audio_reason(self):
        """Test that non-audio content reports correct reason"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-html-page",
                    "url": "https://www.google.com",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        result = results[0]
        
        # HTML page should not be live
        assert result["is_live"] == False
        assert result["reason"] == "not_audio"
        assert "text/html" in result["content_type"]
    
    def test_http_error_status_reason(self):
        """Test that HTTP errors report correct status code"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-404",
                    "url": "https://httpstat.us/404",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        result = results[0]
        
        # Should not be live
        assert result["is_live"] == False
        assert "http_" in result["reason"] or "error" in result["reason"].lower()


class TestBatchVerificationDetails:
    """Test batch verification endpoint details"""
    
    def test_batch_returns_reason_and_content_type(self):
        """Test that batch verification returns reason and content_type for each station"""
        payload = {
            "stations": [
                {
                    "stationuuid": "station-1",
                    "url": "https://ice5.somafm.com/groovesalad-128-mp3",
                    "url_resolved": ""
                },
                {
                    "stationuuid": "station-2",
                    "url": "https://www.google.com",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 2
        
        for result in results:
            # Every result must have these fields
            assert "stationuuid" in result
            assert "is_live" in result
            assert "reason" in result
            assert "content_type" in result or result["reason"] in ["connect_failed", "timeout"]
            assert "checked_at" in result
    
    def test_batch_verification_mixed_results(self):
        """Test batch with mixed live and offline stations"""
        # Get some real stations first
        stations_response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 5}, timeout=15)
        assert stations_response.status_code == 200
        stations = stations_response.json()
        
        if not stations:
            pytest.skip("No stations available for testing")
        
        # Add mix of real stations and invalid URLs
        payload = {
            "stations": [
                {
                    "stationuuid": s["stationuuid"],
                    "url": s["url"],
                    "url_resolved": s.get("url_resolved", "")
                }
                for s in stations[:3]
            ] + [
                {
                    "stationuuid": "fake-station",
                    "url": "https://fake-stream-url-12345.example.com/stream",
                    "url_resolved": ""
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=60)
        assert response.status_code == 200
        
        results = response.json()
        
        # Should have at least some results (fake station may fail)
        assert len(results) >= 1
        
        # Check each result has proper structure
        for result in results:
            assert "is_live" in result
            assert isinstance(result["is_live"], bool)
            assert "reason" in result
            assert result["reason"] is not None


class TestSingleStationVerification:
    """Test single station verify endpoint"""
    
    def test_single_verify_returns_detailed_result(self):
        """Test single station verification returns detailed result"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/test-single",
            params={"url": "https://ice5.somafm.com/groovesalad-128-mp3"},
            timeout=30
        )
        assert response.status_code == 200
        
        result = response.json()
        
        # Must have all required fields
        assert "stationuuid" in result
        assert result["stationuuid"] == "test-single"
        assert "is_live" in result
        assert "reason" in result
        assert "content_type" in result
        assert "checked_at" in result
    
    def test_single_verify_with_invalid_url(self):
        """Test single station verification with invalid URL"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/test-invalid",
            params={"url": "https://invalid-stream-xyz.example.com/stream"},
            timeout=30
        )
        assert response.status_code == 200
        
        result = response.json()
        assert result["is_live"] == False
        assert result["reason"] in ["connect_failed", "timeout"]


class TestVerificationWithRealStations:
    """Test verification with real stations from the API"""
    
    def test_verify_top_stations(self):
        """Test verifying top stations - some should be live"""
        # Get top stations
        stations_response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 10})
        assert stations_response.status_code == 200
        stations = stations_response.json()
        
        if not stations:
            pytest.skip("No stations available")
        
        # Verify batch
        payload = {
            "stations": [
                {
                    "stationuuid": s["stationuuid"],
                    "url": s["url"],
                    "url_resolved": s.get("url_resolved", "")
                }
                for s in stations
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=120)
        assert response.status_code == 200
        
        results = response.json()
        
        # Count live vs offline
        live_count = sum(1 for r in results if r.get("is_live"))
        offline_count = sum(1 for r in results if not r.get("is_live"))
        
        print(f"Results: {live_count} live, {offline_count} offline out of {len(results)}")
        
        # At least some stations should be verified (live or offline)
        assert len(results) > 0
        
        # Report reason distribution
        reasons = {}
        for r in results:
            reason = r.get("reason", "unknown")
            reasons[reason] = reasons.get(reason, 0) + 1
        
        print(f"Reason distribution: {reasons}")
    
    def test_green_stations_should_play(self):
        """Test that stations marked as live (green) can actually be played"""
        # Get top stations and verify
        stations_response = requests.get(f"{BASE_URL}/api/stations/top", params={"limit": 5})
        assert stations_response.status_code == 200
        stations = stations_response.json()
        
        if not stations:
            pytest.skip("No stations available")
        
        payload = {
            "stations": [
                {
                    "stationuuid": s["stationuuid"],
                    "url": s["url"],
                    "url_resolved": s.get("url_resolved", "")
                }
                for s in stations
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=60)
        assert response.status_code == 200
        
        results = response.json()
        
        # Find live stations
        live_stations = [r for r in results if r.get("is_live")]
        
        # For each live station, verify the reason is valid for playback
        valid_live_reasons = ["icy_stream", "valid_audio", "binary_audio", "octet_stream"]
        for live in live_stations:
            assert live["reason"] in valid_live_reasons, f"Station {live['stationuuid']} marked live with unexpected reason: {live['reason']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
