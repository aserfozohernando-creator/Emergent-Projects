import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Music2, Heart, Radio } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Globe, label: 'Explore' },
    { path: '/genres', icon: Music2, label: 'Genres' },
    { path: '/favorites', icon: Heart, label: 'Favorites' }
  ];

  return (
    <nav data-testid="navbar" className="fixed top-0 left-0 right-0 h-16 glass-heavy z-40 border-b border-white/10">
      <div className="container mx-auto h-full px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow">
            <Radio className="w-5 h-5 text-black" />
          </div>
          <span className="font-syne font-bold text-lg md:text-xl hidden sm:block">
            <span className="text-primary">Global</span>
            <span className="text-foreground">Radio</span>
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 md:gap-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase()}`}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all ${
                isActive(path)
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
