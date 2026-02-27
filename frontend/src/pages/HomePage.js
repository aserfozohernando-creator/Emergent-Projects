import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, TrendingUp, RefreshCw, Bell, Loader2, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import WorldMap from '../components/WorldMap';
import StationCard from '../components/StationCard';
import SearchBar from '../components/SearchBar';
import HistorySection from '../components/HistorySection';
import DiscoverButton from '../components/DiscoverButton';
import SimilarStations from '../components/SimilarStations';
import RelatedPodcasts from '../components/RelatedPodcasts';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { usePlayer } from '../context/PlayerContext';
import { useLocalData } from '../context/LocalDataContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const { requestNotificationPermission } = usePlayer();
  const { 
    favorites, 
    isFavorite, 
    toggleFavorite,
    stationLiveStatus,
    batchUpdateLiveStatus,
    getLiveStatus,
    isCheckingStations,
    setIsCheckingStations
  } = useLocalData();
  
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );
  const [verifyingRed, setVerifyingRed] = useState(false);

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast.success('Notifications enabled!');
    }
  };

  // Sort stations: live first, then offline at bottom
  const sortedStations = useMemo(() => {
    if (!stations.length) return [];
    
    return [...stations].sort((a, b) => {
      const statusA = getLiveStatus(a.stationuuid);
      const statusB = getLiveStatus(b.stationuuid);
      
      // If both have status, sort live to top
      if (statusA && statusB) {
        if (statusA.isLive && !statusB.isLive) return -1;
        if (!statusA.isLive && statusB.isLive) return 1;
      }
      // If only one has status
      if (statusA && !statusB) {
        return statusA.isLive ? -1 : 1;
      }
      if (!statusA && statusB) {
        return statusB.isLive ? 1 : -1;
      }
      
      return 0; // Keep original order for unknown status
    });
  }, [stations, stationLiveStatus, getLiveStatus]);

  // Get count of live/offline stations
  const stationStats = useMemo(() => {
    let live = 0;
    let offline = 0;
    let unchecked = 0;
    
    stations.forEach(s => {
      const status = getLiveStatus(s.stationuuid);
      if (!status) unchecked++;
      else if (status.isLive) live++;
      else offline++;
    });
    
    return { live, offline, unchecked };
  }, [stations, getLiveStatus]);

  // Background check stations
  const checkStationsHealth = useCallback(async (stationsToCheck) => {
    if (!stationsToCheck.length || isCheckingStations) return;
    
    setIsCheckingStations(true);
    
    try {
      const response = await axios.post(`${API}/stations/verify-batch`, {
        stations: stationsToCheck.map(s => ({
          stationuuid: s.stationuuid,
          url: s.url,
          url_resolved: s.url_resolved
        }))
      });
      
      const statusUpdates = {};
      response.data.forEach(result => {
        statusUpdates[result.stationuuid] = {
          isLive: result.is_live,
          checkedAt: Date.now()
        };
      });
      
      batchUpdateLiveStatus(statusUpdates);
      
      const liveCount = response.data.filter(r => r.is_live).length;
      const offlineCount = response.data.filter(r => !r.is_live).length;
      
      if (offlineCount > 0) {
        toast.info(`${liveCount} live, ${offlineCount} offline stations`);
      }
    } catch (error) {
      console.error('Failed to check stations:', error);
    } finally {
      setIsCheckingStations(false);
    }
  }, [isCheckingStations, setIsCheckingStations, batchUpdateLiveStatus]);

  // Re-verify offline stations
  const reverifyOfflineStations = useCallback(async () => {
    const offlineStations = stations.filter(s => {
      const status = getLiveStatus(s.stationuuid);
      return status && !status.isLive;
    });
    
    if (!offlineStations.length) {
      toast.info('No offline stations to re-verify');
      return;
    }
    
    setVerifyingRed(true);
    
    try {
      const response = await axios.post(`${API}/stations/verify-batch`, {
        stations: offlineStations.map(s => ({
          stationuuid: s.stationuuid,
          url: s.url,
          url_resolved: s.url_resolved
        }))
      });
      
      const statusUpdates = {};
      response.data.forEach(result => {
        statusUpdates[result.stationuuid] = {
          isLive: result.is_live,
          checkedAt: Date.now()
        };
      });
      
      batchUpdateLiveStatus(statusUpdates);
      
      const nowLive = response.data.filter(r => r.is_live).length;
      if (nowLive > 0) {
        toast.success(`${nowLive} station(s) now live!`);
      } else {
        toast.info('All re-verified stations still offline');
      }
    } catch (error) {
      toast.error('Failed to re-verify stations');
    } finally {
      setVerifyingRed(false);
    }
  }, [stations, getLiveStatus, batchUpdateLiveStatus]);

  const fetchTopStations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stations/top`, {
        params: { limit: 30 }
      });
      setStations(response.data);
      // Check stations health in background after loading
      setTimeout(() => checkStationsHealth(response.data), 500);
    } catch (error) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, [checkStationsHealth]);

  const fetchStationsByRegion = useCallback(async (region) => {
    setLoading(true);
    setSelectedRegion(region);
    try {
      const response = await axios.get(`${API}/stations/by-region/${region}`, {
        params: { limit: 50 }
      });
      setStations(response.data);
      toast.success(`Showing stations from ${region.charAt(0).toUpperCase() + region.slice(1)}`);
      // Check stations health in background
      setTimeout(() => checkStationsHealth(response.data), 500);
    } catch (error) {
      toast.error('Failed to load regional stations');
    } finally {
      setLoading(false);
    }
  }, [checkStationsHealth]);

  const fetchStationsByCountry = useCallback(async (countryCode, countryName) => {
    setLoading(true);
    setSelectedRegion(countryCode);
    try {
      const response = await axios.get(`${API}/stations/by-country/${countryCode}`, {
        params: { limit: 50 }
      });
      setStations(response.data);
      toast.success(`Showing stations from ${countryName}`);
      // Check stations health in background
      setTimeout(() => checkStationsHealth(response.data), 500);
    } catch (error) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, [checkStationsHealth]);

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
      } else {
        // Check stations health in background
        setTimeout(() => checkStationsHealth(response.data), 500);
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [fetchTopStations, checkStationsHealth]);

  useEffect(() => {
    fetchTopStations();
  }, []);

  const handleRegionClick = (region) => {
    fetchStationsByRegion(region);
  };

  const resetToTop = () => {
    setSelectedRegion(null);
    setSearchQuery('');
    fetchTopStations();
  };

  const handleToggleFavorite = (station) => {
    toggleFavorite(station);
  };

  return (
    <div data-testid="home-page" className="min-h-screen pt-16 pb-32 md:pb-28">
      <div className="relative">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
          {/* Header */}
          <div className="text-center mb-4 md:mb-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-syne tracking-tight mb-1 md:mb-2">
              <span className="text-primary neon-text">Global</span>{' '}
              <span className="text-foreground">Radio</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              Discover 30,000+ radio stations from around the world
            </p>
          </div>

          {/* Search Bar with Discover Button */}
          <div className="max-w-xl mx-auto mb-4 md:mb-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchBar onSearch={searchStations} />
              </div>
              <DiscoverButton />
              {!notificationsEnabled && 'Notification' in window && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={enableNotifications}
                  className="text-muted-foreground hover:text-foreground"
                  title="Enable notifications"
                >
                  <Bell className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Region Access - Mobile First */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap justify-center gap-2">
              {/* Regions */}
              {['europe', 'americas', 'asia'].map((region) => (
                <Button
                  key={region}
                  data-testid={`quick-region-${region}`}
                  variant={selectedRegion === region ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchStationsByRegion(region)}
                  className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 ${
                    selectedRegion === region 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border-white/10 hover:border-primary/50'
                  }`}
                >
                  {region.charAt(0).toUpperCase() + region.slice(1)}
                </Button>
              ))}
              {/* Countries */}
              {[
                { code: 'PL', name: 'Poland' },
                { code: 'HU', name: 'Hungary' }
              ].map((country) => (
                <Button
                  key={country.code}
                  data-testid={`quick-country-${country.code.toLowerCase()}`}
                  variant={selectedRegion === country.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchStationsByCountry(country.code, country.name)}
                  className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 ${
                    selectedRegion === country.code 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'border-white/10 hover:border-secondary/50'
                  }`}
                >
                  {country.name}
                </Button>
              ))}
              {/* Russia */}
              <Button
                data-testid="quick-region-russia"
                variant={selectedRegion === 'russia' ? "default" : "outline"}
                size="sm"
                onClick={() => fetchStationsByRegion('russia')}
                className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 ${
                  selectedRegion === 'russia' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'border-white/10 hover:border-primary/50'
                }`}
              >
                Russia
              </Button>
            </div>
          </div>

          {/* Main Content - Stack on mobile, side by side on desktop */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Map Section */}
            <div className="w-full lg:w-3/5 xl:w-2/3 relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-black/20 h-[200px] sm:h-[280px] md:h-[350px] lg:h-[450px]">
              <WorldMap onRegionClick={handleRegionClick} />
            </div>

            {/* Stations Section */}
            <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col">
              {/* Header with status indicators */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {selectedRegion ? (
                    <Globe className="w-4 h-4 text-primary" />
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
                <div className="flex items-center gap-2">
                  {/* Station status indicators */}
                  {!loading && stations.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {isCheckingStations ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking...
                        </span>
                      ) : (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-0.5 text-green-500">
                                  <Wifi className="w-3 h-3" />
                                  {stationStats.live}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Live stations</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {stationStats.offline > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-0.5 text-red-500">
                                    <WifiOff className="w-3 h-3" />
                                    {stationStats.offline}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Offline stations</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Re-verify button for offline stations */}
                  {stationStats.offline > 0 && !isCheckingStations && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            data-testid="reverify-offline-btn"
                            variant="ghost"
                            size="sm"
                            onClick={reverifyOfflineStations}
                            disabled={verifyingRed}
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            {verifyingRed ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="w-3 h-3 mr-1" />
                            )}
                            Re-verify
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Re-check offline stations</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {(selectedRegion || searchQuery) && (
                    <Button
                      data-testid="reset-stations"
                      variant="ghost"
                      size="sm"
                      onClick={resetToTop}
                      className="text-xs h-7"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Station List - Responsive height */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[380px] rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="p-2 sm:p-3">
                    {loading ? (
                      <div className="space-y-2 sm:space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 sm:p-3">
                            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0" />
                            <div className="flex-1 space-y-2 min-w-0">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : stations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
                        <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">
                          No stations found. Try a different search or region.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedStations.map((station) => (
                          <StationCard
                            key={station.stationuuid}
                            station={station}
                            isFavorite={isFavorite(station.stationuuid)}
                            onToggleFavorite={handleToggleFavorite}
                            liveStatus={getLiveStatus(station.stationuuid)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Similar Stations */}
                <SimilarStations 
                  favorites={favorites.map(f => f.stationuuid)}
                  onToggleFavorite={handleToggleFavorite}
                />

                {/* Related Podcasts */}
                <RelatedPodcasts />
              </div>
            </div>
          </div>

          {/* Recently Played History */}
          <HistorySection 
            favorites={favorites.map(f => f.stationuuid)}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
