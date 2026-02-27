import React, { useState, useEffect, useCallback } from 'react';
import { Podcast, ChevronLeft, ChevronRight, ExternalLink, Loader2, Headphones } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePlayer } from '../context/PlayerContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RelatedPodcasts = () => {
  const { currentStation } = usePlayer();
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef(null);

  const fetchRelatedPodcasts = useCallback(async () => {
    if (!currentStation) {
      setPodcasts([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/podcasts/related`, {
        params: {
          station_name: currentStation.name,
          tags: currentStation.tags,
          limit: 12
        }
      });
      setPodcasts(response.data.podcasts || []);
    } catch (error) {
      console.error('Failed to fetch podcasts:', error);
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  }, [currentStation]);

  useEffect(() => {
    fetchRelatedPodcasts();
  }, [fetchRelatedPodcasts]);

  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      setScrollPosition(container.scrollLeft);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, podcasts]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current 
    ? scrollPosition < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 10
    : false;

  if (!currentStation) return null;

  return (
    <div className="mt-4 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-sm text-foreground">Related Podcasts</h3>
        </div>
        <Badge variant="outline" className="text-xs border-purple-400/50 text-purple-400">
          <Podcast className="w-3 h-3 mr-1" />
          {podcasts.length} found
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        </div>
      ) : podcasts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No related podcasts found for this station.
        </p>
      ) : (
        <div className="relative">
          {/* Left Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 backdrop-blur border border-white/10 shadow-lg transition-all ${
              canScrollLeft ? 'opacity-100 hover:bg-background' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </Button>

          {/* Podcasts Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500 pb-2 px-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {podcasts.map((podcast) => (
              <a
                key={podcast.id}
                href={podcast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-32 sm:w-36 group cursor-pointer"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-2 border border-white/10 group-hover:border-purple-400/50 transition-all shadow-md group-hover:shadow-purple-500/20">
                  {podcast.image ? (
                    <img 
                      src={podcast.image} 
                      alt={podcast.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`${podcast.image ? 'hidden' : 'flex'} w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 items-center justify-center`}>
                    <Podcast className="w-8 h-8 text-purple-400" />
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <ExternalLink className="w-3 h-3" />
                      <span>Open</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium truncate text-foreground group-hover:text-purple-400 transition-colors">
                  {podcast.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{podcast.author}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-purple-500/10 text-purple-400">
                    {podcast.episode_count} eps
                  </Badge>
                </div>
              </a>
            ))}
          </div>

          {/* Right Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 backdrop-blur border border-white/10 shadow-lg transition-all ${
              canScrollRight ? 'opacity-100 hover:bg-background' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RelatedPodcasts;
