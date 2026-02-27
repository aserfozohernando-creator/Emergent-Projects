import React, { useState } from 'react';
import { Moon, X, Timer } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { usePlayer } from '../context/PlayerContext';
import { useConfig } from '../context/ConfigContext';

const SleepTimerButton = ({ className = '' }) => {
  const { sleepTimer, sleepTimeRemaining, startSleepTimer, cancelSleepTimer } = usePlayer();
  const { getFeatureConfig } = useConfig();
  const [isOpen, setIsOpen] = useState(false);

  const timerConfig = getFeatureConfig('timer');
  
  // Check if sleep timer is enabled
  if (timerConfig?.sleep_timer_enabled === false) {
    return null;
  }

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer options from config or use defaults
  const configOptions = timerConfig?.sleep_timer_options || [5, 15, 30, 45, 60, 90];
  const timerOptions = configOptions.map(value => ({
    label: `${value} minutes`,
    value: value
  }));

  if (sleepTimer !== null && sleepTimeRemaining !== null) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={cancelSleepTimer}
        className={`border-secondary/50 text-secondary hover:bg-secondary/10 h-8 sm:h-9 px-2 sm:px-3 ${className}`}
      >
        <Timer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-secondary" />
        <span className="text-xs sm:text-sm font-mono">{formatTime(sleepTimeRemaining)}</span>
        <X className="w-3 h-3 ml-1 opacity-60 hover:opacity-100" />
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
          title="Sleep Timer"
        >
          <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border min-w-[140px]">
        <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
          <Timer className="w-3 h-3" />
          Sleep Timer
        </div>
        <DropdownMenuSeparator />
        {timerOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              startSleepTimer(option.value);
              setIsOpen(false);
            }}
            className="cursor-pointer text-foreground"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SleepTimerButton;
