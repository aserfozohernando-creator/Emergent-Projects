import React, { useState } from 'react';
import { Shuffle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { usePlayer } from '../context/PlayerContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DiscoverButton = ({ className = '' }) => {
  const { playStation } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);

  const discoverRandomStation = async () => {
    setIsLoading(true);
    
    try {
      // Get random region
      const regions = ['europe', 'americas', 'asia', 'russia'];
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];
      
      // Fetch stations from that region
      const response = await axios.get(`${API}/stations/by-region/${randomRegion}`, {
        params: { limit: 100 }
      });
      
      if (response.data && response.data.length > 0) {
        // Pick a random station
        const randomStation = response.data[Math.floor(Math.random() * response.data.length)];
        toast.success(`Discovered: ${randomStation.name} from ${randomStation.country}`);
        playStation(randomStation);
      } else {
        toast.error('No stations found. Try again!');
      }
    } catch (error) {
      console.error('Discover error:', error);
      toast.error('Failed to discover station');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={discoverRandomStation}
      disabled={isLoading}
      variant="outline"
      className={`border-accent/50 text-accent hover:bg-accent/10 hover:text-accent ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Shuffle className="w-4 h-4 mr-2" />
      )}
      <span className="hidden sm:inline">Discover</span>
      <span className="sm:hidden">Random</span>
    </Button>
  );
};

export default DiscoverButton;
