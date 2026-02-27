import React, { useState, useEffect, useCallback } from 'react';
import { AlarmClock, X, Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { usePlayer } from '../context/PlayerContext';
import { toast } from 'sonner';

const ALARM_KEY = 'globalradio_alarm';

const AlarmButton = ({ className = '' }) => {
  const { history, playStation } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [alarmTime, setAlarmTime] = useState('07:00');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [alarmTriggered, setAlarmTriggered] = useState(false);

  // Load alarm settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ALARM_KEY);
      if (saved) {
        const alarm = JSON.parse(saved);
        setAlarmTime(alarm.time || '07:00');
        setAlarmEnabled(alarm.enabled || false);
        setSelectedStation(alarm.station || null);
      }
    } catch (e) {
      console.error('Failed to load alarm:', e);
    }
  }, []);

  // Save alarm settings
  const saveAlarm = useCallback((time, enabled, station) => {
    try {
      localStorage.setItem(ALARM_KEY, JSON.stringify({
        time,
        enabled,
        station
      }));
    } catch (e) {
      console.error('Failed to save alarm:', e);
    }
  }, []);

  // Check alarm every minute
  useEffect(() => {
    if (!alarmEnabled || !selectedStation) return;

    const checkAlarm = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === alarmTime && !alarmTriggered) {
        setAlarmTriggered(true);
        playStation(selectedStation);
        toast.success(`⏰ Wake up! Playing ${selectedStation.name}`, {
          duration: 10000
        });
        
        // Request notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🌅 Wake Up Alarm!', {
            body: `Playing ${selectedStation.name}`,
            icon: selectedStation.favicon,
            requireInteraction: true
          });
        }
        
        // Reset triggered after 1 minute
        setTimeout(() => setAlarmTriggered(false), 60000);
      }
    };

    checkAlarm();
    const interval = setInterval(checkAlarm, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [alarmEnabled, alarmTime, selectedStation, alarmTriggered, playStation]);

  const handleSetAlarm = () => {
    if (!selectedStation) {
      toast.error('Please select a station first');
      return;
    }
    
    setAlarmEnabled(true);
    saveAlarm(alarmTime, true, selectedStation);
    setIsOpen(false);
    toast.success(`Alarm set for ${alarmTime}`);
  };

  const handleDisableAlarm = () => {
    setAlarmEnabled(false);
    saveAlarm(alarmTime, false, selectedStation);
    toast.info('Alarm disabled');
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={alarmEnabled ? "default" : "ghost"}
          size="icon"
          className={`${alarmEnabled ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'} h-8 w-8 sm:h-9 sm:w-9 ${className}`}
          title={alarmEnabled ? `Alarm: ${alarmTime}` : 'Set wake-up alarm'}
        >
          {alarmEnabled ? (
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <AlarmClock className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-secondary" />
            Wake-Up Alarm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Alarm Time */}
          <div className="space-y-2">
            <Label htmlFor="alarm-time">Wake-up Time</Label>
            <Input
              id="alarm-time"
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Station Selection */}
          <div className="space-y-2">
            <Label>Station to Play</Label>
            {history.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {history.slice(0, 6).map((station) => (
                  <Button
                    key={station.stationuuid}
                    variant={selectedStation?.stationuuid === station.stationuuid ? "default" : "outline"}
                    size="sm"
                    className={`justify-start text-left h-auto py-2 ${
                      selectedStation?.stationuuid === station.stationuuid 
                        ? 'bg-primary text-primary-foreground' 
                        : 'border-white/10'
                    }`}
                    onClick={() => handleStationSelect(station)}
                  >
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">{station.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{station.country}</div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Play some stations first to select one for your alarm.
              </p>
            )}
          </div>

          {/* Current Alarm Status */}
          {alarmEnabled && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <div>
                <p className="text-sm font-medium">Alarm Active</p>
                <p className="text-xs text-muted-foreground">
                  {alarmTime} - {selectedStation?.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisableAlarm}
                className="text-destructive hover:text-destructive"
              >
                <BellOff className="w-4 h-4 mr-1" />
                Disable
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSetAlarm}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              disabled={!selectedStation}
            >
              <AlarmClock className="w-4 h-4 mr-2" />
              Set Alarm
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Keep this tab open for the alarm to work
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlarmButton;
