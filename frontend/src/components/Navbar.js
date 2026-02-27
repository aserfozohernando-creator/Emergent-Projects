import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Music2, Heart, Radio, Headphones, Download, Upload } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AlarmButton from './AlarmButton';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useLocalData } from '../context/LocalDataContext';
import { useConfig } from '../context/ConfigContext';

const Navbar = () => {
  const location = useLocation();
  const { exportData, importData } = useLocalData();
  const { isFeatureEnabled, getFeatureConfig } = useConfig();
  const fileInputRef = useRef(null);
  
  const isActive = (path) => location.pathname === path;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await importData(file);
      e.target.value = '';
    }
  };

  // Filter nav items based on config
  const allNavItems = [
    { path: '/', icon: Globe, label: 'Explore', feature: null },
    { path: '/genres', icon: Music2, label: 'Genres', feature: null },
    { path: '/podcasts', icon: Headphones, label: 'Podcasts', feature: 'podcasts' },
    { path: '/favorites', icon: Heart, label: 'Favorites', feature: 'favorites' }
  ];
  
  const navItems = allNavItems.filter(item => 
    !item.feature || isFeatureEnabled(item.feature)
  );
  
  const exportImportConfig = getFeatureConfig('export_import');
  const showExportImport = exportImportConfig?.enabled !== false && exportImportConfig?.show_in_navbar !== false;
  
  const timerConfig = getFeatureConfig('timer');
  const showAlarm = timerConfig?.wake_alarm_enabled !== false;
  
  const uiConfig = getFeatureConfig('ui');
  const showThemeToggle = uiConfig?.theme_toggle_enabled !== false;

  return (
    <nav data-testid="navbar" className="fixed top-0 left-0 right-0 h-14 sm:h-16 glass-heavy z-40 border-b border-white/10">
      <div className="container mx-auto h-full px-3 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
          <span className="font-syne font-bold text-sm sm:text-lg md:text-xl">
            <span className="text-primary">Global</span>
            <span className="text-foreground hidden xs:inline">Radio</span>
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase()}`}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm ${
                isActive(path)
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:block font-medium">{label}</span>
            </Link>
          ))}
          
          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
          
          {/* Export/Import Buttons */}
          {showExportImport && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="navbar-export-btn"
                      variant="ghost"
                      size="icon"
                      onClick={exportData}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export favorites backup</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="navbar-import-btn"
                      variant="ghost"
                      size="icon"
                      onClick={handleImportClick}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Import favorites backup</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
          
          {/* Alarm Button */}
          {showAlarm && <AlarmButton />}
          
          {/* Theme Toggle */}
          {showThemeToggle && <ThemeToggle />}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
