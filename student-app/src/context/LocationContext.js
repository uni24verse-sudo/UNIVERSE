import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load saved location on startup
  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const [savedId, savedName, savedType, savedDietary] = await Promise.all([
          AsyncStorage.getItem('universe_location_id'),
          AsyncStorage.getItem('universe_location_name'),
          AsyncStorage.getItem('universe_location_type'),
          AsyncStorage.getItem('universe_location_dietary_type'),
        ]);

        if (savedId) {
          const isLpu = (savedName || '').toLowerCase().includes('lpu') || (savedName || '').toLowerCase().includes('lovely');
          setCurrentLocation({
            _id: savedId,
            id: savedId,
            name: savedName || 'Campus Hub',
            type: savedType || 'College',
            dietaryType: savedDietary || (isLpu ? 'veg' : 'both'),
          });
        }
      } catch (err) {
        console.error('Failed to load saved location:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSavedLocation();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await apiClient.get('/super-admin/locations/public');
      setLocations(res.data || []);
      
      // If we have a saved ID, match it with full location details
      const savedId = await AsyncStorage.getItem('universe_location_id');
      if (Array.isArray(res.data) && res.data.length > 0) {
        let matched = null;
        if (savedId) {
          matched = res.data.find(l => (l._id || l.id) === savedId);
        }
        if (!matched) {
          // Fallback to LPU or first available location matching webapp behavior
          matched = res.data.find(l => (l.name || '').toLowerCase().includes('lovely') || (l.name || '').toLowerCase().includes('lpu')) || res.data[0];
          if (matched) {
            await selectLocation(matched);
          }
        } else {
          setCurrentLocation(matched);
          if (matched.dietaryType) {
            await AsyncStorage.setItem('universe_location_dietary_type', matched.dietaryType);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch public locations:', err);
    }
  };

  const selectLocation = async (location) => {
    try {
      const locId = location._id || location.id;
      const isLpu = (location.name || '').toLowerCase().includes('lpu') || (location.name || '').toLowerCase().includes('lovely');
      const dietary = location.dietaryType || (isLpu ? 'veg' : 'both');
      const hubType = location.type || 'College';

      await Promise.all([
        AsyncStorage.setItem('universe_location_id', locId),
        AsyncStorage.setItem('universe_location_name', location.name || ''),
        AsyncStorage.setItem('universe_location_type', hubType),
        AsyncStorage.setItem('universe_location_dietary_type', dietary),
      ]);
      setCurrentLocation({
        ...location,
        type: hubType,
        dietaryType: dietary,
      });
    } catch (err) {
      console.error('Failed to save selected location:', err);
    }
  };

  const clearLocation = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('universe_location_id'),
        AsyncStorage.removeItem('universe_location_name'),
        AsyncStorage.removeItem('universe_location_type'),
        AsyncStorage.removeItem('universe_location_dietary_type'),
      ]);
      setCurrentLocation(null);
    } catch (err) {
      console.error('Failed to clear location:', err);
    }
  };

  const hubType = currentLocation?.type || 'College';

  return (
    <LocationContext.Provider value={{
      currentLocation,
      hubType,
      locations,
      loading,
      selectLocation,
      clearLocation,
      refreshLocations: fetchLocations,
    }}>
      {children}
    </LocationContext.Provider>
  );
};
