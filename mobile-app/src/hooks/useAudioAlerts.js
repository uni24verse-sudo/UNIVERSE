import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAudioAlerts = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const player = useAudioPlayer(require('../../assets/chime.mp3'));
  const queue = useRef([]);
  const isPlaying = useRef(false);

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

  const toggleAudio = useCallback(async () => {
    const newValue = !isAudioEnabled;
    setIsAudioEnabled(newValue);
    try {
      await AsyncStorage.setItem('universe_audio_enabled', String(newValue));
    } catch (err) {
      console.error('Failed to save audio preference', err);
    }
    
    // If we just turned it off, stop anything currently playing
    if (!newValue) {
      Speech.stop();
      if (player && player.playing) {
        player.pause();
      }
      queue.current = [];
      isPlaying.current = false;
    }
  }, [isAudioEnabled, player]);

  const processQueue = useCallback(async () => {
    if (isPlaying.current || queue.current.length === 0 || !isAudioEnabled) return;
    
    isPlaying.current = true;
    const order = queue.current[0];
    
    try {
      // 1. Play Chime
      if (player) {
         player.seekTo(0);
         player.play();
         // Wait 1.5s for the short chime to finish before speaking
         await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Re-check enabled state in case they toggled it during the chime
      if (!isAudioEnabled) {
          throw new Error('Audio disabled during playback');
      }

      // 2. Play TTS
      const orderIdDisplay = order.orderNumber || order.id || order._id?.slice(-4) || 'unknown';
      const itemCount = order.items?.length || 'some';
      
      let orderTypeStr = order.orderType ? order.orderType.toLowerCase() : 'universe';
      let preOrderStr = '';
      if (order.isPreOrder && order.scheduledTime) {
        // Example: scheduledTime could be "15:30" or "03:30 PM". We'll just read it as is.
        preOrderStr = `scheduled for ${order.scheduledTime}`;
      }
      
      let text;
      if (preOrderStr) {
         text = `New pre-order ${preOrderStr}. ${itemCount} items. Order ${orderIdDisplay}.`;
      } else {
         text = `New ${orderTypeStr} order. ${itemCount} items. Order ${orderIdDisplay}.`;
      }
      
      await new Promise(resolve => {
        Speech.speak(text, {
           onDone: resolve,
           onError: resolve,
           onStopped: resolve,
           rate: 0.9, // Slightly slower for clarity
        });
      });
      
    } catch(err) {
      console.log('Audio playback skipped/errored:', err.message || err);
    } finally {
      // Remove the finished/skipped order from the queue
      queue.current.shift();
      isPlaying.current = false;
      
      // Process next if any
      if (queue.current.length > 0) {
        processQueue();
      }
    }
  }, [player, isAudioEnabled]);
  
  const queueAnnouncement = useCallback((order) => {
    if (!isAudioEnabled) return;
    // Avoid duplicates in queue
    if (!queue.current.find(o => o._id === order._id)) {
      queue.current.push(order);
      processQueue();
    }
  }, [isAudioEnabled, processQueue]);

  const cancelAnnouncement = useCallback((orderId) => {
    // If it's currently speaking the FIRST item and it's the one we're canceling:
    if (queue.current.length > 0 && queue.current[0]._id === orderId) {
       Speech.stop(); // This triggers onStopped, which resolves the promise and shifts the queue
    } else {
       // If it's pending further back in the queue, just remove it silently
       queue.current = queue.current.filter(o => o._id !== orderId);
    }
  }, []);

  return { 
    isAudioEnabled, 
    toggleAudio, 
    queueAnnouncement, 
    cancelAnnouncement 
  };
};
