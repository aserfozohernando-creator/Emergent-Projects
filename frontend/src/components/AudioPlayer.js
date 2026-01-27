import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Volume2, VolumeX, X, Radio, Loader2, AlertCircle } from 'lucide-react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';

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

  if (!currentStation) return null;

  return (
    <div 
      data-testid="audio-player"
      className={`fixed bottom-0 left-0 right-0 h-16 sm:h-20 md:h-24 glass-heavy z-50 border-t ${
        error ? 'border-red-500/50' : 'border-white/10'
      }`}
    >
      <div className="container mx-auto h-full px-3 sm:px-4 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Station Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
            
            {/* Playing indicator */}
            {isPlaying && !isLoading && !error && (
              <div className="absolute -bottom-1 -right-1 flex gap-0.5 items-end h-3 sm:h-4 p-0.5 sm:p-1 bg-black/80 rounded">
                <span className="w-0.5 sm:w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-0.5 sm:w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-0.5 sm:w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-0.5 sm:w-1 bg-primary equalizer-bar rounded-full"></span>
              </div>
            )}

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
                <>
                  {currentStation.country}
                  <span className="hidden sm:inline">
                    {currentStation.tags && ` • ${currentStation.tags.split(',')[0]}`}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
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
  );
};

export default AudioPlayer;
