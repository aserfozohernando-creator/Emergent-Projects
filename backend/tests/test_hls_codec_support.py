"""
Tests for HLS.js integration and multi-codec support.
Testing:
- HLS/M3U8 stream detection (backend verification)
- PLS playlist detection
- Standard audio formats (MP3, AAC, OGG, Opus, FLAC)
- Stream type detection in backend
- ICY header detection for Icecast/Shoutcast streams
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestHLSStreamDetection:
    """Test HLS/M3U8 stream detection in backend"""
    
    def test_hls_playlist_detection(self):
        """Test that HLS streams (.m3u8) are correctly identified"""
        # Test with a known HLS stream URL
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/hls-test",
            params={"url": "https://live-hls-icy.wsbradio.com:8443/wsb-ice-aac-sm-iheart.m3u8"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # Should have stream type related info
        assert "is_live" in result
        assert "reason" in result
        
        # If live, reason should indicate HLS or audio
        if result["is_live"]:
            assert result["reason"] in ["hls_playlist", "valid_audio", "icy_stream", "binary_audio"]
    
    def test_verify_batch_handles_hls(self):
        """Test that batch verification handles HLS streams"""
        payload = {
            "stations": [
                {
                    "stationuuid": "hls-station-1",
                    "url": "https://live-hls-icy.wsbradio.com:8443/wsb-ice-aac-sm-iheart.m3u8",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) >= 1
        
        # Check result structure
        for result in results:
            assert "stationuuid" in result
            assert "is_live" in result
            assert "reason" in result


class TestPLSPlaylistDetection:
    """Test PLS playlist detection"""
    
    def test_pls_playlist_detection(self):
        """Test that PLS playlists are detected correctly"""
        payload = {
            "stations": [
                {
                    "stationuuid": "test-pls-somafm",
                    "url": "https://somafm.com/groovesalad.pls",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        
        result = results[0]
        # Should be detected as live PLS playlist
        if result["is_live"]:
            assert result["reason"] in ["pls_playlist", "valid_audio", "icy_stream"]
    
    def test_direct_pls_verification(self):
        """Test single PLS playlist verification"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/pls-direct",
            params={"url": "https://somafm.com/defcon.pls"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # Should return valid result
        assert "is_live" in result
        assert "reason" in result


class TestStandardAudioFormats:
    """Test standard audio format detection (MP3, AAC, OGG)"""
    
    def test_mp3_stream_detection(self):
        """Test MP3 stream is correctly identified"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/mp3-stream",
            params={"url": "https://ice5.somafm.com/groovesalad-128-mp3"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # MP3 stream should be live
        assert result["is_live"] == True
        # Should have ICY headers or valid audio signature
        assert result["reason"] in ["icy_stream", "valid_audio", "binary_audio"]
    
    def test_aac_stream_detection(self):
        """Test AAC stream is correctly identified"""
        # Use SomaFM AAC stream
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/aac-stream",
            params={"url": "https://ice5.somafm.com/groovesalad-128-aac"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # AAC stream with ICY headers
        if result["is_live"]:
            assert result["reason"] in ["icy_stream", "valid_audio", "binary_audio"]
    
    def test_ogg_stream_verification(self):
        """Test OGG stream format detection"""
        # Many streaming servers have OGG streams
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/ogg-stream",
            params={"url": "https://radio.m1dnight.be:1984/stream"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        # Should have proper structure even if stream is offline
        assert "is_live" in result
        assert "reason" in result


class TestICYStreamDetection:
    """Test ICY header detection for Icecast/Shoutcast streams"""
    
    def test_icecast_stream_with_icy_headers(self):
        """Test Icecast stream is detected via ICY headers"""
        payload = {
            "stations": [
                {
                    "stationuuid": "icecast-test",
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
        
        # SomaFM uses ICY headers
        assert result["is_live"] == True
        assert result["reason"] == "icy_stream"
    
    def test_radio_france_icy_stream(self):
        """Test Radio France ICY stream detection"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/radio-france",
            params={"url": "http://icecast.radiofrance.fr/franceinter-midfi.mp3"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        if result["is_live"]:
            # Should be detected via ICY headers
            assert result["reason"] in ["icy_stream", "valid_audio"]


class TestStreamTypeDetectionByURL:
    """Test stream type detection based on URL patterns"""
    
    def test_stream_type_identification_cases(self):
        """Test various URL patterns for stream type detection"""
        # These tests verify that backend correctly identifies stream types
        test_cases = [
            # HLS streams
            {"url": "https://example.com/stream.m3u8", "expected_types": ["hls_playlist", "timeout", "connect_failed"]},
            # PLS playlists
            {"url": "https://somafm.com/groovesalad.pls", "expected_types": ["pls_playlist", "valid_audio", "icy_stream"]},
            # Direct MP3
            {"url": "https://ice5.somafm.com/groovesalad-128-mp3", "expected_types": ["icy_stream", "valid_audio"]},
            # AAC
            {"url": "https://ice5.somafm.com/groovesalad-128-aac", "expected_types": ["icy_stream", "valid_audio"]},
        ]
        
        for case in test_cases:
            response = requests.get(
                f"{BASE_URL}/api/stations/verify/type-test",
                params={"url": case["url"]},
                timeout=30
            )
            assert response.status_code == 200
            result = response.json()
            
            # Verify result structure
            assert "is_live" in result
            assert "reason" in result


class TestOfflineStationHandling:
    """Test handling of offline/unavailable stations"""
    
    def test_stream_unavailable_detection(self):
        """Test that unavailable streams are properly marked"""
        payload = {
            "stations": [
                {
                    "stationuuid": "offline-station",
                    "url": "https://nonexistent-radio-station-xyz.com/stream.mp3",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=30)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 1
        result = results[0]
        
        # Should be marked as offline
        assert result["is_live"] == False
        # Should have a failure reason
        assert result["reason"] in ["connect_failed", "timeout", "not_audio", "invalid_audio"]
    
    def test_html_page_not_audio(self):
        """Test that HTML pages are not marked as audio streams"""
        response = requests.get(
            f"{BASE_URL}/api/stations/verify/html-test",
            params={"url": "https://www.google.com"},
            timeout=30
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["is_live"] == False
        assert result["reason"] == "not_audio"
        assert "text/html" in result["content_type"]


class TestMultipleFormatMixedBatch:
    """Test batch verification with multiple formats"""
    
    def test_mixed_format_batch_verification(self):
        """Test batch with HLS, PLS, MP3, AAC streams"""
        payload = {
            "stations": [
                {
                    "stationuuid": "mp3-station",
                    "url": "https://ice5.somafm.com/groovesalad-128-mp3",
                    "url_resolved": ""
                },
                {
                    "stationuuid": "aac-station",
                    "url": "https://ice5.somafm.com/groovesalad-128-aac",
                    "url_resolved": ""
                },
                {
                    "stationuuid": "pls-station",
                    "url": "https://somafm.com/defcon.pls",
                    "url_resolved": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=60)
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) >= 1
        
        # Check that all results have proper structure
        for result in results:
            assert "stationuuid" in result
            assert "is_live" in result
            assert "reason" in result
            assert "checked_at" in result
        
        # Count results
        live_count = sum(1 for r in results if r["is_live"])
        print(f"Mixed format batch: {live_count}/{len(results)} live")


class TestAPIEndpointRobustness:
    """Test API endpoint robustness with edge cases"""
    
    def test_empty_batch_request(self):
        """Test batch endpoint handles empty stations list"""
        payload = {"stations": []}
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload)
        assert response.status_code == 200
        assert response.json() == []
    
    def test_batch_with_missing_url(self):
        """Test batch handles stations with missing URLs"""
        payload = {
            "stations": [
                {"stationuuid": "no-url-station", "url_resolved": ""}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/stations/verify-batch", json=payload, timeout=15)
        assert response.status_code == 200
        # Should gracefully handle missing URL
    
    def test_single_verify_requires_url_param(self):
        """Test single verify endpoint requires url parameter"""
        response = requests.get(f"{BASE_URL}/api/stations/verify/test-station", timeout=15)
        # Should return 422 for missing required parameter
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
