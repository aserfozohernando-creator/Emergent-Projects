import React, { useRef } from 'react';
import { Heart, Radio, Download, Upload, Trash2 } from 'lucide-react';
import StationCard from '../components/StationCard';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useLocalData } from '../context/LocalDataContext';

const FavoritesPage = () => {
  const { 
    favorites, 
    removeFavorite, 
    toggleFavorite,
    podcastFavorites,
    exportData,
    importData,
    clearAllData
  } = useLocalData();
  
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await importData(file);
      e.target.value = ''; // Reset input
    }
  };

  // Map favorites to station format for StationCard
  const favoritesAsStations = favorites.map(fav => ({
    stationuuid: fav.stationuuid,
    name: fav.name,
    url: fav.url,
    url_resolved: fav.url,
    favicon: fav.favicon,
    country: fav.country,
    countrycode: fav.countrycode,
    tags: fav.tags
  }));

  return (
    <div data-testid="favorites-page" className="min-h-screen pt-16 pb-32 md:pb-28">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-secondary fill-secondary" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-syne">My Favorites</h1>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Your saved radio stations • {favorites.length} station{favorites.length !== 1 ? 's' : ''} 
                {podcastFavorites.length > 0 && ` • ${podcastFavorites.length} podcast${podcastFavorites.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            
            {/* Export/Import buttons */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="export-data-btn"
                      variant="outline"
                      size="sm"
                      onClick={exportData}
                      className="h-8 px-3 text-xs border-white/10 hover:border-primary/50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export favorites as JSON backup</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="import-data-btn"
                      variant="outline"
                      size="sm"
                      onClick={handleImportClick}
                      className="h-8 px-3 text-xs border-white/10 hover:border-primary/50"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Import
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Import favorites from backup</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {(favorites.length > 0 || podcastFavorites.length > 0) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-testid="clear-all-btn"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
                            clearAllData();
                          }
                        }}
                        className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Clear All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all local data</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Info about local storage */}
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium">Local Storage:</span> Your favorites are saved in your browser. 
            Use Export to backup and Import to restore on other devices.
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)] sm:h-[calc(100vh-280px)]">
          <div className="p-1">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">No favorites yet</h3>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mb-4">
                  Start exploring and add your favorite radio stations by clicking the heart icon.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportClick}
                  className="border-white/10"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Backup
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {favoritesAsStations.map((station) => (
                  <StationCard
                    key={station.stationuuid}
                    station={station}
                    isFavorite={true}
                    onToggleFavorite={() => removeFavorite(station.stationuuid)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FavoritesPage;
