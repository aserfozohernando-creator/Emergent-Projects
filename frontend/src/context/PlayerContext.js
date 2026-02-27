import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Hls from 'hls.js';

const PlayerContext = createContext(null);

// Local storage keys
const HISTORY_KEY = 'globalradio_history';
const HEALTH_KEY = 'globalradio_health';
const LIVE_STATUS_KEY = 'globalradio_live_status';

// Detect stream type from URL
const getStreamType = (url) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8')) return 'hls';
  if (lowerUrl.includes('.pls') || lowerUrl.includes('/listen.pls')) return 'pls';
  if (lowerUrl.includes('.m3u') && !lowerUrl.includes('.m3u8')) return 'm3u';
  if (lowerUrl.includes('.asx')) return 'asx';
  if (lowerUrl.includes('.ogg') || lowerUrl.includes('ogg')) return 'ogg';
  if (lowerUrl.includes('.opus')) return 'opus';
  if (lowerUrl.includes('.flac')) return 'flac';
  if (lowerUrl.includes('.aac') || lowerUrl.includes('aac')) return 'aac';
  if (lowerUrl.includes('.mp3') || lowerUrl.includes('mp3')) return 'mp3';
  return 'unknown';
};

// Check if browser can play a specific type natively
const canPlayNatively = (type) => {
  const audio = document.createElement('audio');
  const typeMap = {
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'opus': 'audio/opus',
    'flac': 'audio/flac',
    'wav': 'audio/wav',
    'webm': 'audio/webm'
  };
  
  if (typeMap[type]) {
    return audio.canPlayType(typeMap[type]) !== '';
  }
  return true; // Assume yes for unknown types
};

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
  const [history, setHistory] = useState([]);
  const [sleepTimer, setSleepTimer] = useState(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState(null);
  const [stationHealth, setStationHealth] = useState({});
  const [analyserData, setAnalyserData] = useState(new Uint8Array(32));
  
  const audioRef = useRef(new Audio());
  const hlsRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamCheckTimeoutRef = useRef(null);
  const stalledTimeoutRef = useRef(null);
  const hasReceivedDataRef = useRef(false);
  const sleepTimerRef = useRef(null);
  const sleepIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentStreamTypeRef = useRef('unknown');

  // Cleanup HLS instance
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Load history and health from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedHealth = localStorage.getItem(HEALTH_KEY);
      if (savedHealth) {
        setStationHealth(JSON.parse(savedHealth));
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, []);

  // Save health to localStorage
  const saveHealth = useCallback((newHealth) => {
    try {
      localStorage.setItem(HEALTH_KEY, JSON.stringify(newHealth));
    } catch (e) {
      console.error('Failed to save health:', e);
    }
  }, []);

  // Add station to history
  const addToHistory = useCallback((station) => {
    setHistory(prev => {
      const filtered = prev.filter(s => s.stationuuid !== station.stationuuid);
      const newHistory = [station, ...filtered].slice(0, 20);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // Update station health
  const updateStationHealth = useCallback((stationId, success) => {
    setStationHealth(prev => {
      const current = prev[stationId] || { success: 0, fail: 0 };
      const updated = {
        ...prev,
        [stationId]: {
          success: success ? current.success + 1 : current.success,
          fail: success ? current.fail : current.fail + 1,
          lastPlayed: Date.now()
        }
      };
      saveHealth(updated);
      return updated;
    });
    
    // Also update the live status in localStorage for the HomePage sorting
    try {
      const liveStatusStr = localStorage.getItem(LIVE_STATUS_KEY);
      const liveStatus = liveStatusStr ? JSON.parse(liveStatusStr) : {};
      liveStatus[stationId] = {
        isLive: success,
        checkedAt: Date.now()
      };
      localStorage.setItem(LIVE_STATUS_KEY, JSON.stringify(liveStatus));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('stationLiveStatusUpdate', {
        detail: { stationId, isLive: success }
      }));
    } catch (e) {
      console.error('Failed to update live status:', e);
    }
  }, [saveHealth]);

  // Get health status for a station
  const getStationHealthStatus = useCallback((stationId) => {
    const health = stationHealth[stationId];
    if (!health) return 'unknown';
    const total = health.success + health.fail;
    if (total < 2) return 'unknown';
    const rate = health.success / total;
    if (rate >= 0.8) return 'good';
    if (rate >= 0.5) return 'fair';
    return 'poor';
  }, [stationHealth]);

  // Setup audio analyser for visualizer
  const setupAudioAnalyser = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error('Failed to setup audio analyser:', e);
      }
    }
  }, []);

  // Update analyser data for visualizer
  const updateAnalyserData = useCallback(() => {
    if (analyserRef.current && isPlaying) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      setAnalyserData(data);
      animationFrameRef.current = requestAnimationFrame(updateAnalyserData);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && analyserRef.current) {
      updateAnalyserData();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateAnalyserData]);

  // Sleep timer functions
  const startSleepTimer = useCallback((minutes) => {
    // Clear existing timers first
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    
    // Set initial state
    setSleepTimer(minutes);
    setSleepTimeRemaining(minutes * 60);

    // Update countdown every second
    sleepIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSleepTimeRemaining(remaining);
      
      if (remaining <= 0) {
        if (sleepIntervalRef.current) {
          clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
        }
      }
    }, 1000);

    // Stop playback when timer ends
    sleepTimerRef.current = setTimeout(() => {
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setSleepTimer(null);
      setSleepTimeRemaining(null);
      
      // Clear interval if still running
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }
      
      toast.info('Sleep timer ended. Goodnight! 🌙');
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Sleep Timer', {
          body: 'Radio stopped. Goodnight! 🌙',
          silent: false
        });
      }
    }, durationMs);

    toast.success(`Sleep timer set for ${minutes} minutes`);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
    setSleepTimer(null);
    setSleepTimeRemaining(null);
    toast.info('Sleep timer cancelled');
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Show notification
  const showNotification = useCallback((title, body, icon) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon, silent: true });
    }
  }, []);

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
      
      if (currentStation) {
        updateStationHealth(currentStation.stationuuid, false);
      }
      
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
      
      if (currentStation) {
        updateStationHealth(currentStation.stationuuid, true);
      }
    };

    const handleStalled = () => {
      console.log('Stream stalled');
      // If stream stalls for more than 20 seconds, mark as offline
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      stalledTimeoutRef.current = setTimeout(() => {
        if (currentStation && !hasReceivedDataRef.current) {
          const errorMsg = 'Stream stalled. Station may be offline.';
          setError(errorMsg);
          setIsLoading(false);
          setIsPlaying(false);
          toast.error(errorMsg);
          updateStationHealth(currentStation.stationuuid, false);
        }
      }, 20000);
    };

    const handleSuspend = () => {
      console.log('Stream suspended');
    };

    const handleTimeUpdate = () => {
      hasReceivedDataRef.current = true;
      setError(null);
      // Clear stalled timeout when we receive data
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = null;
      }
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
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
      }
    };
  }, [currentStation, updateStationHealth]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (currentStation) togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          updateVolume(volume > 0 ? 0 : 0.7);
          break;
        case 'Escape':
          e.preventDefault();
          stop();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStation, isPlaying, volume]);

  const playStation = useCallback(async (station) => {
    const audio = audioRef.current;
    setError(null);
    setIsLoading(true);
    hasReceivedDataRef.current = false;

    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
    }

    if (currentStation?.stationuuid === station.stationuuid && isPlaying) {
      audio.pause();
      cleanupHls();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    try {
      // Stop current playback and cleanup
      audio.pause();
      cleanupHls();
      audio.src = '';
      
      const streamUrl = station.url_resolved || station.url;
      const streamType = getStreamType(streamUrl);
      currentStreamTypeRef.current = streamType;
      
      console.log(`Playing stream: ${streamUrl} (type: ${streamType})`);
      
      setCurrentStation(station);
      addToHistory(station);
      
      // Setup audio analyser on first play
      setupAudioAnalyser();
      
      // Timeout for streams that don't respond at all
      streamCheckTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedDataRef.current) {
          const errorMsg = 'Stream not responding. Try another station.';
          setError(errorMsg);
          setIsLoading(false);
          setIsPlaying(false);
          toast.error(errorMsg);
          audio.pause();
          cleanupHls();
          audio.src = '';
          updateStationHealth(station.stationuuid, false);
        }
      }, 20000); // 20 second timeout
      
      // Handle HLS streams
      if (streamType === 'hls') {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            startLevel: -1, // Auto quality selection
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            }
          });
          
          hlsRef.current = hls;
          
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('HLS: Media attached');
            hls.loadSource(streamUrl);
          });
          
          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            console.log('HLS: Manifest parsed');
            try {
              await audio.play();
              setIsPlaying(true);
              hasReceivedDataRef.current = true;
              toast.success(`Now playing: ${station.name}`);
              showNotification('Now Playing', station.name, station.favicon);
            } catch (e) {
              console.error('HLS play error:', e);
              setError('Failed to play HLS stream');
              setIsLoading(false);
            }
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('HLS: Network error, trying to recover');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('HLS: Media error, trying to recover');
                  hls.recoverMediaError();
                  break;
                default:
                  cleanupHls();
                  setError('HLS stream error. Try another station.');
                  setIsLoading(false);
                  setIsPlaying(false);
                  updateStationHealth(station.stationuuid, false);
                  break;
              }
            }
          });
          
          hls.attachMedia(audio);
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS support
          audio.src = streamUrl;
          audio.load();
          await audio.play();
          setIsPlaying(true);
          toast.success(`Now playing: ${station.name}`);
          showNotification('Now Playing', station.name, station.favicon);
        } else {
          throw new Error('HLS not supported in this browser');
        }
      } else {
        // Standard audio playback for other formats
        audio.src = streamUrl;
        audio.load();
        
        await audio.play();
        setIsPlaying(true);
        toast.success(`Now playing: ${station.name}`);
        showNotification('Now Playing', station.name, station.favicon);
      }
      
      // Setup Media Session API for background playback controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.country || 'Global Radio',
          album: station.tags?.split(',')[0] || 'Live Radio',
          artwork: station.favicon ? [
            { src: station.favicon, sizes: '96x96', type: 'image/png' },
            { src: station.favicon, sizes: '128x128', type: 'image/png' },
            { src: station.favicon, sizes: '256x256', type: 'image/png' },
          ] : []
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audio.play();
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          audio.pause();
          audio.src = '';
          setCurrentStation(null);
          setIsPlaying(false);
        });
      }
      
    } catch (err) {
      console.error('Play error:', err);
      const errorMsg = 'Failed to play stream. Station may be offline.';
      setError(errorMsg);
      setIsPlaying(false);
      toast.error(errorMsg);
      updateStationHealth(station.stationuuid, false);
    } finally {
      setIsLoading(false);
    }
  }, [currentStation, isPlaying, isLoading, addToHistory, setupAudioAnalyser, showNotification, updateStationHealth, cleanupHls]);

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
    cleanupHls();
    audio.src = '';
    setCurrentStation(null);
    setIsPlaying(false);
    setError(null);
    setIsLoading(false);
    hasReceivedDataRef.current = false;
    currentStreamTypeRef.current = 'unknown';
    
    if (streamCheckTimeoutRef.current) {
      clearTimeout(streamCheckTimeoutRef.current);
    }
  }, [cleanupHls]);

  const updateVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    audioRef.current.volume = clampedVolume;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success('History cleared');
  }, []);

  const value = {
    currentStation,
    isPlaying,
    isLoading,
    error,
    volume,
    history,
    sleepTimer,
    sleepTimeRemaining,
    analyserData,
    playStation,
    togglePlay,
    stop,
    updateVolume,
    setError,
    clearHistory,
    startSleepTimer,
    cancelSleepTimer,
    getStationHealthStatus,
    requestNotificationPermission
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
