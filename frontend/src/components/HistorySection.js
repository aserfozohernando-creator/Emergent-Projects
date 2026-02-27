import React from 'react';
import { History, Trash2, Radio } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

const HistorySection = ({ favorites, onToggleFavorite }) => {
  const { history, clearHistory, playStation, currentStation, isPlaying } = usePlayer();

  if (history.length === 0) return null;

  return (
    <div className="mt-6 md:mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm md:text-base">Recently Played</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-xs h-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {history.slice(0, 10).map((station) => {
            const isCurrentPlaying = currentStation?.stationuuid === station.stationuuid && isPlaying;
            
            return (
              <div
                key={station.stationuuid}
                onClick={() => playStation(station)}
                className={`flex-shrink-0 w-24 sm:w-28 cursor-pointer group ${
                  isCurrentPlaying ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <div className={`relative aspect-square rounded-xl overflow-hidden mb-2 border ${
                  isCurrentPlaying ? 'border-primary ring-2 ring-primary/30' : 'border-white/10'
                }`}>
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
                    <Radio className="w-8 h-8 text-primary" />
                  </div>
                  
                  {isCurrentPlaying && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5 items-end h-4 p-1 bg-black/80 rounded">
                      <span className="w-0.5 bg-primary equalizer-bar rounded-full"></span>
                      <span className="w-0.5 bg-primary equalizer-bar rounded-full"></span>
                      <span className="w-0.5 bg-primary equalizer-bar rounded-full"></span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium truncate text-center">{station.name}</p>
                <p className="text-[10px] text-muted-foreground truncate text-center">{station.country}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HistorySection;
