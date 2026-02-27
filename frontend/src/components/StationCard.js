import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Heart, Radio, Loader2, Zap, Info, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import StationDetailsModal from './StationDetailsModal';

const StationCard = ({ station, isFavorite, onToggleFavorite }) => {
  const { currentStation, isPlaying, isLoading, playStation, getStationHealthStatus } = usePlayer();
  const [showDetails, setShowDetails] = useState(false);
  
  const isCurrentStation = currentStation?.stationuuid === station.stationuuid;
  const isCurrentPlaying = isCurrentStation && isPlaying;
  const isCurrentLoading = isCurrentStation && isLoading;
  
  const healthStatus = getStationHealthStatus(station.stationuuid);
  
  const healthConfig = {
    good: { color: 'bg-green-500', ring: 'ring-green-500/30', icon: Wifi, label: 'Reliable stream' },
    fair: { color: 'bg-yellow-500', ring: 'ring-yellow-500/30', icon: Wifi, label: 'Sometimes unstable' },
    poor: { color: 'bg-red-500', ring: 'ring-red-500/30', icon: WifiOff, label: 'Often offline' },
    unknown: { color: 'bg-gray-400', ring: 'ring-gray-400/30', icon: Wifi, label: 'Not tested yet' }
  };

  const health = healthConfig[healthStatus];

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setShowDetails(true);
  };

  return (
    <>
      <div 
        data-testid={`station-card-${station.stationuuid}`}
        className={`station-card group relative rounded-xl bg-white/5 hover:bg-white/10 border ${
          isCurrentPlaying ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-primary/30'
        } p-2 sm:p-3 cursor-pointer transition-all`}
        onClick={() => playStation(station)}
      >
        {/* Active indicator */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl transition-opacity ${
          isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        }`} />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Station Image */}
          <div className="relative flex-shrink-0">
            {station.favicon ? (
              <img 
                src={station.favicon} 
                alt={station.name}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover bg-muted group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`${station.favicon ? 'hidden' : 'flex'} w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center group-hover:scale-105 transition-transform`}
            >
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>

            {/* Enhanced Health indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${health.color} ${health.ring} ring-2 border-2 border-background flex items-center justify-center cursor-help shadow-lg`}>
                    <health.icon className="w-2 h-2 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover border-border">
                  <p className="text-xs">{health.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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

          {/* Station Info - Fixed width to prevent cutoff */}
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-semibold text-xs sm:text-sm truncate text-foreground group-hover:text-primary transition-colors">
              {station.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {station.country}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {station.tags && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 truncate max-w-[80px] sm:max-w-[100px]">
                  {station.tags.split(',')[0]}
                </span>
              )}
              {station.source === 'tunein' && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-secondary/50 text-secondary flex-shrink-0">
                  <Zap className="w-2 h-2 mr-0.5" />
                  TuneIn
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons - Always visible */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {/* Info Button */}
            <Button
              data-testid={`info-btn-${station.stationuuid}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
              onClick={handleInfoClick}
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>

            {/* Favorite Button */}
            <Button
              data-testid={`favorite-btn-${station.stationuuid}`}
              variant="ghost"
              size="icon"
              className={`h-7 w-7 sm:h-8 sm:w-8 ${isFavorite ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(station);
              }}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
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
