import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Volume2, VolumeX, X, Radio, Loader2, AlertCircle, Keyboard, Heart, Info } from 'lucide-react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import AudioVisualizer from './AudioVisualizer';
import SleepTimerButton from './SleepTimerButton';
import StationDetailsModal from './StationDetailsModal';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AudioPlayer = () => {
  const { 
    currentStation, 
    isPlaying, 
    isLoading, 
    error,
    volume, 
    togglePlay, 
    stop, 
    updateVolume 
  } = usePlayer();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if current station is favorite
  React.useEffect(() => {
    if (currentStation) {
      axios.get(`${API}/favorites/check/${currentStation.stationuuid}`)
        .then(res => setIsFavorite(res.data.is_favorite))
        .catch(() => setIsFavorite(false));
    }
  }, [currentStation?.stationuuid]);

  const toggleFavorite = async () => {
    if (!currentStation) return;
    
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${currentStation.stationuuid}`);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites`, {
          stationuuid: currentStation.stationuuid,
          name: currentStation.name,
          url: currentStation.url_resolved || currentStation.url,
          favicon: currentStation.favicon,
          country: currentStation.country,
          countrycode: currentStation.countrycode,
          tags: currentStation.tags
        });
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  if (!currentStation) return null;

  return (
    <>
      <div 
        data-testid="audio-player"
        className={`fixed bottom-0 left-0 right-0 h-18 sm:h-22 md:h-26 glass-heavy z-50 border-t ${
          error ? 'border-red-500/50' : 'border-white/10'
        }`}
        style={{ height: 'auto', minHeight: '72px' }}
      >
        <div className="container mx-auto h-full px-3 sm:px-4 md:px-8 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Station Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0" style={{ maxWidth: '200px' }}>
            <div className="relative flex-shrink-0">
              {currentStation.favicon ? (
                <img 
                  src={currentStation.favicon} 
                  alt={currentStation.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg object-cover bg-muted"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`${currentStation.favicon ? 'hidden' : 'flex'} w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center`}
              >
                <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>

              {/* Error indicator */}
              {error && (
                <div className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 bg-red-500 rounded-full">
                  <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 bg-black/80 rounded-full">
                  <Loader2 className="w-2 h-2 sm:w-3 sm:h-3 text-primary animate-spin" />
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h4 
                data-testid="now-playing-name"
                className={`font-semibold text-xs sm:text-sm md:text-base truncate ${
                  error ? 'text-red-400' : 'text-foreground'
                }`}
              >
                {currentStation.name}
              </h4>
              <p className={`text-[10px] sm:text-xs md:text-sm truncate ${
                error ? 'text-red-400/70' : 'text-muted-foreground'
              }`}>
                {error ? (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Stream unavailable</span>
                    <span className="sm:hidden">Offline</span>
                  </span>
                ) : isLoading ? (
                  'Connecting...'
                ) : (
                  currentStation.country
                )}
              </p>
            </div>
          </div>

          {/* Center - Audio Visualizer */}
          <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
              <AudioVisualizer barCount={32} size="normal" />
            </div>
          </div>

          {/* Station Actions (Info + Favorite) */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetails(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Station Info</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFavorite}
                    className={`h-8 w-8 ${isFavorite ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Play/Pause Button */}
            <Button
              data-testid="play-pause-button"
              onClick={togglePlay}
              disabled={isLoading}
              size="icon"
              className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${
                error 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary/90'
              } text-primary-foreground neon-glow`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isPlaying && !error ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
              )}
            </Button>

            {/* Volume Control - Hidden on small mobile */}
            <div className="hidden sm:flex items-center gap-2 w-24 md:w-32">
              <button
                data-testid="mute-button"
                onClick={() => updateVolume(volume > 0 ? 0 : 0.7)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
              <Slider
                data-testid="volume-slider"
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => updateVolume(value[0] / 100)}
                className="w-16 md:w-20"
              />
            </div>

            {/* Sleep Timer */}
            <SleepTimerButton />

            {/* Keyboard Shortcuts Hint - Desktop only */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex text-muted-foreground hover:text-foreground h-9 w-9"
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover border-border">
                  <div className="text-xs space-y-1">
                    <div><kbd className="bg-muted px-1 rounded">Space</kbd> Play/Pause</div>
                    <div><kbd className="bg-muted px-1 rounded">↑↓</kbd> Volume</div>
                    <div><kbd className="bg-muted px-1 rounded">M</kbd> Mute</div>
                    <div><kbd className="bg-muted px-1 rounded">Esc</kbd> Stop</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Stop Button */}
            <Button
              data-testid="stop-button"
              onClick={stop}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Station Details Modal */}
      <StationDetailsModal
        station={currentStation}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        isFavorite={isFavorite}
        onToggleFavorite={() => toggleFavorite()}
      />
    </>
  );
};

export default AudioPlayer;
