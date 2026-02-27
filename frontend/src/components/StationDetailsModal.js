import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Radio, Globe, Music2, Signal, ExternalLink, 
  Heart, Play, Copy, Share2, Zap 
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { toast } from 'sonner';

const StationDetailsModal = ({ station, isOpen, onClose, isFavorite, onToggleFavorite }) => {
  const { playStation, getStationHealthStatus, currentStation, isPlaying } = usePlayer();
  
  if (!station) return null;

  const healthStatus = getStationHealthStatus(station.stationuuid);
  const isCurrentStation = currentStation?.stationuuid === station.stationuuid;
  const isCurrentPlaying = isCurrentStation && isPlaying;

  const healthColors = {
    good: 'bg-green-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
    unknown: 'bg-gray-500'
  };

  const healthLabels = {
    good: 'Reliable',
    fair: 'Sometimes unstable',
    poor: 'Often offline',
    unknown: 'Not tested'
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(station.url_resolved || station.url);
    toast.success('Stream URL copied!');
  };

  const handleShare = async () => {
    const shareData = {
      title: station.name,
      text: `Listen to ${station.name} on Global Radio`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        if (e.name !== 'AbortError') {
          handleCopyUrl();
        }
      }
    } else {
      handleCopyUrl();
    }
  };

  const handlePlay = () => {
    playStation(station);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {station.favicon ? (
              <img 
                src={station.favicon} 
                alt={station.name}
                className="w-12 h-12 rounded-lg object-cover bg-muted"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Radio className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-foreground">{station.name}</h3>
              <p className="text-sm text-muted-foreground">{station.country}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Health Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${healthColors[healthStatus]}`} />
            <span className="text-sm text-muted-foreground">{healthLabels[healthStatus]}</span>
            {station.source === 'tunein' && (
              <Badge variant="outline" className="text-[10px] ml-auto border-secondary/50 text-secondary">
                <Zap className="w-2 h-2 mr-1" />
                TuneIn
              </Badge>
            )}
          </div>

          {/* Station Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {station.country && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span>{station.country}</span>
              </div>
            )}
            {station.language && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Music2 className="w-4 h-4" />
                <span className="truncate">{station.language}</span>
              </div>
            )}
            {station.bitrate > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Signal className="w-4 h-4" />
                <span>{station.bitrate} kbps</span>
              </div>
            )}
            {station.codec && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Radio className="w-4 h-4" />
                <span>{station.codec}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {station.tags && (
            <div className="flex flex-wrap gap-1">
              {station.tags.split(',').slice(0, 6).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-white/5">
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              onClick={handlePlay}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              {isCurrentPlaying ? 'Playing' : 'Play'}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onToggleFavorite(station)}
              className={isFavorite ? 'text-secondary border-secondary/50' : 'border-white/10'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleShare}
              className="border-white/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyUrl}
              className="border-white/10"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Website Link */}
          {station.homepage && (
            <a 
              href={station.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Visit station website
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StationDetailsModal;
