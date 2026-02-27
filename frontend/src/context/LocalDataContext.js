import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const LocalDataContext = createContext(null);

// LocalStorage keys
const FAVORITES_KEY = 'globalradio_favorites';
const PODCAST_FAVORITES_KEY = 'globalradio_podcast_favorites';
const STATION_LIVE_STATUS_KEY = 'globalradio_live_status';

export const useLocalData = () => {
  const context = useContext(LocalDataContext);
  if (!context) {
    throw new Error('useLocalData must be used within a LocalDataProvider');
  }
  return context;
};

export const LocalDataProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [podcastFavorites, setPodcastFavorites] = useState([]);
  const [stationLiveStatus, setStationLiveStatus] = useState({});
  const [isCheckingStations, setIsCheckingStations] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
      
      const savedPodcastFavorites = localStorage.getItem(PODCAST_FAVORITES_KEY);
      if (savedPodcastFavorites) {
        setPodcastFavorites(JSON.parse(savedPodcastFavorites));
      }
      
      const savedLiveStatus = localStorage.getItem(STATION_LIVE_STATUS_KEY);
      if (savedLiveStatus) {
        setStationLiveStatus(JSON.parse(savedLiveStatus));
      }
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
    }
  }, []);

  // Listen for live status updates from PlayerContext
  useEffect(() => {
    const handleLiveStatusUpdate = (event) => {
      const { stationId, isLive } = event.detail;
      setStationLiveStatus(prev => ({
        ...prev,
        [stationId]: { isLive, checkedAt: Date.now() }
      }));
    };

    window.addEventListener('stationLiveStatusUpdate', handleLiveStatusUpdate);
    return () => {
      window.removeEventListener('stationLiveStatusUpdate', handleLiveStatusUpdate);
    };
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }, []);

  // Save podcast favorites to localStorage
  const savePodcastFavorites = useCallback((newPodcastFavorites) => {
    try {
      localStorage.setItem(PODCAST_FAVORITES_KEY, JSON.stringify(newPodcastFavorites));
      setPodcastFavorites(newPodcastFavorites);
    } catch (e) {
      console.error('Failed to save podcast favorites:', e);
    }
  }, []);

  // Save live status to localStorage
  const saveLiveStatus = useCallback((newStatus) => {
    try {
      localStorage.setItem(STATION_LIVE_STATUS_KEY, JSON.stringify(newStatus));
      setStationLiveStatus(newStatus);
    } catch (e) {
      console.error('Failed to save live status:', e);
    }
  }, []);

  // Add station to favorites
  const addFavorite = useCallback((station) => {
    const exists = favorites.some(f => f.stationuuid === station.stationuuid);
    if (exists) {
      toast.info('Station already in favorites');
      return false;
    }
    
    const favoriteStation = {
      stationuuid: station.stationuuid,
      name: station.name,
      url: station.url_resolved || station.url,
      favicon: station.favicon || '',
      country: station.country || '',
      countrycode: station.countrycode || '',
      tags: station.tags || '',
      addedAt: new Date().toISOString()
    };
    
    const newFavorites = [favoriteStation, ...favorites];
    saveFavorites(newFavorites);
    toast.success('Added to favorites');
    return true;
  }, [favorites, saveFavorites]);

  // Remove station from favorites
  const removeFavorite = useCallback((stationuuid) => {
    const newFavorites = favorites.filter(f => f.stationuuid !== stationuuid);
    saveFavorites(newFavorites);
    toast.success('Removed from favorites');
  }, [favorites, saveFavorites]);

  // Toggle favorite
  const toggleFavorite = useCallback((station) => {
    const isFavorite = favorites.some(f => f.stationuuid === station.stationuuid);
    if (isFavorite) {
      removeFavorite(station.stationuuid);
    } else {
      addFavorite(station);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Check if station is favorite
  const isFavorite = useCallback((stationuuid) => {
    return favorites.some(f => f.stationuuid === stationuuid);
  }, [favorites]);

  // Add podcast to favorites
  const addPodcastFavorite = useCallback((podcast) => {
    const exists = podcastFavorites.some(p => p.id === podcast.id);
    if (exists) {
      toast.info('Podcast already in favorites');
      return false;
    }
    
    const favoritePodcast = {
      id: podcast.id,
      title: podcast.title,
      author: podcast.author || '',
      image: podcast.image || '',
      url: podcast.url || '',
      feed_url: podcast.feed_url || '',
      categories: podcast.categories || '',
      episode_count: podcast.episode_count || 0,
      addedAt: new Date().toISOString()
    };
    
    const newPodcastFavorites = [favoritePodcast, ...podcastFavorites];
    savePodcastFavorites(newPodcastFavorites);
    toast.success('Podcast added to favorites');
    return true;
  }, [podcastFavorites, savePodcastFavorites]);

  // Remove podcast from favorites
  const removePodcastFavorite = useCallback((podcastId) => {
    const newPodcastFavorites = podcastFavorites.filter(p => p.id !== podcastId);
    savePodcastFavorites(newPodcastFavorites);
    toast.success('Podcast removed from favorites');
  }, [podcastFavorites, savePodcastFavorites]);

  // Toggle podcast favorite
  const togglePodcastFavorite = useCallback((podcast) => {
    const isPodcastFavorite = podcastFavorites.some(p => p.id === podcast.id);
    if (isPodcastFavorite) {
      removePodcastFavorite(podcast.id);
    } else {
      addPodcastFavorite(podcast);
    }
  }, [podcastFavorites, addPodcastFavorite, removePodcastFavorite]);

  // Check if podcast is favorite
  const isPodcastFavorite = useCallback((podcastId) => {
    return podcastFavorites.some(p => p.id === podcastId);
  }, [podcastFavorites]);

  // Update live status for a station
  const updateLiveStatus = useCallback((stationuuid, isLive, checkedAt = Date.now()) => {
    setStationLiveStatus(prev => {
      const updated = {
        ...prev,
        [stationuuid]: { isLive, checkedAt }
      };
      localStorage.setItem(STATION_LIVE_STATUS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Batch update live status
  const batchUpdateLiveStatus = useCallback((statusUpdates) => {
    setStationLiveStatus(prev => {
      const updated = { ...prev, ...statusUpdates };
      localStorage.setItem(STATION_LIVE_STATUS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get live status for a station
  const getLiveStatus = useCallback((stationuuid) => {
    return stationLiveStatus[stationuuid] || null;
  }, [stationLiveStatus]);

  // Export all data as JSON
  const exportData = useCallback(() => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      favorites: favorites,
      podcastFavorites: podcastFavorites
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `globalradio_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  }, [favorites, podcastFavorites]);

  // Import data from JSON file
  const importData = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.version) {
            throw new Error('Invalid backup file format');
          }
          
          // Merge or replace favorites
          if (data.favorites && Array.isArray(data.favorites)) {
            const mergedFavorites = [...data.favorites];
            // Add existing favorites that aren't in the import
            favorites.forEach(f => {
              if (!mergedFavorites.some(mf => mf.stationuuid === f.stationuuid)) {
                mergedFavorites.push(f);
              }
            });
            saveFavorites(mergedFavorites);
          }
          
          // Merge or replace podcast favorites
          if (data.podcastFavorites && Array.isArray(data.podcastFavorites)) {
            const mergedPodcastFavorites = [...data.podcastFavorites];
            // Add existing podcast favorites that aren't in the import
            podcastFavorites.forEach(p => {
              if (!mergedPodcastFavorites.some(mp => mp.id === p.id)) {
                mergedPodcastFavorites.push(p);
              }
            });
            savePodcastFavorites(mergedPodcastFavorites);
          }
          
          toast.success(`Imported ${data.favorites?.length || 0} stations and ${data.podcastFavorites?.length || 0} podcasts`);
          resolve(data);
        } catch (error) {
          toast.error('Failed to import: Invalid file format');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file');
        reject(new Error('File read error'));
      };
      
      reader.readAsText(file);
    });
  }, [favorites, podcastFavorites, saveFavorites, savePodcastFavorites]);

  // Clear all local data
  const clearAllData = useCallback(() => {
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(PODCAST_FAVORITES_KEY);
    localStorage.removeItem(STATION_LIVE_STATUS_KEY);
    setFavorites([]);
    setPodcastFavorites([]);
    setStationLiveStatus({});
    toast.success('All local data cleared');
  }, []);

  const value = {
    // Favorites
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    
    // Podcast favorites
    podcastFavorites,
    addPodcastFavorite,
    removePodcastFavorite,
    togglePodcastFavorite,
    isPodcastFavorite,
    
    // Live status
    stationLiveStatus,
    updateLiveStatus,
    batchUpdateLiveStatus,
    getLiveStatus,
    isCheckingStations,
    setIsCheckingStations,
    
    // Export/Import
    exportData,
    importData,
    clearAllData
  };

  return (
    <LocalDataContext.Provider value={value}>
      {children}
    </LocalDataContext.Provider>
  );
};
