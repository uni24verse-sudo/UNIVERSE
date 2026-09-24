import React, { createContext, useContext } from 'react';
import { useAudioPlayer } from 'expo-audio';

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  // Use expo-audio hooks
  const readyPlayer = useAudioPlayer(require('../../assets/order-ready.wav'));
  const completedPlayer = useAudioPlayer(require('../../assets/order-completed.wav'));
  const chimePlayer = useAudioPlayer(require('../../assets/chime.mp3'));

  const playReadySound = () => {
    try {
      if (readyPlayer) {
        readyPlayer.seekTo(0);
        readyPlayer.play();
      }
    } catch (err) {
      console.warn('Failed to play ready sound:', err);
    }
  };

  const playCompletedSound = () => {
    try {
      if (completedPlayer) {
        completedPlayer.seekTo(0);
        completedPlayer.play();
      }
    } catch (err) {
      console.warn('Failed to play completed sound:', err);
    }
  };

  const playChime = () => {
    try {
      if (chimePlayer) {
        chimePlayer.seekTo(0);
        chimePlayer.play();
      }
    } catch (err) {
      console.warn('Failed to play chime sound:', err);
    }
  };

  return (
    <SoundContext.Provider value={{
      playReadySound,
      playCompletedSound,
      playChime,
    }}>
      {children}
    </SoundContext.Provider>
  );
};
