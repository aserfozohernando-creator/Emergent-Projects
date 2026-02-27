import React from 'react';
import { usePlayer } from '../context/PlayerContext';

const AudioVisualizer = ({ className = '', barCount = 16 }) => {
  const { analyserData, isPlaying } = usePlayer();

  // Normalize and sample the analyser data
  const bars = [];
  const step = Math.floor(analyserData.length / barCount);
  
  for (let i = 0; i < barCount; i++) {
    const value = analyserData[i * step] || 0;
    const height = Math.max(4, (value / 255) * 100);
    bars.push(height);
  }

  if (!isPlaying) {
    return (
      <div className={`flex items-end justify-center gap-[2px] h-8 ${className}`}>
        {[...Array(barCount)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-primary/30 rounded-full transition-all duration-300"
            style={{ height: '4px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-end justify-center gap-[2px] h-8 ${className}`}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-primary to-accent rounded-full transition-all duration-75"
          style={{ 
            height: `${height}%`,
            opacity: 0.5 + (height / 200)
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
