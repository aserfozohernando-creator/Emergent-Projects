import React from 'react';
import { Music2 } from 'lucide-react';

const genreImages = {
  jazz: 'https://images.unsplash.com/photo-1565557365511-aa80df3b4763?w=400&h=300&fit=crop',
  electronic: 'https://images.unsplash.com/photo-1574154894072-18ba0d48321b?w=400&h=300&fit=crop',
  classical: 'https://images.unsplash.com/photo-1519682886610-a78e3d518e1b?w=400&h=300&fit=crop',
  rock: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop',
  pop: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
  'hip hop': 'https://images.unsplash.com/photo-1571609806329-4a67d0ce23c7?w=400&h=300&fit=crop',
  country: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop',
  'r&b': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop',
  reggae: 'https://images.unsplash.com/photo-1529412188889-8be82bb86265?w=400&h=300&fit=crop',
  latin: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
  folk: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400&h=300&fit=crop',
  blues: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
  metal: 'https://images.unsplash.com/photo-1461784180009-27c963268b98?w=400&h=300&fit=crop',
  indie: 'https://images.unsplash.com/photo-1488376739361-ed24c9beb6d0?w=400&h=300&fit=crop',
  soul: 'https://images.unsplash.com/photo-1571609806329-4a67d0ce23c7?w=400&h=300&fit=crop',
  dance: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=300&fit=crop',
  ambient: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=300&fit=crop',
  world: 'https://images.unsplash.com/photo-1526394931762-90052e97b376?w=400&h=300&fit=crop',
  news: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=300&fit=crop',
  talk: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934- voices-in-ai?w=400&h=300&fit=crop'
};

const GenreCard = ({ genre, onClick }) => {
  const imageUrl = genreImages[genre.toLowerCase()] || genreImages.world;
  const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);

  return (
    <div 
      data-testid={`genre-card-${genre}`}
      onClick={() => onClick(genre)}
      className="relative h-32 md:h-40 rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-primary/30 transition-all"
    >
      {/* Background Image */}
      <img 
        src={imageUrl}
        alt={formattedGenre}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      
      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30" />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-primary" />
          <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors font-syne">
            {formattedGenre}
          </h3>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-primary/10" />
      </div>
    </div>
  );
};

export default GenreCard;
