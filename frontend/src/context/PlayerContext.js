import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(new Audio());
  const streamCheckTimeoutRef = useRef(null);
  const hasReceivedDataRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;
    audio.crossOrigin = "anonymous";

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      const errorMsg = 'Stream unavailable. Try another station.';
      setError(errorMsg);
      toast.error(errorMsg);
      
      // Clear timeout
      if (streamCheckTimeoutRef.current) {
        clearTimeout(streamCheckTimeoutRef.current);
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      hasReceivedDataRef.current = true;
    };

    const handleStalled = () => {
      console.log('Stream stalled');
      // Don't immediately error - give it a chance to recover
    };

    const handleSuspend = () => {
      // Stream was suspended (could be normal or an issue)
      console.log('Stream suspended');
    };

    const handleTimeUpdate = () => {
      // We're receiving data, stream is working
      hasReceivedDataRef.current = true;
      setError(null);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      hasReceivedDataRef.current = false;
    };

    const handleAbort = () => {
      setIsLoading(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('abort', handleAbort);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('abort', handleAbort);
      
      if (streamCheckTimeoutRef.current) {
        clearTimeout(streamCheckTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const playStation = useCallback(async (station) => {
    const audio = audioRef.current;
    setError(null);
    setIsLoading(true);
    hasReceivedDataRef.current = false;

    // Clear any existing timeout
    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
    }

    // If clicking the same station that's playing, pause it
    if (currentStation?.stationuuid === station.stationuuid && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    try {
      // Stop current playback
      audio.pause();
      audio.src = '';
      
      // Try url_resolved first, then fall back to url
      const streamUrl = station.url_resolved || station.url;
      
      // Set new source
      audio.src = streamUrl;
      audio.load();
      setCurrentStation(station);
      
      // Set a timeout to check if stream is actually working
      streamCheckTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedDataRef.current && isLoading) {
          const errorMsg = 'Stream not responding. Try another station.';
          setError(errorMsg);
          setIsLoading(false);
          setIsPlaying(false);
          toast.error(errorMsg);
          audio.pause();
          audio.src = '';
        }
      }, 10000); // 10 second timeout
      
      await audio.play();
      setIsPlaying(true);
      toast.success(`Now playing: ${station.name}`);
      
    } catch (err) {
      console.error('Play error:', err);
      const errorMsg = 'Failed to play stream. Station may be offline.';
      setError(errorMsg);
      setIsPlaying(false);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [currentStation, isPlaying, isLoading]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentStation) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Resume error:', err);
          setError('Failed to resume playback');
          setIsLoading(false);
          toast.error('Failed to resume playback');
        });
    }
  }, [currentStation, isPlaying]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = '';
    setCurrentStation(null);
    setIsPlaying(false);
    setError(null);
    setIsLoading(false);
    hasReceivedDataRef.current = false;
    
    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
    }
  }, []);

  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  }, []);

  const value = {
    currentStation,
    isPlaying,
    isLoading,
    error,
    volume,
    playStation,
    togglePlay,
    stop,
    updateVolume,
    setError
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
