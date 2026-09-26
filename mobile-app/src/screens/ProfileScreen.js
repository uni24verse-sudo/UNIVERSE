import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  TextInput,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';
import * as SecureStore from 'expo-secure-store';
import { useAudioAlerts } from '../hooks/useAudioAlerts';

const getStorageItem = async (key) => {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return null;
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_CAMPUS_LOCATIONS = [
  {
    id: '69e7913ddcad79aeb3f8ce23',
    name: 'Lovely Professional University',
    type: 'College',
    city: 'Phagwara',
    markets: 'BH1 Market, Block34 Market, LIT Market, Mall Market, BH6 Market, Apartment Market',
  },
  {
    id: '69e7a49ce6811d655c964f1b',
    name: 'LAW GATE',
    type: 'External',
    city: 'Phagwara',
    markets: 'LAW GATE',
  },
  {
    id: 'b5c86748-913d-404e-a2ce-10c5e7f87960',
    name: 'Chandigarh University',
    type: 'College',
    city: 'Chandhigarh',
    markets: 'Test, Test2',
  },
];

const DEFAULT_LPU_MARKETS = [
  'BH1 Market',
  'Block34 Market',
  'LIT Market',
  'Mall Market',
  'BH6 Market',
  'Apartment Market',
];

const getMarketsForLocation = (locationObj) => {
  if (!locationObj) return DEFAULT_LPU_MARKETS;
  if (locationObj.markets && typeof locationObj.markets === 'string' && locationObj.markets.trim()) {
    const list = locationObj.markets.split(',').map((m) => m.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return [locationObj.name || 'Campus Market'];
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser, stores, activeStore, switchActiveStore, refreshStores } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { isAudioEnabled, toggleAudio, playTestSound } = useAudioAlerts();
  const isFocused = useIsFocused();
  const [store, setStore] = useState(activeStore || null);
  const [employees, setEmployees] = useState([]);
  const [allLocations, setAllLocations] = useState(DEFAULT_CAMPUS_LOCATIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Modals
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [storeFormData, setStoreFormData] = useState({ name: '', category: '', market: '', locationId: '' });
  const [savingStore, setSavingStore] = useState(false);

  // Multi-stall Creation Modal State
  const [showAddStallModal, setShowAddStallModal] = useState(false);
  const [newStallFormData, setNewStallFormData] = useState({
    name: '',
    category: 'Fast Food',
    locationId: '69e7913ddcad79aeb3f8ce23',
    market: 'BH1 Market',
    upiId: ''
  });
  const [creatingStall, setCreatingStall] = useState(false);

  // Automated Stall Timing State
  const [showEditTimingModal, setShowEditTimingModal] = useState(false);
  const [timingFormData, setTimingFormData] = useState({
    isAutomated: false,
    openingTime: '10:00',
    closingTime: '22:00',
  });
  const [savingTiming, setSavingTiming] = useState(false);
  const [togglingAutoSchedule, setTogglingAutoSchedule] = useState(false);

  const [showEditOwnerModal, setShowEditOwnerModal] = useState(false);
  const [ownerFormData, setOwnerFormData] = useState({ name: '', upiId: '' });
  const [savingOwner, setSavingOwner] = useState(false);

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({ name: '', email: '', password: '' });
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editEmployeeFormData, setEditEmployeeFormData] = useState({ name: '', password: '' });
  const [updatingEmployee, setUpdatingEmployee] = useState(false);

  const isEmployee = user?.role === 'employee' || user?.role === 'staff';
  const displayStore = activeStore || store;
  const storeId = displayStore?.id || displayStore?._id || user?.storeId || user?.id;

  // Track if any bottom sheet modal is open to hide bottom tab bar and eliminate peeking gap
  const isAnyModalOpen = Boolean(
    showEditStoreModal ||
    showAddStallModal ||
    showEditTimingModal ||
    showEditOwnerModal ||
    showAddEmployeeModal ||
    showEditEmployeeModal
  );

  const defaultTabBarStyle = useMemo(() => ({
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  }), []);

  useEffect(() => {
    if (isAnyModalOpen) {
      navigation?.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      navigation?.getParent()?.setOptions({ tabBarStyle: defaultTabBarStyle });
    }
  }, [isAnyModalOpen, navigation, defaultTabBarStyle]);

  useEffect(() => {
    return () => {
      navigation?.getParent()?.setOptions({ tabBarStyle: defaultTabBarStyle });
    };
  }, [navigation, defaultTabBarStyle]);

  // Format 24h HH:mm to 12h AM/PM
  const formatTime12h = (hhmm) => {
    if (!hhmm) return '--:--';
    const parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    const h = parseInt(parts[0], 10);
    const m = (parts[1] || '00').padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // ---------------------------------------------------------
  // Fetch Store, Employees, and Locations
  // ---------------------------------------------------------
  const fetchProfileData = useCallback(async (isPull = false) => {
    if (!user) return;
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      // 1. Fetch Locations list for configured markets
      try {
        const locRes = await apiClient.get('/store/locations/list');
        if (locRes.data && Array.isArray(locRes.data) && locRes.data.length > 0) {
          setAllLocations(locRes.data);
        }
      } catch (e) {
        console.log('Locations list fetch error:', e.message);
      }

      // 2. Fetch Store Information
      try {
        const storeRes = await apiClient.get('/store/my-stores');
        if (storeRes.data && storeRes.data.length > 0) {
          const storeList = storeRes.data;
          const preferredId = await getStorageItem('preferred_store_id');
          // Prefer preferredId first so switching stalls persists across screens and refreshes
          let currentStore = null;
          if (preferredId) {
            currentStore = storeList.find(s => (s.id || s._id) === preferredId);
          }
          if (!currentStore && activeStore) {
            const curId = activeStore.id || activeStore._id;
            currentStore = storeList.find(s => (s.id || s._id) === curId);
          }
          if (!currentStore) {
            currentStore = storeList[0];
          }

          setStore(currentStore);
          setStoreFormData({
            name: currentStore.name || '',
            category: currentStore.category || '',
            market: currentStore.market || '',
            locationId: currentStore.locationId || '',
          });
          setOwnerFormData({
            name: user.name || '',
            upiId: currentStore.upiId || '',
          });
          setTimingFormData({
            isAutomated: Boolean(currentStore.isAutomated),
            openingTime: currentStore.openingTime || '10:00',
            closingTime: currentStore.closingTime || '22:00',
          });

          if (currentStore && (!activeStore || (activeStore.id || activeStore._id) !== (currentStore.id || currentStore._id))) {
            await switchActiveStore(currentStore);
          }
        }
      } catch (err) {
        console.log('Store fetch error:', err.message);
      }

      // 3. Fetch Employees (Only for Cart Owner / Vendor)
      const currentTargetStoreId = activeStore?.id || activeStore?._id || store?.id || store?._id || user?.storeId || user?.id;
      if (!isEmployee && currentTargetStoreId) {
        try {
          const empRes = await apiClient.get(`/employees/${currentTargetStoreId}`);
          setEmployees(empRes.data || []);
        } catch (err) {
          console.log('Employees fetch error:', err.message);
        }
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isEmployee]);

  // Synchronize state immediately when activeStore switches
  useEffect(() => {
    if (activeStore) {
      setStore(activeStore);
      setStoreFormData({
        name: activeStore.name || '',
        category: activeStore.category || '',
        market: activeStore.market || '',
        locationId: activeStore.locationId || '',
      });
      setTimingFormData({
        isAutomated: Boolean(activeStore.isAutomated),
        openingTime: activeStore.openingTime || '10:00',
        closingTime: activeStore.closingTime || '22:00',
      });
      if (activeStore.upiId !== undefined) {
        setOwnerFormData(prev => ({
          ...prev,
          upiId: activeStore.upiId || '',
        }));
      }
    }
  }, [activeStore]);

  // Refetch latest profile data when tab is focused
  useEffect(() => {
    if (isFocused) {
      fetchProfileData();
    }
  }, [isFocused, fetchProfileData]);

  // Real-time synchronization via WebSockets (Super Admin & Automation sync)
  useEffect(() => {
    if (!socket || !store) return;
    const currentStoreId = String(store.id || store._id || '');

    const handleStatusUpdate = (data) => {
      if (String(data.storeId) === currentStoreId) {
        setStore((prev) => ({
          ...prev,
          isOpen: data.isOpen !== undefined ? data.isOpen : prev.isOpen,
          isAutomated: data.isAutomated !== undefined ? data.isAutomated : prev.isAutomated,
        }));
      }
    };

    const handleTimingUpdate = (data) => {
      if (String(data.storeId) === currentStoreId) {
        setStore((prev) => ({
          ...prev,
          openingTime: data.openingTime || prev.openingTime,
          closingTime: data.closingTime || prev.closingTime,
          isAutomated: data.isAutomated !== undefined ? Boolean(data.isAutomated) : prev.isAutomated,
          isOpen: data.isOpen !== undefined ? data.isOpen : prev.isOpen,
        }));
        setTimingFormData((prev) => ({
          ...prev,
          openingTime: data.openingTime || prev.openingTime,
          closingTime: data.closingTime || prev.closingTime,
          isAutomated: data.isAutomated !== undefined ? Boolean(data.isAutomated) : prev.isAutomated,
        }));
      }
    };

    socket.on('store_status_update', handleStatusUpdate);
    socket.on('store_timing_update', handleTimingUpdate);

    return () => {
      socket.off('store_status_update', handleStatusUpdate);
      socket.off('store_timing_update', handleTimingUpdate);
    };
  }, [socket, store?.id, store?._id]);

  // Compute available markets for the current location
  const availableMarkets = useMemo(() => {
    // 1. Check if store's own location object has markets
    if (store?.location?.markets && typeof store.location.markets === 'string') {
      const parsed = store.location.markets.split(',').map((m) => m.trim()).filter(Boolean);
      if (parsed.length > 0) return parsed;
    }

    // 2. Find location from allLocations list
    if (store?.locationId && allLocations.length > 0) {
      const loc = allLocations.find((l) => l.id === store.locationId);
      if (loc && loc.markets) {
        const parsed = loc.markets.split(',').map((m) => m.trim()).filter(Boolean);
        if (parsed.length > 0) return parsed;
      }
    }

    // 3. Default to LPU market zones
    return DEFAULT_LPU_MARKETS;
  }, [store, allLocations]);

  // Location & Market state for Create Stall Modal
  const selectedCreateLocationId = newStallFormData.locationId || store?.locationId || activeStore?.locationId || (allLocations.length > 0 ? allLocations[0].id : '');
  const selectedCreateLocation = allLocations.find(l => l.id === selectedCreateLocationId) || allLocations[0];
  const modalCreateMarkets = useMemo(() => {
    if (!selectedCreateLocation) return DEFAULT_LPU_MARKETS;
    if (selectedCreateLocation.markets && typeof selectedCreateLocation.markets === 'string' && selectedCreateLocation.markets.trim()) {
      const list = selectedCreateLocation.markets.split(',').map(m => m.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
    return [selectedCreateLocation.name || 'Campus Market'];
  }, [selectedCreateLocation]);

  // Location & Market state for Edit Stall Modal
  const selectedEditLocationId = storeFormData.locationId || store?.locationId || activeStore?.locationId || (allLocations.length > 0 ? allLocations[0].id : '');
  const selectedEditLocation = allLocations.find(l => l.id === selectedEditLocationId) || allLocations[0];
  const modalEditMarkets = useMemo(() => {
    if (!selectedEditLocation) return DEFAULT_LPU_MARKETS;
    if (selectedEditLocation.markets && typeof selectedEditLocation.markets === 'string' && selectedEditLocation.markets.trim()) {
      const list = selectedEditLocation.markets.split(',').map(m => m.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
    return [selectedEditLocation.name || 'Campus Market'];
  }, [selectedEditLocation]);

  // ---------------------------------------------------------
  // 1. Stall Image Upload / Change in Real-Time
  // ---------------------------------------------------------
  const handlePickStallImage = async () => {
    if (isEmployee) {
      Alert.alert('Restricted', 'Only the Cart Owner can update the stall image.');
      return;
    }
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId) {
      Alert.alert('Error', 'Store ID not found.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select a stall image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingImage(true);

      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'stall_image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('imageFile', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: filename,
        type: fileType,
      });

      const res = await apiClient.put(`/store/${currentStoreId}/update-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data) {
        setStore((prev) => ({ ...prev, image: res.data.image || asset.uri }));
        Alert.alert('Success', 'Stall photo updated in real-time!');
      }
    } catch (err) {
      console.error('Failed to upload stall image:', err);
      Alert.alert('Upload Failed', err.response?.data?.message || 'Could not upload stall image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // ---------------------------------------------------------
  // 2. Real-Time Store Info Update (Name, Category, Market, UPI)
  // ---------------------------------------------------------
  const handleSaveStoreDetails = async () => {
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId) return;

    if (!storeFormData.name.trim()) {
      Alert.alert('Required', 'Please enter a valid Stall Name.');
      return;
    }

    const finalLocationId = storeFormData.locationId || selectedEditLocationId || null;
    const finalMarket = storeFormData.market.trim() || modalEditMarkets[0] || 'BH1 Market';

    setSavingStore(true);
    try {
      const payload = {
        name: storeFormData.name.trim(),
        category: storeFormData.category.trim() || 'General',
        market: finalMarket,
        locationId: finalLocationId,
      };

      const res = await apiClient.put(`/store/${currentStoreId}/update-details`, payload);

      if (res.data) {
        setStore((prev) => ({
          ...prev,
          name: res.data.name || storeFormData.name,
          category: res.data.category || storeFormData.category,
          market: res.data.market || storeFormData.market,
          locationId: res.data.locationId || finalLocationId,
        }));
        await refreshStores();
        setShowEditStoreModal(false);
        Alert.alert('Updated', 'Stall details updated in real-time!');
      }
    } catch (err) {
      console.error('Failed to update store details:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update stall details.');
    } finally {
      setSavingStore(false);
    }
  };

  // ---------------------------------------------------------
  // 3. Real-Time Stall Open/Closed Toggle
  // ---------------------------------------------------------
  const handleToggleStoreStatus = async () => {
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId || togglingStatus) return;

    setTogglingStatus(true);
    try {
      const res = await apiClient.put(`/store/${currentStoreId}/toggle-status`, {
        forceCancelPending: false,
      });

      if (res.data?.requiresConfirmation) {
        Alert.alert(
          'Pending Orders Alert',
          res.data.message,
          [
            { text: 'Keep Open', style: 'cancel' },
            {
              text: 'Close & Refund',
              style: 'destructive',
              onPress: async () => {
                const confRes = await apiClient.put(`/store/${currentStoreId}/toggle-status`, {
                  forceCancelPending: true,
                });
                setStore((prev) => ({ ...prev, isOpen: confRes.data.isOpen }));
              },
            },
          ]
        );
      } else {
        setStore((prev) => ({ ...prev, isOpen: res.data.isOpen }));
      }
    } catch (err) {
      console.error('Toggle store status error:', err);
      Alert.alert('Error', 'Could not update stall open/closed status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  // ---------------------------------------------------------
  // 3b. Real-Time Automated Schedule Toggle
  // ---------------------------------------------------------
  const handleToggleAutoSchedule = async () => {
    if (isEmployee) {
      Alert.alert('Restricted', 'Only the Cart Owner can configure automated stall timing.');
      return;
    }
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId || togglingAutoSchedule) return;

    const newStatus = !store?.isAutomated;
    setTogglingAutoSchedule(true);
    try {
      const res = await apiClient.put(`/store/${currentStoreId}/update-details`, {
        isAutomated: newStatus,
      });
      if (res.data) {
        setStore((prev) => ({
          ...prev,
          isAutomated: res.data.isAutomated,
          isOpen: res.data.isOpen,
        }));
        setTimingFormData((prev) => ({
          ...prev,
          isAutomated: Boolean(res.data.isAutomated),
        }));
        Alert.alert(
          'Automated Schedule',
          newStatus
            ? `Automated timing is now ON (${formatTime12h(store?.openingTime || '10:00')} – ${formatTime12h(store?.closingTime || '22:00')}). Your stall will automatically open and close in real-time according to IST.`
            : 'Automated timing is now OFF. Your stall is in manual control mode.'
        );
      }
    } catch (err) {
      console.error('Failed to toggle auto schedule:', err);
      Alert.alert('Error', err.response?.data?.message || 'Could not update automated schedule.');
    } finally {
      setTogglingAutoSchedule(false);
    }
  };

  // ---------------------------------------------------------
  // 3c. Real-Time Save Stall Timing (Opening & Closing Hours)
  // ---------------------------------------------------------
  const handleSaveTimingDetails = async () => {
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId) return;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const op = (timingFormData.openingTime || '').trim();
    const cl = (timingFormData.closingTime || '').trim();

    if (!timeRegex.test(op)) {
      Alert.alert('Invalid Format', 'Please enter a valid Opening Time in 24-hr format (e.g. 10:00 or 08:30).');
      return;
    }
    if (!timeRegex.test(cl)) {
      Alert.alert('Invalid Format', 'Please enter a valid Closing Time in 24-hr format (e.g. 22:00 or 23:00).');
      return;
    }

    setSavingTiming(true);
    try {
      const res = await apiClient.put(`/store/${currentStoreId}/update-details`, {
        isAutomated: timingFormData.isAutomated,
        openingTime: op,
        closingTime: cl,
      });

      if (res.data) {
        setStore((prev) => ({
          ...prev,
          isAutomated: res.data.isAutomated,
          openingTime: res.data.openingTime,
          closingTime: res.data.closingTime,
          isOpen: res.data.isOpen,
        }));
        setShowEditTimingModal(false);
        Alert.alert('Schedule Saved', 'Automated stall timing updated and synced with Super Admin!');
      }
    } catch (err) {
      console.error('Failed to save timing details:', err);
      Alert.alert('Error', err.response?.data?.message || 'Could not save timing schedule.');
    } finally {
      setSavingTiming(false);
    }
  };

  // ---------------------------------------------------------
  // 4. Real-Time Owner Details & UPI ID Update
  // ---------------------------------------------------------
  const handleSaveOwnerDetails = async () => {
    if (!ownerFormData.name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    setSavingOwner(true);
    try {
      // 1. Update owner's name
      const profileRes = await apiClient.put('/auth/update-profile', {
        name: ownerFormData.name.trim(),
      });

      if (profileRes.data?.admin || profileRes.data) {
        const updated = profileRes.data.admin || profileRes.data;
        updateUser({ name: updated.name || ownerFormData.name });
      }

      // 2. Update store's payout UPI ID (reflected in Super Admin panel)
      const currentStoreId = store?.id || store?._id || storeId;
      if (currentStoreId && ownerFormData.upiId !== undefined) {
        const upiRes = await apiClient.put(`/store/${currentStoreId}/update-details`, {
          upiId: ownerFormData.upiId.trim(),
        });
        if (upiRes.data) {
          setStore((prev) => ({ ...prev, upiId: upiRes.data.upiId || ownerFormData.upiId.trim() }));
          setStoreFormData((prev) => ({ ...prev, upiId: upiRes.data.upiId || ownerFormData.upiId.trim() }));
        }
      }

      setShowEditOwnerModal(false);
      Alert.alert('Updated', 'Owner profile and Payout UPI ID updated in real-time!');
    } catch (err) {
      console.error('Failed to update owner profile:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update owner details.');
    } finally {
      setSavingOwner(false);
    }
  };

  // ---------------------------------------------------------
  // 5. Employees Management: Add Employee
  // ---------------------------------------------------------
  const handleAddEmployee = async () => {
    const currentStoreId = store?.id || store?._id || storeId;
    if (!currentStoreId) return;

    const { name, email, password } = employeeFormData;
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please fill in Name, Email/Phone, and Password for the employee.');
      return;
    }

    setSavingEmployee(true);
    try {
      const res = await apiClient.post(`/employees/${currentStoreId}`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (res.data) {
        setEmployees((prev) => [res.data, ...prev]);
        setShowAddEmployeeModal(false);
        setEmployeeFormData({ name: '', email: '', password: '' });
        Alert.alert('Success', `Employee ${name.trim()} added! They can now log in to the mobile app.`);
      }
    } catch (err) {
      console.error('Add employee error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create employee account.');
    } finally {
      setSavingEmployee(false);
    }
  };

  // ---------------------------------------------------------
  // 6. Employees Management: Toggle Status (Active / Inactive)
  // ---------------------------------------------------------
  const handleToggleEmployeeStatus = async (employee) => {
    const currentStoreId = store?.id || store?._id || storeId;
    const empId = employee.id || employee._id;
    if (!currentStoreId || !empId) return;

    const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setEmployees((prev) =>
      prev.map((e) => ((e.id || e._id) === empId ? { ...e, status: newStatus } : e))
    );

    try {
      await apiClient.patch(`/employees/${currentStoreId}/${empId}/status`, {
        status: newStatus,
      });
    } catch (err) {
      console.error('Toggle employee status error:', err);
      Alert.alert('Error', 'Failed to toggle employee status.');
      setEmployees((prev) =>
        prev.map((e) => ((e.id || e._id) === empId ? { ...e, status: employee.status } : e))
      );
    }
  };

  // ---------------------------------------------------------
  // 7. Employees Management: Edit Employee
  // ---------------------------------------------------------
  const handleOpenEditEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEditEmployeeFormData({
      name: emp.name || '',
      password: '',
    });
    setShowEditEmployeeModal(true);
  };

  const handleUpdateEmployee = async () => {
    const currentStoreId = store?.id || store?._id || storeId;
    const empId = selectedEmployee?.id || selectedEmployee?._id;
    if (!currentStoreId || !empId) return;

    if (!editEmployeeFormData.name.trim()) {
      Alert.alert('Required', 'Please enter employee name.');
      return;
    }

    setUpdatingEmployee(true);
    try {
      const payload = { name: editEmployeeFormData.name.trim() };
      if (editEmployeeFormData.password.trim()) {
        payload.password = editEmployeeFormData.password.trim();
      }

      const res = await apiClient.put(`/employees/${currentStoreId}/${empId}`, payload);
      if (res.data) {
        setEmployees((prev) =>
          prev.map((e) => ((e.id || e._id) === empId ? { ...e, name: res.data.name } : e))
        );
        setShowEditEmployeeModal(false);
        Alert.alert('Updated', 'Employee details updated in real-time!');
      }
    } catch (err) {
      console.error('Update employee error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update employee details.');
    } finally {
      setUpdatingEmployee(false);
    }
  };

  // ---------------------------------------------------------
  // 8. Employees Management: Delete / Revoke Employee
  // ---------------------------------------------------------
  const handleDeleteEmployee = (employee) => {
    const currentStoreId = store?.id || store?._id || storeId;
    const empId = employee.id || employee._id;
    if (!currentStoreId || !empId) return;

    Alert.alert(
      'Revoke Employee Access',
      `Are you sure you want to remove ${employee.name}? They will no longer be able to log in to this kitchen stall.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/employees/${currentStoreId}/${empId}`);
              setEmployees((prev) => prev.filter((e) => (e.id || e._id) !== empId));
              Alert.alert('Removed', `${employee.name} has been revoked.`);
            } catch (err) {
              console.error('Delete employee error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove employee.');
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------
  // 9. Multi-Stall Management: Create New Stall & Switch Stall
  // ---------------------------------------------------------
  const handleCreateStall = async () => {
    if (!newStallFormData.name.trim()) {
      Alert.alert('Required', 'Please enter a stall name.');
      return;
    }
    const finalLocationId = newStallFormData.locationId || selectedCreateLocationId || (allLocations.length > 0 ? allLocations[0].id : null);
    const finalMarket = newStallFormData.market || modalCreateMarkets[0] || 'BH1 Market';

    setCreatingStall(true);
    try {
      const res = await apiClient.post('/store/create', {
        name: newStallFormData.name.trim(),
        category: newStallFormData.category || 'General',
        market: finalMarket,
        locationId: finalLocationId,
        upiId: newStallFormData.upiId ? newStallFormData.upiId.trim() : ''
      });

      Alert.alert('Success! 🎉', `Stall "${res.data.name}" has been created and synced with Super Admin.`);
      setShowAddStallModal(false);
      setNewStallFormData({ name: '', category: 'Fast Food', market: '', locationId: '', upiId: '' });

      const freshStores = await refreshStores();
      const newOne = (freshStores || []).find(s => (s.id || s._id) === (res.data.id || res.data._id));
      if (newOne) {
        await handleSwitchStall(newOne);
      } else {
        await fetchProfileData();
      }
    } catch (err) {
      console.error('Failed to create stall:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create stall.');
    } finally {
      setCreatingStall(false);
    }
  };

  const handleSwitchStall = async (targetStore) => {
    // 1. Immediately update local Profile state so there's zero UI lag or mismatch
    setStore(targetStore);
    setStoreFormData({
      name: targetStore.name || '',
      category: targetStore.category || '',
      market: targetStore.market || '',
      locationId: targetStore.locationId || '',
    });
    setTimingFormData({
      isAutomated: Boolean(targetStore.isAutomated),
      openingTime: targetStore.openingTime || '10:00',
      closingTime: targetStore.closingTime || '22:00',
    });
    if (targetStore.upiId !== undefined) {
      setOwnerFormData(prev => ({
        ...prev,
        upiId: targetStore.upiId || '',
      }));
    }

    // 2. Persist switch in AuthContext
    await switchActiveStore(targetStore);

    // 3. Load employees for the switched stall
    const targetId = targetStore.id || targetStore._id;
    if (!isEmployee && targetId) {
      try {
        const empRes = await apiClient.get(`/employees/${targetId}`);
        setEmployees(empRes.data || []);
      } catch (err) {
        console.log('Employees fetch error:', err.message);
      }
    }
  };

  // ---------------------------------------------------------
  // 10. Logout
  // ---------------------------------------------------------
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of UniVerse Vendor OS?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      {/* Top Header Bar with Audio & Cart Controls */}
      <View style={styles.topHeaderBar}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.topHeaderTitle}>Store Profile</Text>
          <View style={styles.storeBadge}>
            <Ionicons name="storefront" size={12} color="#EF4123" style={{ marginRight: 4 }} />
            <Text style={styles.storeName} numberOfLines={1}>{displayStore?.name || 'UniVerse Stall'}</Text>
          </View>
        </View>

        <View style={styles.topHeaderControls}>
          {/* Audio Alert Speaker Toggle */}
          <TouchableOpacity 
            style={[
              styles.audioIconBtn,
              isAudioEnabled && styles.audioIconBtnActive
            ]}
            onPress={async () => {
              await toggleAudio();
              if (!isAudioEnabled) {
                playTestSound();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isAudioEnabled ? 'volume-high' : 'volume-mute'} 
              size={16} 
              color={isAudioEnabled ? '#EF4123' : '#94A3B8'} 
            />
          </TouchableOpacity>

          {/* Instant Cart On/Off Switch */}
          <View style={[
            styles.stallSwitchCard,
            displayStore?.isOpen ? styles.stallSwitchCardOpen : styles.stallSwitchCardClosed
          ]}>
            <View style={[styles.miniStatusDot, { backgroundColor: displayStore?.isOpen ? '#10B981' : '#94A3B8' }]} />
            <Text style={[styles.stallSwitchText, { color: displayStore?.isOpen ? '#059669' : '#64748B' }]}>
              {displayStore?.isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
            <Switch
              value={Boolean(displayStore?.isOpen)}
              onValueChange={handleToggleStoreStatus}
              disabled={togglingStatus}
              trackColor={{ false: '#334155', true: '#A7F3D0' }}
              thumbColor={displayStore?.isOpen ? '#10B981' : '#94A3B8'}
              ios_backgroundColor="#334155"
              style={{ transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }], marginLeft: 2, marginRight: -4 }}
            />
          </View>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProfileData(true)}
            colors={['#EF4123']}
          />
        }
      >
        {/* =================================================== */}
        {/* 1. STALL IMAGE HERO & DETAILS SECTION               */}
        {/* =================================================== */}
        <View style={styles.heroCardContainer}>
          <View style={styles.imageWrapper}>
            {displayStore?.image ? (
              <Image source={{ uri: displayStore.image }} style={styles.stallImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.stallImagePlaceholder}
              >
                <Ionicons name="storefront" size={54} color="#94A3B8" />
                <Text style={styles.placeholderStallText}>
                  {displayStore?.name || 'Your Food Stall'}
                </Text>
                <Text style={styles.placeholderSub}>Tap 'Change Photo' to upload stall banner</Text>
              </LinearGradient>
            )}

            {/* Gradient Overlay for Readable Text */}
            <LinearGradient
              colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
              style={styles.imageOverlay}
            />

            {/* Stall Open/Closed Status Chip */}
            <View style={styles.statusChipWrapper}>
              <View
                style={[
                  styles.statusPill,
                  displayStore?.isOpen ? styles.statusPillOpen : styles.statusPillClosed,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    displayStore?.isOpen ? styles.statusDotOpen : styles.statusDotClosed,
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    displayStore?.isOpen ? styles.statusPillTextOpen : styles.statusPillTextClosed,
                  ]}
                >
                  {displayStore?.isOpen ? 'OPEN FOR ORDERS' : 'CURRENTLY CLOSED'}
                </Text>
              </View>
            </View>

            {/* Change Stall Photo Button */}
            {!isEmployee && (
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={handlePickStallImage}
                disabled={uploadingImage}
                activeOpacity={0.8}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Stall Meta Row */}
          <View style={styles.stallMetaBox}>
            <View style={styles.stallTitleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.stallNameText} numberOfLines={1}>
                  {displayStore?.name || 'UniVerse Kitchen Stall'}
                </Text>
                <View style={styles.stallLocationRow}>
                  <Ionicons name="location-sharp" size={13} color="#EF4123" style={{ marginRight: 4 }} />
                  <Text style={styles.stallLocationText} numberOfLines={1}>
                    {displayStore?.market || 'Select Market'} • {displayStore?.category || 'Fast Food'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Open/Closed Toggle Switch */}
            {!isEmployee && (
              <View style={styles.quickToggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                  <Ionicons
                    name={displayStore?.isOpen ? 'restaurant' : 'moon'}
                    size={16}
                    color={displayStore?.isOpen ? '#10B981' : '#64748B'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.quickToggleLabel} numberOfLines={1}>
                    {displayStore?.isOpen ? 'Accepting customer orders' : 'Stall is offline and closed'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(displayStore?.isOpen)}
                  onValueChange={handleToggleStoreStatus}
                  disabled={togglingStatus}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
          </View>
        </View>

        {/* =================================================== */}
        {/* 1.5 MY STALLS & COUNTERS (MULTI-STALL HUB)          */}
        {/* =================================================== */}
        {!isEmployee && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(239, 65, 35, 0.1)' }]}>
                  <Ionicons name="storefront" size={17} color="#EF4123" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.sectionTitle}>My Stalls & Outlets</Text>
                  <Text style={styles.sectionSubtitle}>
                    Manage all your food counters with isolated menus
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addStallHeaderBtn}
                onPress={() => setShowAddStallModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.addStallHeaderBtnText}>Add Stall</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10 }}>
              {(stores || []).map((s) => {
                const sId = String(s.id || s._id || '');
                const activeStallId = String(displayStore?.id || displayStore?._id || '');
                const isActive = Boolean(sId && activeStallId && sId === activeStallId);
                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.stallRowCard, isActive && styles.stallRowCardActive]}
                    onPress={() => handleSwitchStall(s)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.stallRowIcon, isActive && styles.stallRowIconActive]}>
                      <Ionicons name="storefront" size={18} color={isActive ? '#EF4123' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.stallRowName, isActive && styles.stallRowNameActive]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        {isActive && (
                          <View style={styles.activeBadgePill}>
                            <Text style={styles.activeBadgePillText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stallRowSub}>
                        {s.market || 'Market'} • {s.isOpen !== false ? '🟢 Open' : '⚪ Closed'}
                      </Text>
                    </View>
                    {!isActive ? (
                      <View style={styles.switchStallBtn}>
                        <Text style={styles.switchStallBtnText}>Switch</Text>
                      </View>
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* =================================================== */}
        {/* SHOP OFFERS & REAL-TIME DEALS CARD                  */}
        {/* (Strictly hidden for Kitchen Staff & Employees)     */}
        {/* =================================================== */}
        {!isEmployee && (
          <TouchableOpacity 
            style={styles.sectionCard}
            onPress={() => navigation.navigate('Offers')}
            activeOpacity={0.8}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(239, 65, 35, 0.1)' }]}>
                  <Ionicons name="pricetag" size={17} color="#EF4123" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.sectionTitle}>Shop Offers & Deals</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={2}>
                    Run % discounts or flat ₹ deals live on student carts
                  </Text>
                </View>
              </View>
              <View
                style={[styles.editTimingBtn, { backgroundColor: '#EF4123', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }]}
              >
                <Text style={[styles.editTimingBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>Manage</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* =================================================== */}
        {/* 2. AUTOMATED STALL TIMING & SCHEDULE CARD           */}
        {/* (Strictly hidden for Kitchen Staff & Employees)     */}
        {/* =================================================== */}
        {!isEmployee && (
          <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(239, 65, 35, 0.1)' }]}>
                <Ionicons name="time" size={17} color="#EF4123" />
              </View>
              <View style={{ marginLeft: 4, flex: 1 }}>
                <Text style={styles.sectionTitle}>Automated Stall Timing</Text>
                <Text style={styles.sectionSubtitle}>
                  Auto-schedule synced with Super Admin (IST)
                </Text>
              </View>
            </View>

            {!isEmployee && (
              <TouchableOpacity
                style={styles.sectionActionBtn}
                onPress={() => {
                  setTimingFormData({
                    isAutomated: Boolean(store?.isAutomated),
                    openingTime: store?.openingTime || '10:00',
                    closingTime: store?.closingTime || '22:00',
                  });
                  setShowEditTimingModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={15} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Auto-Timing Toggle Row */}
          <View style={styles.timingToggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <View
                  style={[
                    styles.timingDot,
                    store?.isAutomated ? styles.timingDotActive : styles.timingDotManual,
                  ]}
                />
                <Text style={styles.timingToggleTitle}>
                  {store?.isAutomated ? 'Auto-Schedule Active' : 'Manual Schedule Mode'}
                </Text>
              </View>
              <Text style={styles.timingToggleSub}>
                {store?.isAutomated
                  ? 'Stall automatically opens & closes at set times in real-time'
                  : 'Vendor manually controls stall open/closed switch'}
              </Text>
            </View>

            {!isEmployee && (
              <Switch
                value={Boolean(store?.isAutomated)}
                onValueChange={handleToggleAutoSchedule}
                disabled={togglingAutoSchedule}
                trackColor={{ false: '#E2E8F0', true: '#4F46E5' }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>

          {/* Operating Hours Visual Pill Row */}
          <View style={styles.timingPillRow}>
            <View style={styles.timingPillCol}>
              <Text style={styles.timingPillLabel}>OPENS AT</Text>
              <View style={styles.timingPillBox}>
                <Ionicons name="sunny-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={styles.timingPillValue}>
                  {formatTime12h(store?.openingTime || '10:00')}
                </Text>
                <Text style={styles.timing24hTag}>({store?.openingTime || '10:00'})</Text>
              </View>
            </View>

            <View style={styles.timingDividerArrow}>
              <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
            </View>

            <View style={styles.timingPillCol}>
              <Text style={styles.timingPillLabel}>CLOSES AT</Text>
              <View style={styles.timingPillBox}>
                <Ionicons name="moon-outline" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={styles.timingPillValue}>
                  {formatTime12h(store?.closingTime || '22:00')}
                </Text>
                <Text style={styles.timing24hTag}>({store?.closingTime || '22:00'})</Text>
              </View>
            </View>
          </View>

          <View style={styles.timingSyncBanner}>
            <Ionicons name="shield-checkmark" size={13} color="#10B981" style={{ marginRight: 5 }} />
            <Text style={styles.timingSyncText}>
              Directly connected to PostgreSQL DB & Super Admin Panel
            </Text>
          </View>
        </View>
        )}

        {/* =================================================== */}
        {/* 3. OWNER & ACCOUNT DETAILS SECTION                  */}
        {/* =================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="person" size={16} color="#2563EB" />
              </View>
              <Text style={styles.sectionTitle}>
                {isEmployee ? 'Staff Account Details' : 'Cart Owner Details'}
              </Text>
            </View>

            {!isEmployee && (
              <TouchableOpacity
                style={styles.sectionActionBtn}
                onPress={() => setShowEditOwnerModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={15} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.ownerInfoGrid}>
            {/* Full Name */}
            <View style={styles.ownerInfoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user.name || 'Vendor Owner'}
              </Text>
            </View>

            {/* Login Email / ID */}
            <View style={styles.ownerInfoRow}>
              <Text style={styles.infoLabel}>Login Email / ID</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {user.email || 'N/A'}
              </Text>
            </View>

            {/* Payout UPI ID (Synced with Super Admin Panel) - Vendor Owner Only */}
            {!isEmployee && (
              <View style={styles.ownerInfoRow}>
                <Text style={styles.infoLabel}>Payout UPI ID</Text>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 8 }}>
                  {store?.upiId ? (
                    <View style={styles.upiBadge}>
                      <Ionicons name="card" size={12} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={styles.upiBadgeText} numberOfLines={1}>
                        {store.upiId}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setShowEditOwnerModal(true)}>
                      <Text style={styles.upiUnsetLink}>+ Set Payout UPI ID</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Account Role */}
            <View style={[styles.ownerInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.infoLabel}>Account Role</Text>
              <View
                style={[
                  styles.roleBadge,
                  isEmployee ? styles.employeeRoleBadge : styles.ownerRoleBadge,
                ]}
              >
                <Ionicons
                  name={isEmployee ? 'shield-checkmark' : 'sparkles'}
                  size={11}
                  color={isEmployee ? '#7E22CE' : '#2563EB'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    isEmployee ? styles.employeeRoleText : styles.ownerRoleText,
                  ]}
                >
                  {isEmployee ? 'KITCHEN STAFF' : 'CART OWNER (FULL ACCESS)'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* =================================================== */}
        {/* 3. EMPLOYEES & STAFF MANAGEMENT SECTION (REALTIME)   */}
        {/* =================================================== */}
        {!isEmployee ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(126, 34, 206, 0.1)' }]}>
                  <Ionicons name="people" size={16} color="#7E22CE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    Kitchen Staff & Employees
                  </Text>
                  <Text style={styles.sectionSub} numberOfLines={1}>
                    Real-time operational staff logins
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addEmployeeBtn}
                onPress={() => setShowAddEmployeeModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.addEmployeeBtnText}>Add Staff</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy notice banner */}
            <View style={styles.staffNoticeBox}>
              <Ionicons name="shield-checkmark" size={14} color="#7E22CE" style={{ marginRight: 6 }} />
              <Text style={styles.staffNoticeText}>
                Employees log in via mobile app to fulfill live orders. Payout statistics and revenue are restricted to the Cart Owner.
              </Text>
            </View>

            {/* Employees List */}
            {employees.length === 0 ? (
              <View style={styles.emptyEmployeesBox}>
                <Ionicons name="person-add-outline" size={34} color="#CBD5E1" />
                <Text style={styles.emptyEmployeesTitle}>No employees added yet</Text>
                <Text style={styles.emptyEmployeesSub}>
                  Add kitchen staff so they can process orders on their own devices without seeing your financial earnings.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setShowAddEmployeeModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyAddBtnText}>+ Add First Employee</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.employeeList}>
                {employees.map((emp) => {
                  const empId = emp.id || emp._id;
                  const isActive = emp.status === 'ACTIVE';

                  return (
                    <View key={empId} style={styles.employeeCard}>
                      <View style={styles.employeeTopRow}>
                        {/* Avatar Initial */}
                        <View style={[styles.empAvatar, !isActive && styles.empAvatarInactive]}>
                          <Text style={styles.empAvatarText}>
                            {(emp.name || 'S').charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        {/* Name & Login */}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.empName} numberOfLines={1}>
                              {emp.name}
                            </Text>
                            {/* Status Pill */}
                            <View
                              style={[
                                styles.empStatusBadge,
                                isActive ? styles.empStatusActive : styles.empStatusInactive,
                              ]}
                            >
                              <View
                                style={[
                                  styles.empStatusDot,
                                  isActive ? styles.empStatusDotActive : styles.empStatusDotInactive,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.empStatusText,
                                  isActive ? styles.empStatusTextActive : styles.empStatusTextInactive,
                                ]}
                              >
                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.empEmail} numberOfLines={1} ellipsizeMode="middle">
                            {emp.email}
                          </Text>
                        </View>
                      </View>

                      {/* Real-Time Action Buttons */}
                      <View style={styles.empActionsRow}>
                        {/* Toggle Active / Inactive Switch */}
                        <TouchableOpacity
                          style={[
                            styles.empActionBtn,
                            isActive ? styles.empActionBtnDeactivate : styles.empActionBtnActivate,
                          ]}
                          onPress={() => handleToggleEmployeeStatus(emp)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                            size={13}
                            color={isActive ? '#D97706' : '#10B981'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.empActionBtnText,
                              { color: isActive ? '#D97706' : '#10B981' },
                            ]}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        {/* Edit Employee Name / Password */}
                        <TouchableOpacity
                          style={styles.empActionBtn}
                          onPress={() => handleOpenEditEmployee(emp)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="key-outline" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                          <Text style={[styles.empActionBtnText, { color: '#2563EB' }]}>Edit / PW</Text>
                        </TouchableOpacity>

                        {/* Delete / Revoke Employee */}
                        <TouchableOpacity
                          style={[styles.empActionBtn, styles.empActionBtnDelete]}
                          onPress={() => handleDeleteEmployee(emp)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[styles.empActionBtnText, { color: '#EF4444' }]}>Revoke</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* Employee Restricted Card */
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="shield-checkmark" size={20} color="#7E22CE" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Kitchen Staff Privileges</Text>
            </View>
            <Text style={styles.employeeRestrictedText}>
              You are logged in with employee credentials for <Text style={{ fontWeight: '800' }}>{store?.name || 'this stall'}</Text>. You have live order queue & fulfillment access. Managing employees and financial payouts is reserved for the Cart Owner.
            </Text>
          </View>
        )}

        {/* =================================================== */}
        {/* 4. LOGOUT & FOOTER                                  */}
        {/* =================================================== */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Log Out of Kitchen OS</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>UNIVERSE Vendor OS • v1.1.0 • Supabase Cloud DB</Text>
      </ScrollView>
      </View>

      {/* =================================================== */}
      {/* MODAL 0: ADD NEW STALL / COUNTER                    */}
      {/* =================================================== */}
      <Modal visible={showAddStallModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Stall</Text>
                <Text style={styles.modalSubtitle}>Launch another food counter on your account</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddStallModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Stall Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newStallFormData.name}
                onChangeText={(text) => setNewStallFormData((prev) => ({ ...prev, name: text }))}
                placeholder="e.g. Fresh Juice Bar, Dosa Hub"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Food Category</Text>
              <TextInput
                style={styles.textInput}
                value={newStallFormData.category}
                onChangeText={(text) => setNewStallFormData((prev) => ({ ...prev, category: text }))}
                placeholder="e.g. Fast Food, Beverages, South Indian"
                placeholderTextColor="#94A3B8"
              />

              {/* CAMPUS HUB / LOCATION SELECTION (WRAPPED PILLS JUST LIKE MARKETS) */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Select Campus / Location *</Text>
              <View style={styles.marketPillsContainer}>
                {allLocations.map((loc) => {
                  const isSelected = selectedCreateLocationId === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.marketSelectPill, isSelected && styles.marketSelectPillActive]}
                      onPress={() => {
                        const locMarkets = getMarketsForLocation(loc);
                        setNewStallFormData((prev) => ({
                          ...prev,
                          locationId: loc.id,
                          market: locMarkets[0] || loc.name,
                        }));
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'business-outline'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.marketSelectPillText,
                          isSelected && styles.marketSelectPillTextActive,
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* MARKET / CAMPUS ZONE SELECTION (DYNAMIC PILLS FOR SELECTED LOCATION) */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Select Campus Market / Zone *</Text>
              <View style={styles.marketPillsContainer}>
                {modalCreateMarkets.map((marketName) => {
                  const isSelected = (newStallFormData.market || modalCreateMarkets[0]) === marketName;
                  return (
                    <TouchableOpacity
                      key={marketName}
                      style={[
                        styles.marketSelectPill,
                        isSelected && styles.marketSelectPillActive,
                      ]}
                      onPress={() =>
                        setNewStallFormData((prev) => ({ ...prev, market: marketName }))
                      }
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'location-outline'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.marketSelectPillText,
                          isSelected && styles.marketSelectPillTextActive,
                        ]}
                      >
                        {marketName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* UPI ID (FOR PAYMENTS) */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>UPI ID (for payments)</Text>
              <TextInput
                style={styles.textInput}
                value={newStallFormData.upiId}
                onChangeText={(text) => setNewStallFormData((prev) => ({ ...prev, upiId: text }))}
                placeholder="e.g. yourname@oksbi"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddStallModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#EF4123' }]}
                onPress={handleCreateStall}
                disabled={creatingStall}
              >
                {creatingStall ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Create Stall</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL 1: EDIT STALL DETAILS (WITH MARKET SELECTOR)  */}
      {/* =================================================== */}
      <Modal visible={showEditStoreModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Stall Details</Text>
                <Text style={styles.modalSubtitle}>Updates reflect live across customer app</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditStoreModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Stall Name</Text>
              <TextInput
                style={styles.textInput}
                value={storeFormData.name}
                onChangeText={(text) => setStoreFormData((prev) => ({ ...prev, name: text }))}
                placeholder="e.g. Pizza Bar, Food Bowl"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Food Category</Text>
              <TextInput
                style={styles.textInput}
                value={storeFormData.category}
                onChangeText={(text) => setStoreFormData((prev) => ({ ...prev, category: text }))}
                placeholder="e.g. Fast Food, Beverages, Rolls"
                placeholderTextColor="#94A3B8"
              />

              {/* CAMPUS HUB / LOCATION SELECTION (WRAPPED PILLS JUST LIKE MARKETS) */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Select Campus / Location *</Text>
              <View style={styles.marketPillsContainer}>
                {allLocations.map((loc) => {
                  const isSelected = selectedEditLocationId === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.marketSelectPill, isSelected && styles.marketSelectPillActive]}
                      onPress={() => {
                        const locMarkets = getMarketsForLocation(loc);
                        setStoreFormData((prev) => ({
                          ...prev,
                          locationId: loc.id,
                          market: locMarkets[0] || loc.name,
                        }));
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'business-outline'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.marketSelectPillText,
                          isSelected && styles.marketSelectPillTextActive,
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* MARKET / CAMPUS ZONE SELECTION */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Select Campus Market / Zone *</Text>
              <View style={styles.marketPillsContainer}>
                {modalEditMarkets.map((marketName) => {
                  const isSelected = (storeFormData.market || modalEditMarkets[0]) === marketName;
                  return (
                    <TouchableOpacity
                      key={marketName}
                      style={[
                        styles.marketSelectPill,
                        isSelected && styles.marketSelectPillActive,
                      ]}
                      onPress={() =>
                        setStoreFormData((prev) => ({ ...prev, market: marketName }))
                      }
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'location-outline'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.marketSelectPillText,
                          isSelected && styles.marketSelectPillTextActive,
                        ]}
                      >
                        {marketName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditStoreModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveStoreDetails}
                disabled={savingStore}
              >
                {savingStore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL 1B: EDIT AUTOMATED STALL TIMING & SCHEDULE    */}
      {/* =================================================== */}
      <Modal visible={showEditTimingModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Automated Stall Timing</Text>
                <Text style={styles.modalSubtitle}>Daily schedule synced with Super Admin (IST)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditTimingModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Auto Schedule Switch */}
            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalToggleTitle}>Enable Automated Schedule</Text>
                <Text style={styles.modalToggleSubtitle}>
                  Auto-opens & closes your stall at scheduled hours
                </Text>
              </View>
              <Switch
                value={timingFormData.isAutomated}
                onValueChange={(val) => setTimingFormData((prev) => ({ ...prev, isAutomated: val }))}
                trackColor={{ false: '#E2E8F0', true: '#4F46E5' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Opening Time Section */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Opens at (24-Hour IST)</Text>
                <Text style={styles.liveTimePill}>{formatTime12h(timingFormData.openingTime)}</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={timingFormData.openingTime}
                onChangeText={(text) => setTimingFormData((prev) => ({ ...prev, openingTime: text }))}
                placeholder="10:00"
                placeholderTextColor="#94A3B8"
                maxLength={5}
              />
              {/* Presets */}
              <View style={styles.presetChipRow}>
                {['08:00', '09:00', '10:00', '11:00'].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      timingFormData.openingTime === preset && styles.presetChipActive,
                    ]}
                    onPress={() => setTimingFormData((prev) => ({ ...prev, openingTime: preset }))}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        timingFormData.openingTime === preset && styles.presetChipTextActive,
                      ]}
                    >
                      {formatTime12h(preset)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Closing Time Section */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Closes at (24-Hour IST)</Text>
                <Text style={styles.liveTimePill}>{formatTime12h(timingFormData.closingTime)}</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={timingFormData.closingTime}
                onChangeText={(text) => setTimingFormData((prev) => ({ ...prev, closingTime: text }))}
                placeholder="22:00"
                placeholderTextColor="#94A3B8"
                maxLength={5}
              />
              {/* Presets */}
              <View style={styles.presetChipRow}>
                {['21:00', '22:00', '23:00', '00:00'].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      timingFormData.closingTime === preset && styles.presetChipActive,
                    ]}
                    onPress={() => setTimingFormData((prev) => ({ ...prev, closingTime: preset }))}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        timingFormData.closingTime === preset && styles.presetChipTextActive,
                      ]}
                    >
                      {formatTime12h(preset)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sync hint */}
            <Text style={styles.fieldHint}>
              Directly syncs to PostgreSQL DB and updates Super Admin Panel & customer app in real-time.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditTimingModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveTimingDetails}
                disabled={savingTiming}
              >
                {savingTiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL 2: EDIT OWNER & PAYOUT UPI ID                 */}
      {/* =================================================== */}
      <Modal visible={showEditOwnerModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Owner Profile</Text>
                <Text style={styles.modalSubtitle}>Configure contact & settlement payout details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditOwnerModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={ownerFormData.name}
              onChangeText={(text) => setOwnerFormData((prev) => ({ ...prev, name: text }))}
              placeholder="Your Full Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Payout UPI ID (Super Admin Settlements)</Text>
            <TextInput
              style={styles.textInput}
              value={ownerFormData.upiId}
              onChangeText={(text) => setOwnerFormData((prev) => ({ ...prev, upiId: text }))}
              placeholder="e.g. 9876543210@paytm, vendor@okhdfcbank"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Text style={styles.fieldHint}>
              Directly syncs to the Super Admin Panel for your daily T+1 revenue payouts.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditOwnerModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveOwnerDetails}
                disabled={savingOwner}
              >
                {savingOwner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL 3: ADD NEW EMPLOYEE                           */}
      {/* =================================================== */}
      <Modal visible={showAddEmployeeModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Kitchen Staff</Text>
                <Text style={styles.modalSubtitle}>Create mobile login for your employee</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddEmployeeModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Employee Name</Text>
            <TextInput
              style={styles.textInput}
              value={employeeFormData.name}
              onChangeText={(text) => setEmployeeFormData((prev) => ({ ...prev, name: text }))}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Login Email or Phone</Text>
            <TextInput
              style={styles.textInput}
              value={employeeFormData.email}
              onChangeText={(text) => setEmployeeFormData((prev) => ({ ...prev, email: text }))}
              placeholder="e.g. rahul@stall.com or 9876543210"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Create Password</Text>
            <TextInput
              style={styles.textInput}
              value={employeeFormData.password}
              onChangeText={(text) => setEmployeeFormData((prev) => ({ ...prev, password: text }))}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddEmployeeModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#7E22CE' }]}
                onPress={handleAddEmployee}
                disabled={savingEmployee}
              >
                {savingEmployee ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL 4: EDIT EMPLOYEE (NAME / PASSWORD RESET)       */}
      {/* =================================================== */}
      <Modal visible={showEditEmployeeModal} transparent animationType="slide" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Staff Details</Text>
                <Text style={styles.modalSubtitle}>{selectedEmployee?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditEmployeeModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Employee Name</Text>
            <TextInput
              style={styles.textInput}
              value={editEmployeeFormData.name}
              onChangeText={(text) => setEditEmployeeFormData((prev) => ({ ...prev, name: text }))}
              placeholder="Employee Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>New Password (leave blank to keep current)</Text>
            <TextInput
              style={styles.textInput}
              value={editEmployeeFormData.password}
              onChangeText={(text) => setEditEmployeeFormData((prev) => ({ ...prev, password: text }))}
              placeholder="Leave blank to keep unchanged"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditEmployeeModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#2563EB' }]}
                onPress={handleUpdateEmployee}
                disabled={updatingEmployee}
              >
                {updatingEmployee ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Update Staff</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 110,
  },
  storeName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  topHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIconBtnActive: {
    backgroundColor: '#334155',
    borderColor: '#EF4123',
  },
  stallSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 2,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: 4,
  },
  stallSwitchCardOpen: {
    borderColor: '#059669',
    backgroundColor: '#064E3B',
  },
  stallSwitchCardClosed: {
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stallSwitchText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },

  /* Hero Stall Card */
  heroCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrapper: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  stallImage: {
    width: '100%',
    height: '100%',
  },
  stallImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderStallText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  placeholderSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  statusChipWrapper: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusPillOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
  },
  statusPillClosed: {
    backgroundColor: 'rgba(100, 116, 139, 0.92)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotOpen: {
    backgroundColor: '#FFFFFF',
  },
  statusDotClosed: {
    backgroundColor: '#CBD5E1',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillTextOpen: {
    color: '#FFFFFF',
  },
  statusPillTextClosed: {
    color: '#FFFFFF',
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stallMetaBox: {
    padding: 16,
  },
  stallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stallNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  stallLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stallLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  editStallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    flexShrink: 0,
  },
  editStallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Generic Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    flexShrink: 0,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },

  /* Owner Info Grid */
  ownerInfoGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ownerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    maxWidth: '42%',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  upiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    maxWidth: '100%',
  },
  upiBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  upiUnsetLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4123',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  ownerRoleBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  ownerRoleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  employeeRoleBadge: {
    backgroundColor: '#FAF5FF',
  },
  employeeRoleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  employeeRestrictedText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  /* Employees Management Section */
  addEmployeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7E22CE',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexShrink: 0,
  },
  addEmployeeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  staffNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  staffNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#6B21A8',
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyEmployeesBox: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    paddingHorizontal: 20,
  },
  emptyEmployeesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptyEmployeesSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  emptyAddBtn: {
    marginTop: 12,
    backgroundColor: '#7E22CE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  employeeList: {
    gap: 10,
  },
  employeeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  employeeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7E22CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empAvatarInactive: {
    backgroundColor: '#94A3B8',
  },
  empAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  empName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  empEmail: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  empStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  empStatusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  empStatusInactive: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  empStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  empStatusDotActive: {
    backgroundColor: '#10B981',
  },
  empStatusDotInactive: {
    backgroundColor: '#D97706',
  },
  empStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  empStatusTextActive: {
    color: '#10B981',
  },
  empStatusTextInactive: {
    color: '#D97706',
  },
  empActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  empActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  empActionBtnActivate: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: '#F0FDF4',
  },
  empActionBtnDeactivate: {
    borderColor: 'rgba(217, 119, 6, 0.3)',
    backgroundColor: '#FFFBEB',
  },
  empActionBtnDelete: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: '#FEF2F2',
  },
  empActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Logout Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 16,
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    margin: 0,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Campus Hub Location Chips */
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  locationChipActive: {
    backgroundColor: '#EF4123',
    borderColor: '#EF4123',
  },
  locationChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationChipTitleActive: {
    color: '#FFFFFF',
  },
  locationChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  locationChipSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  /* Market Selector Pills */
  marketPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  marketSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  marketSelectPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  marketSelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  marketSelectPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Automated Stall Timing Styles */
  timingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  timingDotActive: {
    backgroundColor: '#10B981',
  },
  timingDotManual: {
    backgroundColor: '#F59E0B',
  },
  timingToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  timingToggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  timingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timingPillCol: {
    flex: 1,
  },
  timingPillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  timingPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timingPillValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  timing24hTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 4,
  },
  timingDividerArrow: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  timingSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  timingSyncText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },

  /* Timing Modal Styles */
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  modalToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalToggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  liveTimePill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  presetChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  presetChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Multi-Stall Card & Button Styles */
  addStallHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4123',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addStallHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stallRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  stallRowCardActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EF4123',
  },
  stallRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallRowIconActive: {
    backgroundColor: '#FFEDD5',
  },
  stallRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  stallRowNameActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  activeBadgePill: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activeBadgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stallRowSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  switchStallBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  switchStallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
