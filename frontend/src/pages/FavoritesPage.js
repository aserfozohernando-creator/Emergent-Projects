import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, Radio } from 'lucide-react';
import StationCard from '../components/StationCard';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/favorites`);
      setFavorites(response.data);
    } catch (error) {
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFavorite = async (station) => {
    try {
      await axios.delete(`${API}/favorites/${station.stationuuid}`);
      setFavorites(prev => prev.filter(f => f.stationuuid !== station.stationuuid));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Map favorites to station format for StationCard
  const favoritesAsStations = favorites.map(fav => ({
    stationuuid: fav.stationuuid,
    name: fav.name,
    url: fav.url,
    url_resolved: fav.url,
    favicon: fav.favicon,
    country: fav.country,
    countrycode: fav.countrycode,
    tags: fav.tags
  }));

  return (
    <div data-testid="favorites-page" className="min-h-screen pt-16 pb-28">
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6 text-secondary fill-secondary" />
            <h1 className="text-3xl md:text-4xl font-bold font-syne">My Favorites</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Your saved radio stations • {favorites.length} station{favorites.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <Skeleton className="w-14 h-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Radio className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Start exploring and add your favorite radio stations by clicking the heart icon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favoritesAsStations.map((station) => (
                <StationCard
                  key={station.stationuuid}
                  station={station}
                  isFavorite={true}
                  onToggleFavorite={removeFavorite}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default FavoritesPage;
