import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Heart, Radio, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

const StationCard = ({ station, isFavorite, onToggleFavorite }) => {
  const { currentStation, isPlaying, isLoading, playStation } = usePlayer();
  const isCurrentStation = currentStation?.stationuuid === station.stationuuid;
  const isCurrentPlaying = isCurrentStation && isPlaying;
  const isCurrentLoading = isCurrentStation && isLoading;

  return (
    <div 
      data-testid={`station-card-${station.stationuuid}`}
      className={`station-card group relative overflow-hidden rounded-xl bg-white/5 hover:bg-white/10 border ${
        isCurrentPlaying ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-primary/30'
      } p-3 md:p-4 flex items-center gap-3 md:gap-4 cursor-pointer`}
      onClick={() => playStation(station)}
    >
      {/* Active indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary transition-opacity ${
        isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
      }`} />

      {/* Station Image */}
      <div className="relative flex-shrink-0">
        {station.favicon ? (
          <img 
            src={station.favicon} 
            alt={station.name}
            className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover bg-muted group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`${station.favicon ? 'hidden' : 'flex'} w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center group-hover:scale-105 transition-transform`}
        >
          <Radio className="w-6 h-6 text-primary" />
        </div>

        {/* Play overlay on hover */}
        <div className={`absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center transition-opacity ${
          isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isCurrentLoading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : isCurrentPlaying ? (
            <Pause className="w-5 h-5 text-primary" />
          ) : (
            <Play className="w-5 h-5 text-primary ml-0.5" />
          )}
        </div>
      </div>

      {/* Station Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm md:text-base truncate text-foreground group-hover:text-primary transition-colors">
          {station.name}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground truncate">
          {station.country}
        </p>
        {station.tags && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {station.tags.split(',').slice(0, 2).join(' • ')}
          </p>
        )}
      </div>

      {/* Favorite Button */}
      <Button
        data-testid={`favorite-btn-${station.stationuuid}`}
        variant="ghost"
        size="icon"
        className={`flex-shrink-0 ${isFavorite ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(station);
        }}
      >
        <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorite ? 'fill-current' : ''}`} />
      </Button>
    </div>
  );
};

export default StationCard;
