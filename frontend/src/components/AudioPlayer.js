import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Volume2, VolumeX, X, Radio, Loader2 } from 'lucide-react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';

const AudioPlayer = () => {
  const { 
    currentStation, 
    isPlaying, 
    isLoading, 
    volume, 
    togglePlay, 
    stop, 
    updateVolume 
  } = usePlayer();

  if (!currentStation) return null;

  return (
    <div 
      data-testid="audio-player"
      className="fixed bottom-0 left-0 right-0 h-20 md:h-24 glass-heavy z-50 border-t border-white/10"
    >
      <div className="container mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Station Info */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          <div className="relative">
            {currentStation.favicon ? (
              <img 
                src={currentStation.favicon} 
                alt={currentStation.name}
                className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover bg-muted"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`${currentStation.favicon ? 'hidden' : 'flex'} w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center`}
            >
              <Radio className="w-6 h-6 text-primary" />
            </div>
            
            {/* Playing indicator */}
            {isPlaying && !isLoading && (
              <div className="absolute -bottom-1 -right-1 flex gap-0.5 items-end h-4 p-1 bg-black/80 rounded">
                <span className="w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-1 bg-primary equalizer-bar rounded-full"></span>
                <span className="w-1 bg-primary equalizer-bar rounded-full"></span>
              </div>
            )}
          </div>
          
          <div className="min-w-0">
            <h4 
              data-testid="now-playing-name"
              className="font-semibold text-sm md:text-base truncate text-foreground"
            >
              {currentStation.name}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {currentStation.country} {currentStation.tags && `• ${currentStation.tags.split(',')[0]}`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Play/Pause Button */}
          <Button
            data-testid="play-pause-button"
            onClick={togglePlay}
            disabled={isLoading}
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground neon-glow"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          {/* Volume Control - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 w-32">
            <button
              data-testid="mute-button"
              onClick={() => updateVolume(volume > 0 ? 0 : 0.7)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <Slider
              data-testid="volume-slider"
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => updateVolume(value[0] / 100)}
              className="w-20"
            />
          </div>

          {/* Stop Button */}
          <Button
            data-testid="stop-button"
            onClick={stop}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
