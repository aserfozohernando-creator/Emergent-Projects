import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Loader2, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { usePlayer } from '../context/PlayerContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SimilarStations = ({ onPlayStation, favorites = [], onToggleFavorite }) => {
  const { currentStation, playStation, isPlaying } = usePlayer();
  const [similarStations, setSimilarStations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentStation) {
      setSimilarStations([]);
      return;
    }

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        // Get primary tag/genre from current station
        const tags = currentStation.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
        const primaryTag = tags[0] || 'pop';
        
        // Fetch stations with similar tags
        const response = await axios.get(`${API}/stations/search`, {
          params: {
            tag: primaryTag,
            limit: 20
          }
        });

        // Filter out current station and shuffle
        const filtered = response.data
          .filter(s => s.stationuuid !== currentStation.stationuuid)
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);

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

  if (!currentStation) return null;

  return (
    <div className="mt-4 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm">Stations Like This</h3>
        </div>
        {currentStation.tags && (
          <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            {currentStation.tags.split(',')[0]}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : similarStations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No similar stations found
        </p>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {similarStations.map((station) => {
              const isCurrentPlaying = currentStation?.stationuuid === station.stationuuid && isPlaying;
              
              return (
                <div
                  key={station.stationuuid}
                  onClick={() => playStation(station)}
                  className="flex-shrink-0 w-20 sm:w-24 cursor-pointer group"
                >
                  <div className={`relative aspect-square rounded-lg overflow-hidden mb-1.5 border ${
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
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium truncate">{station.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{station.country}</p>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};

export default SimilarStations;
