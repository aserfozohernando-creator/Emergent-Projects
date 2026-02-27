import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Heart, Radio, Loader2, Zap, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import StationDetailsModal from './StationDetailsModal';

const StationCard = ({ station, isFavorite, onToggleFavorite }) => {
  const { currentStation, isPlaying, isLoading, playStation, getStationHealthStatus } = usePlayer();
  const [showDetails, setShowDetails] = useState(false);
  
  const isCurrentStation = currentStation?.stationuuid === station.stationuuid;
  const isCurrentPlaying = isCurrentStation && isPlaying;
  const isCurrentLoading = isCurrentStation && isLoading;
  
  const healthStatus = getStationHealthStatus(station.stationuuid);
  const healthColors = {
    good: 'bg-green-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
    unknown: 'bg-gray-500/50'
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setShowDetails(true);
  };

  return (
    <>
      <div 
        data-testid={`station-card-${station.stationuuid}`}
        className={`station-card group relative overflow-visible rounded-xl bg-white/5 hover:bg-white/10 border ${
          isCurrentPlaying ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-primary/30'
        } p-2 sm:p-3 flex items-center gap-2 sm:gap-3 cursor-pointer transition-all`}
        onClick={() => playStation(station)}
      >
        {/* Active indicator */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl transition-opacity ${
          isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        }`} />

        {/* Station Image */}
        <div className="relative flex-shrink-0">
          {station.favicon ? (
            <img 
              src={station.favicon} 
              alt={station.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover bg-muted group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`${station.favicon ? 'hidden' : 'flex'} w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center group-hover:scale-105 transition-transform`}
          >
            <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>

          {/* Health indicator */}
          <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${healthColors[healthStatus]} border border-black/50`} 
               title={healthStatus === 'good' ? 'Reliable' : healthStatus === 'fair' ? 'Sometimes unstable' : healthStatus === 'poor' ? 'Often offline' : 'Not tested'} />

          {/* Play overlay on hover */}
          <div className={`absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center transition-opacity ${
            isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {isCurrentLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
            ) : isCurrentPlaying ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary ml-0.5" />
            )}
          </div>
        </div>

        {/* Station Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-xs sm:text-sm truncate text-foreground group-hover:text-primary transition-colors">
            {station.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {station.country}
          </p>
          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 flex-wrap">
            {station.tags && (
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate max-w-[100px] sm:max-w-[150px]">
                {station.tags.split(',').slice(0, 1).join('')}
              </p>
            )}
            {station.source === 'tunein' && (
              <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0 h-3 sm:h-4 border-secondary/50 text-secondary flex-shrink-0">
                <Zap className="w-2 h-2 mr-0.5" />
                TuneIn
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Info Button */}
          <Button
            data-testid={`info-btn-${station.stationuuid}`}
            variant="ghost"
            size="icon"
            className="hidden sm:flex flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
            onClick={handleInfoClick}
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>

          {/* Favorite Button */}
          <Button
            data-testid={`favorite-btn-${station.stationuuid}`}
            variant="ghost"
            size="icon"
            className={`flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 ${isFavorite ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(station);
            }}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Details Modal */}
      <StationDetailsModal
        station={station}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </>
  );
};

export default StationCard;
