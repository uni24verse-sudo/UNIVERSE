import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAudioAlerts = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const player = useAudioPlayer(require('../../assets/chime.mp3'));
  const pendingIntervalRef = useRef(null);
  const pendingCountRef = useRef(0);

  // Configure high-priority audio mode for loud, clear playback even in silent mode
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldDuckAndroid: true,
          staysActiveInBackground: true,
        });
      } catch (err) {
        console.log('Failed to configure audio mode:', err?.message || err);
      }
    };
    setupAudio();
  }, []);

  // Ensure player volume is at maximum 100% on load
  useEffect(() => {
    if (player) {
      try {
        player.volume = 1.0;
      } catch (e) {
        // ignore if not supported on platform
      }
    }
  }, [player]);

  // Load saved preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('universe_audio_enabled');
        if (saved !== null) {
          setIsAudioEnabled(saved === 'true');
        }
      } catch (err) {
        console.error('Failed to load audio preference', err);
      }
    };
    loadPreference();
  }, []);

  // Plays a single crisp, loud service bell ding
  const playSingleDing = useCallback(() => {
    if (!isAudioEnabled || !player) return;
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.log('Audio playback error:', err?.message || err);
    }
  }, [player, isAudioEnabled]);

  // Starts or stops the 10-second reminder loop based on pending orders count
  const syncPendingOrders = useCallback((count = 0) => {
    const prevCount = pendingCountRef.current;
    pendingCountRef.current = count;

    if (count > 0 && isAudioEnabled) {
      // If loop is not already running, ring immediately and repeat every 10 seconds
      if (!pendingIntervalRef.current) {
        playSingleDing();

        pendingIntervalRef.current = setInterval(() => {
          if (pendingCountRef.current > 0 && isAudioEnabled) {
            playSingleDing();
          } else {
            if (pendingIntervalRef.current) {
              clearInterval(pendingIntervalRef.current);
              pendingIntervalRef.current = null;
            }
          }
        }, 10000);
      } else if (count > prevCount) {
        // If a new order arrived while already pending, ring immediately
        playSingleDing();
      }
    } else {
      // 0 pending orders: stop the reminder loop immediately!
      if (pendingIntervalRef.current) {
        clearInterval(pendingIntervalRef.current);
        pendingIntervalRef.current = null;
      }
    }
  }, [playSingleDing, isAudioEnabled]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pendingIntervalRef.current) {
        clearInterval(pendingIntervalRef.current);
        pendingIntervalRef.current = null;
      }
    };
  }, []);

  const toggleAudio = useCallback(async () => {
    const newValue = !isAudioEnabled;
    setIsAudioEnabled(newValue);
    try {
      await AsyncStorage.setItem('universe_audio_enabled', String(newValue));
    } catch (err) {
      console.error('Failed to save audio preference', err);
    }
    
    if (!newValue) {
      if (player && player.playing) {
        player.pause();
      }
      if (pendingIntervalRef.current) {
        clearInterval(pendingIntervalRef.current);
        pendingIntervalRef.current = null;
      }
    } else {
      if (pendingCountRef.current > 0) {
        syncPendingOrders(pendingCountRef.current);
      }
    }
  }, [isAudioEnabled, player, syncPendingOrders]);

  // Backward-compatible stubs
  const queueAnnouncement = useCallback(() => {}, []);
  const cancelAnnouncement = useCallback(() => {}, []);
  const queuePreOrderReminder = useCallback(() => {
    playSingleDing();
  }, [playSingleDing]);

  // Test sound: plays 1 crisp ding
  const playTestSound = useCallback(async () => {
    try {
      if (!isAudioEnabled) {
        setIsAudioEnabled(true);
        await AsyncStorage.setItem('universe_audio_enabled', 'true');
      }
      playSingleDing();
    } catch (err) {
      console.log('Test sound playback error:', err?.message || err);
    }
  }, [playSingleDing, isAudioEnabled]);

  return { 
    isAudioEnabled, 
    toggleAudio, 
    playTestSound,
    syncPendingOrders,
    playSingleDing,
    queueAnnouncement, 
    cancelAnnouncement,
    queuePreOrderReminder
  };
};
