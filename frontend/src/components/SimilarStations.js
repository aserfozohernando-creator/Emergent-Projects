import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Loader2, Radio, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { usePlayer } from '../context/PlayerContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SimilarStations = ({ favorites = [], onToggleFavorite }) => {
  const { currentStation, playStation, isPlaying } = usePlayer();
  const [similarStations, setSimilarStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!currentStation) {
      setSimilarStations([]);
      return;
    }

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const tags = currentStation.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
        const primaryTag = tags[0] || 'pop';
        
        const response = await axios.get(`${API}/stations/search`, {
          params: {
            tag: primaryTag,
            limit: 20
          }
        });

        const filtered = response.data
          .filter(s => s.stationuuid !== currentStation.stationuuid)
          .sort(() => Math.random() - 0.5)
          .slice(0, 12);

        setSimilarStations(filtered);
      } catch (error) {
        console.error('Failed to fetch similar stations:', error);
        setSimilarStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [currentStation?.stationuuid]);

  // Check scroll position
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [similarStations]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const shuffleSimilar = async () => {
    if (!currentStation) return;
    
    setShuffling(true);
    try {
      const tags = currentStation.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
      const primaryTag = tags[0] || 'pop';
      
      const response = await axios.get(`${API}/stations/shuffle-similar`, {
        params: {
          tag: primaryTag,
          exclude_id: currentStation.stationuuid
        }
      });
      
      playStation(response.data);
      toast.success(`Now playing: ${response.data.name}`);
    } catch (error) {
      console.error('Failed to shuffle:', error);
      toast.error('Failed to find similar station');
    } finally {
      setShuffling(false);
    }
  };

  if (!currentStation) return null;

  return (
    <div className="mt-4 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-foreground">Stations Like This</h3>
        </div>
        <div className="flex items-center gap-2">
          {currentStation.tags && (
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full hidden sm:inline">
              {currentStation.tags.split(',')[0]}
            </span>
          )}
          <Button
            data-testid="shuffle-similar-btn"
            variant="outline"
            size="sm"
            onClick={shuffleSimilar}
            disabled={shuffling || loading}
            className="h-7 text-xs border-accent/30 hover:border-accent hover:bg-accent/10 text-accent"
          >
            {shuffling ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Shuffle className="w-3 h-3 mr-1" />
            )}
            Shuffle
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : similarStations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No similar stations found
        </p>
      ) : (
        <div className="relative">
          {/* Left Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-white/10 shadow-lg transition-opacity ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </Button>

          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-primary/50 hover:scrollbar-thumb-primary pb-2 px-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {similarStations.map((station) => {
              const isCurrentPlaying = currentStation?.stationuuid === station.stationuuid && isPlaying;
              
              return (
                <div
                  key={station.stationuuid}
                  onClick={() => playStation(station)}
                  className="flex-shrink-0 w-24 sm:w-28 cursor-pointer group"
                >
                  <div className={`relative aspect-square rounded-lg overflow-hidden mb-1.5 border-2 ${
                    isCurrentPlaying ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 group-hover:border-primary/30'
                  } transition-all`}>
                    {station.favicon ? (
                      <img 
                        src={station.favicon} 
                        alt={station.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`${station.favicon ? 'hidden' : 'flex'} w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center`}>
                      <Radio className="w-6 h-6 text-primary" />
                    </div>
                    
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-black text-xs">▶</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium truncate text-foreground">{station.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{station.country}</p>
                </div>
              );
            })}
          </div>

          {/* Right Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-white/10 shadow-lg transition-opacity ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimilarStations;
