import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError('Failed to load stream. The station may be offline.');
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const playStation = useCallback(async (station) => {
    const audio = audioRef.current;
    setError(null);
    setIsLoading(true);

    if (currentStation?.stationuuid === station.stationuuid && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    try {
      audio.pause();
      audio.src = station.url_resolved || station.url;
      setCurrentStation(station);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      setError('Failed to play stream');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentStation, isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentStation) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        setError('Failed to resume playback');
      });
      setIsPlaying(true);
    }
  }, [currentStation, isPlaying]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio.pause();
    audio.src = '';
    setCurrentStation(null);
    setIsPlaying(false);
    setError(null);
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
