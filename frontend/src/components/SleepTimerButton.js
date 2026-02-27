import React, { useState } from 'react';
import { Moon, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { usePlayer } from '../context/PlayerContext';

const SleepTimerButton = ({ className = '' }) => {
  const { sleepTimer, sleepTimeRemaining, startSleepTimer, cancelSleepTimer } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 },
  ];

  if (sleepTimer) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={cancelSleepTimer}
        className={`border-secondary/50 text-secondary hover:bg-secondary/10 ${className}`}
      >
        <Moon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-current" />
        <span className="text-xs sm:text-sm">{formatTime(sleepTimeRemaining)}</span>
        <X className="w-3 h-3 ml-1" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 ${className}`}
        >
          <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Sleep Timer</div>
        {timerOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              startSleepTimer(option.value);
              setIsOpen(false);
            }}
            className="cursor-pointer"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SleepTimerButton;
