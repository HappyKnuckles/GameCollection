import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * Seconds counter for a game. It only ticks while `active` is true, the
 * game's tab is focused and the app is in the foreground, so switching to
 * another game or backgrounding the app pauses the clock.
 */
export const useGameTimer = (active: boolean) => {
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  const running = active && isFocused && appActive;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      timeRef.current += 1;
      setTime(timeRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const resetTime = useCallback(() => {
    timeRef.current = 0;
    setTime(0);
  }, []);

  return { time, timeRef, resetTime };
};

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};
