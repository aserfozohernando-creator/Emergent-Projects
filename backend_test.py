import requests
import sys
import json
from datetime import datetime

class GlobalRadioAPITester:
    def __init__(self, base_url="https://global-tunes-58.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    else:
                        print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Not a dict'}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_top_stations(self):
        """Test getting top stations"""
        return self.run_test("Top Stations", "GET", "stations/top", 200, params={"limit": 10})

    def test_search_stations(self):
        """Test station search"""
        return self.run_test("Search Stations", "GET", "stations/search", 200, params={"name": "BBC", "limit": 5})

    def test_stations_by_region(self):
        """Test stations by region"""
        success, _ = self.run_test("Stations by Region (Europe)", "GET", "stations/by-region/europe", 200, params={"limit": 10})
        if success:
            self.run_test("Stations by Region (Americas)", "GET", "stations/by-region/americas", 200, params={"limit": 10})
            self.run_test("Stations by Region (Asia)", "GET", "stations/by-region/asia", 200, params={"limit": 10})
            self.run_test("Stations by Region (Russia)", "GET", "stations/by-region/russia", 200, params={"limit": 10})
        return success

    def test_stations_by_genre(self):
        """Test stations by genre"""
        return self.run_test("Stations by Genre (Pop)", "GET", "stations/by-genre/pop", 200, params={"limit": 10})

    def test_countries_endpoint(self):
        """Test countries endpoint"""
        return self.run_test("Countries", "GET", "countries", 200)

    def test_regions_endpoint(self):
        """Test regions endpoint"""
        return self.run_test("Regions", "GET", "regions", 200)

    def test_genres_endpoint(self):
        """Test genres endpoint"""
        return self.run_test("Genres", "GET", "genres", 200)

    def test_favorites_flow(self):
        """Test complete favorites flow"""
        # First get empty favorites
        success, favorites = self.run_test("Get Empty Favorites", "GET", "favorites", 200)
        if not success:
            return False

        # Get a station to add to favorites
        success, stations = self.run_test("Get Station for Favorites", "GET", "stations/top", 200, params={"limit": 1})
        if not success or not stations:
            print("❌ No stations available for favorites test")
            return False

        station = stations[0]
        favorite_data = {
            "stationuuid": station["stationuuid"],
            "name": station["name"],
            "url": station.get("url_resolved", station["url"]),
            "favicon": station.get("favicon", ""),
            "country": station["country"],
            "countrycode": station["countrycode"],
            "tags": station.get("tags", "")
        }

        # Add to favorites
        success, _ = self.run_test("Add to Favorites", "POST", "favorites", 200, data=favorite_data)
        if not success:
            return False

        # Check if favorite exists
        success, _ = self.run_test("Check Favorite Exists", "GET", f"favorites/check/{station['stationuuid']}", 200)
        if not success:
            return False

        # Get favorites list
        success, _ = self.run_test("Get Favorites List", "GET", "favorites", 200)
        if not success:
            return False

        # Remove from favorites
        success, _ = self.run_test("Remove from Favorites", "DELETE", f"favorites/{station['stationuuid']}", 200)
        return success

def main():
    print("🎵 Global Radio Station API Testing")
    print("=" * 50)
    
    tester = GlobalRadioAPITester()
    
    # Test all endpoints
    print("\n📡 Testing Core API Endpoints...")
    tester.test_root_endpoint()
    
    print("\n🎵 Testing Station Endpoints...")
    tester.test_top_stations()
    tester.test_search_stations()
    tester.test_stations_by_region()
    tester.test_stations_by_genre()
    
    print("\n🌍 Testing Metadata Endpoints...")
    tester.test_countries_endpoint()
    tester.test_regions_endpoint()
    tester.test_genres_endpoint()
    
    print("\n❤️ Testing Favorites Flow...")
    tester.test_favorites_flow()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   • {test['name']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())