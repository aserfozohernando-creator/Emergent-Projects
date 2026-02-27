import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';

const AudioVisualizer = ({ className = '', barCount = 24, size = 'normal' }) => {
  const { analyserData, isPlaying } = usePlayer();
  const [animatedBars, setAnimatedBars] = useState(new Array(barCount).fill(4));

  // Create smooth animation even when analyser data isn't available
  useEffect(() => {
    if (!isPlaying) {
      setAnimatedBars(new Array(barCount).fill(4));
      return;
    }

    const animationInterval = setInterval(() => {
      const newBars = [];
      const step = Math.floor(analyserData.length / barCount);
      
      for (let i = 0; i < barCount; i++) {
        const value = analyserData[i * step] || 0;
        // Add some randomness for more dynamic feel
        const randomFactor = 0.8 + Math.random() * 0.4;
        const height = Math.max(8, (value / 255) * 100 * randomFactor);
        newBars.push(height);
      }
      
      setAnimatedBars(newBars);
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(animationInterval);
  }, [isPlaying, analyserData, barCount]);

  const barWidth = size === 'small' ? 'w-0.5' : 'w-1';
  const containerHeight = size === 'small' ? 'h-6' : 'h-10';
  const gap = size === 'small' ? 'gap-[1px]' : 'gap-[2px]';

  return (
    <div className={`flex items-center justify-center ${gap} ${containerHeight} ${className}`}>
      {animatedBars.map((height, i) => {
        // Create wave effect - bars in the middle are taller
        const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2) * 0.3;
        const adjustedHeight = isPlaying ? height * centerFactor : 4;
        
        return (
          <div
            key={i}
            className={`${barWidth} rounded-full transition-all duration-75 ease-out ${
              isPlaying 
                ? 'bg-gradient-to-t from-primary via-primary to-accent' 
                : 'bg-primary/30'
            }`}
            style={{ 
              height: `${adjustedHeight}%`,
              opacity: isPlaying ? 0.6 + (adjustedHeight / 250) : 0.3,
              transform: isPlaying ? `scaleY(${0.8 + Math.random() * 0.4})` : 'scaleY(1)',
              animationDelay: `${i * 20}ms`
            }}
          />
        );
      })}
    </div>
  );
};

export default AudioVisualizer;
