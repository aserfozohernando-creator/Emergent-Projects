import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ConfigContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default config in case backend is unavailable
const DEFAULT_CONFIG = {
  features: {
    favorites: { enabled: true, max_stations: 50, max_podcasts: 25 },
    podcasts: { enabled: true, allow_playback: true, max_episodes_display: 10 },
    timer: { sleep_timer_enabled: true, wake_alarm_enabled: true, sleep_timer_options: [5, 10, 15, 30, 60], default_sleep_minutes: 30 },
    playback: { auto_play_on_select: true, show_visualizer: true, show_health_indicator: true, background_health_check: true },
    ui: { show_world_map: true, show_similar_stations: true, show_recently_played: true, show_shuffle_button: true, dark_mode_default: true, theme_toggle_enabled: true },
    export_import: { enabled: true, show_in_navbar: true },
    search: { enabled: true, show_discover_button: true, max_results: 50 },
    regions: { enabled_regions: ['europe', 'americas', 'asia', 'russia', 'africa', 'oceania'], enabled_countries: ['PL', 'HU'], show_region_buttons: true }
  },
  limits: { stations_per_page: 30, health_check_timeout_seconds: 12, playback_timeout_seconds: 15, max_history_items: 20 },
  messages: {
    favorites_limit_reached: "You've reached the maximum number of favorites ({max}). Remove some to add more.",
    podcasts_disabled: "Podcast feature is currently disabled.",
    timer_disabled: "Timer feature is currently disabled."
  }
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch config from backend
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setError('Failed to load configuration');
      // Keep using default config
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Helper to get nested config value by path
  const getConfigValue = useCallback((path, defaultValue = null) => {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current ?? defaultValue;
  }, [config]);

  // Feature flags helpers
  const isFeatureEnabled = useCallback((featurePath) => {
    // Handle simple paths like "podcasts" or full paths like "features.podcasts.enabled"
    if (!featurePath.includes('.')) {
      return getConfigValue(`features.${featurePath}.enabled`, true);
    }
    return getConfigValue(featurePath, true);
  }, [getConfigValue]);

  // Get feature config
  const getFeatureConfig = useCallback((featureName) => {
    return getConfigValue(`features.${featureName}`, {});
  }, [getConfigValue]);

  // Get limit value
  const getLimit = useCallback((limitName) => {
    return getConfigValue(`limits.${limitName}`, null);
  }, [getConfigValue]);

  // Get message with variable substitution
  const getMessage = useCallback((messageName, variables = {}) => {
    let message = getConfigValue(`messages.${messageName}`, '');
    
    // Replace variables like {max} with actual values
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    return message;
  }, [getConfigValue]);

  // Check if favorites limit reached
  const canAddFavorite = useCallback((currentCount, type = 'stations') => {
    const maxKey = type === 'stations' ? 'max_stations' : 'max_podcasts';
    const max = getConfigValue(`features.favorites.${maxKey}`, Infinity);
    return currentCount < max;
  }, [getConfigValue]);

  // Get max favorites
  const getMaxFavorites = useCallback((type = 'stations') => {
    const maxKey = type === 'stations' ? 'max_stations' : 'max_podcasts';
    return getConfigValue(`features.favorites.${maxKey}`, 50);
  }, [getConfigValue]);

  const value = {
    config,
    loading,
    error,
    refetch: fetchConfig,
    
    // Helpers
    getConfigValue,
    isFeatureEnabled,
    getFeatureConfig,
    getLimit,
    getMessage,
    canAddFavorite,
    getMaxFavorites,
    
    // Quick access to common features
    features: {
      favorites: getConfigValue('features.favorites', {}),
      podcasts: getConfigValue('features.podcasts', {}),
      timer: getConfigValue('features.timer', {}),
      playback: getConfigValue('features.playback', {}),
      ui: getConfigValue('features.ui', {}),
      exportImport: getConfigValue('features.export_import', {}),
      search: getConfigValue('features.search', {}),
      regions: getConfigValue('features.regions', {})
    }
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
