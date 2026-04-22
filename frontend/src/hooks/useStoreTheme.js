import { useEffect } from 'react';

/**
 * Custom hook to dynamically apply a store's branding colors to the page.
 * @param {Object} store - The store object containing accentColor (Hex).
 */
export const useStoreTheme = (store) => {
  useEffect(() => {
    if (!store || !store.accentColor) {
      // If no store or color found, reset to UniVerse default
      resetTheme();
      return;
    }

    const hexToHsl = (hex) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
      } else if (hex.length === 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
      }
      r /= 255; g /= 255; b /= 255;
      let min = Math.min(r, g, b), max = Math.max(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: break;
        }
        h /= 6;
      }
      return [Math.round(h * 360), Math.round(s * 100) + '%', Math.round(l * 100) + '%'];
    };

    const applyTheme = () => {
      const [h, s, l] = hexToHsl(store.accentColor);
      document.documentElement.style.setProperty('--primary-h', h);
      document.documentElement.style.setProperty('--primary-s', s);
      document.documentElement.style.setProperty('--primary-l', l);
    };

    applyTheme();

    // Clean up or reset when leaving the store page
    return () => resetTheme();
  }, [store]);

  const resetTheme = () => {
    // Revert to UniVerse Signature Orange
    document.documentElement.style.setProperty('--primary-h', '9');
    document.documentElement.style.setProperty('--primary-s', '86%');
    document.documentElement.style.setProperty('--primary-l', '54%');
  };
};
