import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import WorldMap from '../components/WorldMap';
import StationCard from '../components/StationCard';
import SearchBar from '../components/SearchBar';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTopStations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stations/top`, {
        params: { limit: 30 }
      });
      setStations(response.data);
    } catch (error) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStationsByRegion = useCallback(async (region) => {
    setLoading(true);
    setSelectedRegion(region);
    try {
      const response = await axios.get(`${API}/stations/by-region/${region}`, {
        params: { limit: 50 }
      });
      setStations(response.data);
      toast.success(`Showing stations from ${region.charAt(0).toUpperCase() + region.slice(1)}`);
    } catch (error) {
      toast.error('Failed to load regional stations');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchStations = useCallback(async (query) => {
    if (!query) {
      fetchTopStations();
      setSearchQuery('');
      return;
    }
    setLoading(true);
    setSearchQuery(query);
    setSelectedRegion(null);
    try {
      const response = await axios.get(`${API}/stations/search`, {
        params: { name: query, limit: 50 }
      });
      setStations(response.data);
      if (response.data.length === 0) {
        toast.info('No stations found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [fetchTopStations]);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/favorites`);
      setFavorites(response.data.map(f => f.stationuuid));
    } catch (error) {
      console.error('Failed to fetch favorites');
    }
  }, []);

  const toggleFavorite = async (station) => {
    const isFavorite = favorites.includes(station.stationuuid);
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${station.stationuuid}`);
        setFavorites(prev => prev.filter(id => id !== station.stationuuid));
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites`, {
          stationuuid: station.stationuuid,
          name: station.name,
          url: station.url_resolved || station.url,
          favicon: station.favicon,
          country: station.country,
          countrycode: station.countrycode,
          tags: station.tags
        });
        setFavorites(prev => [...prev, station.stationuuid]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  useEffect(() => {
    fetchTopStations();
    fetchFavorites();
  }, [fetchTopStations, fetchFavorites]);

  const handleRegionClick = (region, countryName) => {
    fetchStationsByRegion(region);
  };

  const resetToTop = () => {
    setSelectedRegion(null);
    setSearchQuery('');
    fetchTopStations();
  };

  return (
    <div data-testid="home-page" className="min-h-screen pt-16 pb-28">
      {/* Hero Section with Map */}
      <div className="relative">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-syne tracking-tight mb-2">
              <span className="text-primary neon-text">Global</span>{' '}
              <span className="text-foreground">Radio</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Discover 30,000+ radio stations from around the world
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-6 md:mb-8">
            <SearchBar onSearch={searchStations} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-white/10 bg-black/20 h-[300px] md:h-[450px]">
              <WorldMap 
                onRegionClick={handleRegionClick}
              />
            </div>

            {/* Stations Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedRegion ? (
                    <Globe className="w-4 h-4 text-primary" />
                  ) : searchQuery ? (
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  )}
                  <h2 className="font-semibold text-sm md:text-base">
                    {selectedRegion 
                      ? `${selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1)} Stations`
                      : searchQuery
                      ? `Results for "${searchQuery}"`
                      : 'Top Stations'
                    }
                  </h2>
                </div>
                {(selectedRegion || searchQuery) && (
                  <Button
                    data-testid="reset-stations"
                    variant="ghost"
                    size="sm"
                    onClick={resetToTop}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Station List */}
              <ScrollArea className="h-[250px] md:h-[380px] rounded-xl border border-white/5 bg-white/[0.02] p-2">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Globe className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">
                      No stations found. Try a different search or region.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stations.map((station) => (
                      <StationCard
                        key={station.stationuuid}
                        station={station}
                        isFavorite={favorites.includes(station.stationuuid)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Quick Region Access */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Access</h3>
            <div className="flex flex-wrap gap-2">
              {['europe', 'americas', 'asia', 'russia'].map((region) => (
                <Button
                  key={region}
                  data-testid={`quick-region-${region}`}
                  variant={selectedRegion === region ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchStationsByRegion(region)}
                  className={`rounded-full ${
                    selectedRegion === region 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border-white/10 hover:border-primary/50'
                  }`}
                >
                  {region.charAt(0).toUpperCase() + region.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
