import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { PlayerProvider } from './context/PlayerContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import AudioPlayer from './components/AudioPlayer';
import HomePage from './pages/HomePage';
import GenresPage from './pages/GenresPage';
import FavoritesPage from './pages/FavoritesPage';
import './App.css';

// Register service worker for PWA
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
};

const AppContent = () => {
  const { theme } = useTheme();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <BrowserRouter>
      <div className={`App min-h-screen ${theme === 'dark' ? 'bg-[#050505]' : 'bg-[#f8f8f8]'}`}>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/genres" element={<GenresPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
        <AudioPlayer />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              color: theme === 'dark' ? '#fafafa' : '#1a1a1a'
            }
          }}
        />
      </div>
    </BrowserRouter>
  );
};

function App() {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </ThemeProvider>
  );
}

export default App;
