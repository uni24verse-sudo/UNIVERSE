import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAudioAlerts = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const player1 = useAudioPlayer(require('../../assets/chime.mp3'));
  const player2 = useAudioPlayer(require('../../assets/chime.mp3'));
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

  // Ensure player volumes are at maximum 100% on load
  useEffect(() => {
    try {
      if (player1) player1.volume = 1.0;
      if (player2) player2.volume = 1.0;
    } catch (e) {
      // ignore if not supported on platform
    }
  }, [player1, player2]);

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

  // Plays a crisp, urgent restaurant POS double-ding (ding.ding)
  const playDoubleDing = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      if (player1) {
        player1.volume = 1.0;
        player1.seekTo(0);
        player1.play();
      }

      // Second ding ~250ms later for the classic "ding.ding" double chime
      setTimeout(() => {
        if (!isAudioEnabled) return;
        try {
          if (player2) {
            player2.volume = 1.0;
            player2.seekTo(0);
            player2.play();
          }
        } catch (e) {
          console.log('Second chime error:', e?.message || e);
        }
      }, 250);
    } catch (err) {
      console.log('Audio playback error:', err?.message || err);
    }
  }, [player1, player2, isAudioEnabled]);

  const [voiceAlertMode, setVoiceAlertMode] = useState('male'); // 'male' or 'chime_only'

  // Load saved voice mode preference
  useEffect(() => {
    AsyncStorage.getItem('universe_voice_mode').then((mode) => {
      if (mode) setVoiceAlertMode(mode);
    }).catch(() => {});
  }, []);

  const updateVoiceAlertMode = useCallback(async (newMode) => {
    setVoiceAlertMode(newMode);
    try {
      await AsyncStorage.setItem('universe_voice_mode', newMode);
    } catch (e) {}
  }, []);

  // Voice announcement synthesis with cross-platform fallback - strictly male voice
  const speakAnnouncement = useCallback(async (text) => {
    if (!isAudioEnabled || !text || voiceAlertMode === 'chime_only') return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.90;
        utterance.pitch = 0.82; // Deep, confident masculine baritone

        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(v => 
          (v.lang.includes('en') || v.lang.includes('hi')) && 
          (v.name.toLowerCase().includes('male') || 
           v.name.toLowerCase().includes('david') || 
           v.name.toLowerCase().includes('guy') || 
           v.name.toLowerCase().includes('george') || 
           v.name.toLowerCase().includes('ravi') || 
           v.name.toLowerCase().includes('prabhat'))
        );
        if (maleVoice) utterance.voice = maleVoice;

        window.speechSynthesis.speak(utterance);
      } else if (Speech && typeof Speech.speak === 'function') {
        Speech.stop();
        
        let targetVoiceId = null;
        try {
          const availableVoices = await Speech.getAvailableVoicesAsync();
          if (Array.isArray(availableVoices) && availableVoices.length > 0) {
            // Find male voice
            const male = availableVoices.find(v => {
              const str = `${v.name || ''} ${v.identifier || ''}`.toLowerCase();
              return (
                str.includes('male') || 
                str.includes('en-in-x-ahp') || 
                str.includes('en-in-x-end') || 
                str.includes('en-in-x-cxx') ||
                str.includes('david') ||
                str.includes('guy') ||
                str.includes('rishi') ||
                str.includes('prabhat')
              );
            });
            if (male) targetVoiceId = male.identifier;
          }
        } catch (voiceErr) {
          // fallback to pitch adjustment
        }

        Speech.speak(text, {
          language: 'en-IN',
          voice: targetVoiceId || undefined,
          pitch: 0.80, // Low masculine pitch (avoids default female voice tone)
          rate: 0.90,
        });
      }
    } catch (err) {
      console.log('[useAudioAlerts] Speech error:', err?.message || err);
    }
  }, [isAudioEnabled, voiceAlertMode]);

  // Crisp chime followed by voice announcement for specific store order
  const speakOrderAlert = useCallback((storeName, orderNumber) => {
    if (!isAudioEnabled) return;
    playDoubleDing();

    // If user prefers only chime sound without spoken voice, stop after chime
    if (voiceAlertMode === 'chime_only') return;

    setTimeout(() => {
      const storePhrase = storeName ? `for ${storeName}` : '';
      const orderPhrase = orderNumber ? `Order number ${orderNumber}` : '';
      const fullText = `New order received ${storePhrase}. ${orderPhrase}`.replace(/\s+/g, ' ').trim();
      speakAnnouncement(fullText);
    }, 450);
  }, [isAudioEnabled, playDoubleDing, speakAnnouncement, voiceAlertMode]);

  // Starts or stops the reminder loop based on pending orders count
  const syncPendingOrders = useCallback((count = 0) => {
    const prevCount = pendingCountRef.current;
    pendingCountRef.current = count;

    if (count > 0 && isAudioEnabled) {
      // If loop is not already running, ring immediately with ding.ding and repeat every 6 seconds
      if (!pendingIntervalRef.current) {
        playDoubleDing();

        pendingIntervalRef.current = setInterval(() => {
          if (pendingCountRef.current > 0 && isAudioEnabled) {
            playDoubleDing();
          } else {
            if (pendingIntervalRef.current) {
              clearInterval(pendingIntervalRef.current);
              pendingIntervalRef.current = null;
            }
          }
        }, 6500); // 6.5s interval for: ding.ding ........... ding.ding ..........
      } else if (count > prevCount) {
        // If a new order arrived while already pending, ring immediately with double-ding
        playDoubleDing();
      }
    } else {
      // 0 pending orders: stop the reminder loop immediately!
      if (pendingIntervalRef.current) {
        clearInterval(pendingIntervalRef.current);
        pendingIntervalRef.current = null;
      }
    }
  }, [playDoubleDing, isAudioEnabled]);

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
      if (player1 && player1.playing) player1.pause();
      if (player2 && player2.playing) player2.pause();
      if (pendingIntervalRef.current) {
        clearInterval(pendingIntervalRef.current);
        pendingIntervalRef.current = null;
      }
    } else {
      if (pendingCountRef.current > 0) {
        syncPendingOrders(pendingCountRef.current);
      }
    }
  }, [isAudioEnabled, player1, player2, syncPendingOrders]);

  // Backward-compatible stubs
  const queueAnnouncement = useCallback(() => {}, []);
  const cancelAnnouncement = useCallback(() => {}, []);
  const queuePreOrderReminder = useCallback(() => {
    playDoubleDing();
  }, [playDoubleDing]);

  // Test sound: plays the new crisp double-ding (ding.ding) and brief test speech
  const playTestSound = useCallback(async () => {
    try {
      if (!isAudioEnabled) {
        setIsAudioEnabled(true);
        await AsyncStorage.setItem('universe_audio_enabled', 'true');
      }
      playDoubleDing();
      setTimeout(() => {
        speakAnnouncement('UniVerse audio alerts are active');
      }, 500);
    } catch (err) {
      console.log('Test sound playback error:', err?.message || err);
    }
  }, [playDoubleDing, isAudioEnabled, speakAnnouncement]);

  return { 
    isAudioEnabled, 
    toggleAudio, 
    playTestSound,
    syncPendingOrders,
    playDoubleDing,
    playSingleDing: playDoubleDing, // aliased for backwards compatibility
    queueAnnouncement, 
    cancelAnnouncement,
    queuePreOrderReminder,
    voiceAlertMode,
    updateVoiceAlertMode,
    speakAnnouncement,
    speakOrderAlert
  };
};
