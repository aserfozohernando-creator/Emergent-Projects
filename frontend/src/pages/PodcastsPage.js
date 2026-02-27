import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Podcast, Search, Headphones, TrendingUp } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import PodcastCard from '../components/PodcastCard';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PODCAST_GENRES = [
  'music', 'news', 'comedy', 'sports', 'arts', 'technology',
  'business', 'health', 'education', 'society', 'science',
  'history', 'true crime', 'fiction'
];

const PodcastsPage = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);

  const fetchTopPodcasts = useCallback(async (genre = null) => {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (genre) params.genre = genre;
      
      const response = await axios.get(`${API}/podcasts/top`, { params });
      setPodcasts(response.data.podcasts || []);
    } catch (error) {
      toast.error('Failed to load podcasts');
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPodcasts = useCallback(async (query) => {
    if (!query.trim()) {
      fetchTopPodcasts(selectedGenre);
      setSearchQuery('');
      return;
    }
    
    setLoading(true);
    setSearchQuery(query);
    try {
      const response = await axios.get(`${API}/podcasts/search`, {
        params: { query, limit: 30 }
      });
      setPodcasts(response.data || []);
      if (response.data.length === 0) {
        toast.info('No podcasts found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, fetchTopPodcasts]);

  useEffect(() => {
    fetchTopPodcasts();
  }, [fetchTopPodcasts]);

  const handleGenreClick = (genre) => {
    setSelectedGenre(genre === selectedGenre ? null : genre);
    setSearchQuery('');
    fetchTopPodcasts(genre === selectedGenre ? null : genre);
  };

  return (
    <div data-testid="podcasts-page" className="min-h-screen pt-16 pb-32 md:pb-28">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-syne">Podcasts</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
            Discover podcasts from your favorite radio stations
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mb-4 md:mb-6">
          <SearchBar onSearch={searchPodcasts} placeholder="Search podcasts..." />
        </div>

        {/* Genre Filters */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-wrap gap-2">
            {PODCAST_GENRES.map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? "default" : "outline"}
                size="sm"
                onClick={() => handleGenreClick(genre)}
                className={`rounded-full text-xs capitalize ${
                  selectedGenre === genre 
                    ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                    : 'border-white/10 hover:border-purple-400/50'
                }`}
              >
                {genre}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {searchQuery ? (
              <Search className="w-4 h-4 text-muted-foreground" />
            ) : (
              <TrendingUp className="w-4 h-4 text-purple-400" />
            )}
            <h2 className="font-semibold text-sm md:text-base">
              {searchQuery 
                ? `Results for "${searchQuery}"`
                : selectedGenre 
                ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Podcasts`
                : 'Top Podcasts'
              }
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{podcasts.length} podcasts</span>
        </div>

        {/* Podcasts Grid */}
        <ScrollArea className="h-[calc(100vh-380px)] sm:h-[calc(100vh-360px)]">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : podcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Podcast className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                No podcasts found. Try a different search or genre.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {podcasts.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default PodcastsPage;
