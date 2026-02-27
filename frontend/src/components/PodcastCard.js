import React, { useState } from 'react';
import { Podcast, Loader2, Play, ChevronDown, ChevronUp, Clock, Calendar, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import PodcastEpisodeModal from './PodcastEpisodeModal';
import { useLocalData } from '../context/LocalDataContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatDuration = (seconds) => {
  if (!seconds) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const PodcastCard = ({ podcast }) => {
  const { isPodcastFavorite, togglePodcastFavorite } = useLocalData();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const isFavorite = isPodcastFavorite(podcast.id);

  const fetchEpisodes = async () => {
    if (episodes.length > 0) {
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/podcasts/${podcast.id}/episodes`, {
        params: { limit: 10 }
      });
      setEpisodes(response.data);
      setExpanded(true);
      if (response.data.length === 0) {
        toast.info('No episodes available');
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
      toast.error('Failed to load episodes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid={`podcast-card-${podcast.id}`}
      className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden"
    >
      {/* Podcast Header */}
      <div className="p-3 sm:p-4">
        <div className="flex gap-3">
          {/* Podcast Image */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            {podcast.image ? (
              <img
                src={podcast.image}
                alt={podcast.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`${podcast.image ? 'hidden' : 'flex'} w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 items-center justify-center`}
            >
              <Podcast className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          {/* Podcast Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate text-foreground hover:text-purple-400 transition-colors">
              {podcast.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
              {podcast.author}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs px-1.5 py-0 h-5 bg-purple-500/10 text-purple-400"
              >
                {podcast.episode_count} episodes
              </Badge>
              {podcast.categories && (
                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs px-1.5 py-0 h-5 border-white/10 text-muted-foreground capitalize"
                >
                  {podcast.categories}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Episodes Toggle Button */}
        <Button
          data-testid={`expand-episodes-${podcast.id}`}
          variant="ghost"
          size="sm"
          onClick={fetchEpisodes}
          disabled={loading}
          className="w-full mt-3 justify-between text-xs text-muted-foreground hover:text-foreground"
        >
          <span>{expanded ? 'Hide Episodes' : 'Show Episodes'}</span>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Episodes List */}
      {expanded && episodes.length > 0 && (
        <div className="border-t border-white/5 max-h-64 overflow-y-auto">
          {episodes.map((episode, index) => (
            <button
              key={episode.id}
              data-testid={`episode-${episode.id}`}
              onClick={() => setSelectedEpisode(episode)}
              className={`w-full p-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors ${
                index !== episodes.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              {/* Play Icon */}
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30">
                <Play className="w-3.5 h-3.5 text-purple-400 ml-0.5" />
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {episode.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  {episode.duration > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDuration(episode.duration)}
                    </span>
                  )}
                  {episode.published && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(episode.published)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Episode Player Modal */}
      <PodcastEpisodeModal
        episode={selectedEpisode}
        podcast={podcast}
        isOpen={!!selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
      />
    </div>
  );
};

export default PodcastCard;
