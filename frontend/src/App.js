import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { PlayerProvider } from './context/PlayerContext';
import Navbar from './components/Navbar';
import AudioPlayer from './components/AudioPlayer';
import HomePage from './pages/HomePage';
import GenresPage from './pages/GenresPage';
import FavoritesPage from './pages/FavoritesPage';
import './App.css';

function App() {
  return (
    <PlayerProvider>
      <BrowserRouter>
        <div className="App min-h-screen bg-[#050505]">
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
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fafafa'
              }
            }}
          />
        </div>
      </BrowserRouter>
    </PlayerProvider>
  );
}

export default App;
