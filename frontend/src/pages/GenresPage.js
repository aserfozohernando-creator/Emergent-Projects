import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Music2, ArrowLeft, Loader2 } from 'lucide-react';
import GenreCard from '../components/GenreCard';
import StationCard from '../components/StationCard';
import SearchBar from '../components/SearchBar';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GENRES = [
  'pop', 'rock', 'jazz', 'classical', 'electronic', 'hip hop',
  'country', 'r&b', 'reggae', 'latin', 'folk', 'blues',
  'metal', 'indie', 'soul', 'dance', 'ambient', 'world',
  'news', 'talk', 'sports'
];

const GenresPage = () => {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [stations, setStations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStationsByGenre = useCallback(async (genre) => {
    setLoading(true);
    setSelectedGenre(genre);
    try {
      const response = await axios.get(`${API}/stations/by-genre/${genre}`, {
        params: { limit: 50 }
      });
      setStations(response.data);
      if (response.data.length === 0) {
        toast.info(`No stations found for ${genre}`);
      }
    } catch (error) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchStationsInGenre = useCallback(async (query) => {
    if (!query && selectedGenre) {
      fetchStationsByGenre(selectedGenre);
      return;
    }
    if (!query) return;
    
    setLoading(true);
    try {
      const params = { name: query, limit: 50 };
      if (selectedGenre) {
        params.tag = selectedGenre;
      }
      const response = await axios.get(`${API}/stations/search`, { params });
      setStations(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, fetchStationsByGenre]);

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
    fetchFavorites();
  }, [fetchFavorites]);

  const goBack = () => {
    setSelectedGenre(null);
    setStations([]);
  };

  return (
    <div data-testid="genres-page" className="min-h-screen pt-16 pb-32 md:pb-28">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {!selectedGenre ? (
          <>
            {/* Genre Grid View */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-syne">Browse by Genre</h1>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Explore radio stations by your favorite music genre
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
              {GENRES.map((genre) => (
                <GenreCard
                  key={genre}
                  genre={genre}
                  onClick={fetchStationsByGenre}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Genre Stations View */}
            <div className="mb-4 md:mb-6">
              <Button
                data-testid="back-to-genres"
                variant="ghost"
                onClick={goBack}
                className="mb-3 sm:mb-4 h-8 sm:h-9 text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Back to Genres
              </Button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-syne capitalize">
                    {selectedGenre} Stations
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {stations.length} stations found
                  </p>
                </div>

                <div className="w-full sm:w-64 md:w-80">
                  <SearchBar 
                    onSearch={searchStationsInGenre}
                    placeholder={`Search in ${selectedGenre}...`}
                  />
                </div>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-320px)] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-white/5">
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Music2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">
                    No stations found for this genre.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1">
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
          </>
        )}
      </div>
    </div>
  );
};

export default GenresPage;
