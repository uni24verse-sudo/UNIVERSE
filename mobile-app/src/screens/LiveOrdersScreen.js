import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  RefreshControl,
  ScrollView,
  Dimensions,
  Switch,
  Vibration,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';
import { useAudioAlerts } from '../hooks/useAudioAlerts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
const getNotifications = () => {
  if (Platform.OS === 'web') return null;
  try {
    const Constants = require('expo-constants')?.default;
    const { ExecutionEnvironment } = require('expo-constants') || {};
    const { isRunningInExpoGo } = require('expo');
    const isExpoGo = Boolean(
      (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) ||
      Constants?.appOwnership === 'expo' ||
      Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
      Constants?.executionEnvironment === 'storeClient'
    );
    if (isExpoGo) return null;
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

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

// Real-Time Auto-Cancellation Countdown Timer
function AutoCancelTimer({ order }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      // 15 mins for pre-order, 5 mins for regular order
      const durationMs = (order.isPreOrder ? 15 : 5) * 60 * 1000;
      const createdAtMs = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
      const deadline = order.acceptDeadline ? new Date(order.acceptDeadline).getTime() : createdAtMs + durationMs;
      const diff = deadline - Date.now();

      if (diff <= 0) {
        setTimeLeft(0);
        setIsUrgent(true);
      } else {
        setTimeLeft(diff);
        setIsUrgent(diff < 60000); // Urgent if less than 60 seconds
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt, order.acceptDeadline, order.isPreOrder]);

  if (timeLeft === null) return null;

  if (timeLeft <= 0) {
    return (
      <View style={[styles.autoCancelBanner, styles.autoCancelExpired]}>
        <Ionicons name="alert-circle" size={16} color="#DC2626" />
        <Text style={[styles.autoCancelText, { color: '#DC2626' }]}>
          ⚠️ Auto-Cancelling... Acceptance window expired
        </Text>
      </View>
    );
  }

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <View style={[
      styles.autoCancelBanner,
      isUrgent ? styles.autoCancelUrgent : styles.autoCancelNormal
    ]}>
      <Ionicons 
        name={isUrgent ? 'alarm' : 'time-outline'} 
        size={16} 
        color={isUrgent ? '#DC2626' : '#D97706'} 
      />
      <Text style={[
        styles.autoCancelText, 
        { color: isUrgent ? '#DC2626' : '#92400E', fontWeight: isUrgent ? '800' : '700' }
      ]}>
        {isUrgent ? `⚠️ Urgent: Auto-cancels in ${formatted}` : `⏳ Auto-cancels in ${formatted}`}
      </Text>
      <Text style={[styles.autoCancelSubText, { color: isUrgent ? '#EF4444' : '#B45309' }]}>
        ({order.isPreOrder ? '15m' : '5m'} rule)
      </Text>
    </View>
  );
}

// Illustrated Empty State Component
function EmptyQueueState({ type }) {
  let icon = 'restaurant-outline';
  let title = 'Queue is Clear!';
  let sub = 'New incoming student orders will chime and appear here automatically.';
  let color = '#10B981';
  let bg = '#ECFDF5';

  if (type === 'Pre-Orders') {
    icon = 'calendar-outline';
    title = 'No Scheduled Pre-Orders';
    sub = 'Advance scheduled student orders will appear here.';
    color = '#8B5CF6';
    bg = '#F5F3FF';
  } else if (type === 'Ready') {
    icon = 'bag-check-outline';
    title = 'No Orders Waiting Pickup';
    sub = 'Orders marked ready will appear here for student handover.';
    color = '#EF4123';
    bg = '#FFF7ED';
  } else if (type === 'History') {
    icon = 'receipt-outline';
    title = 'No Past Orders Today';
    sub = 'Completed and handed over orders will appear here.';
    color = '#64748B';
    bg = '#F1F5F9';
  }

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={36} color={color} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

export default function LiveOrdersScreen({ navigation }) {
  const { user, stores, activeStore, switchActiveStore, refreshStores } = useContext(AuthContext);
  const { socket, isConnected, socketError } = useContext(SocketContext);
  const isEmployee = user?.role === 'employee' || user?.role === 'staff';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Active'); // 'Active', 'Ready', 'History'
  const scrollViewRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [togglingAutoAccept, setTogglingAutoAccept] = useState(false);
  
  // Multi-stall interactive switcher & cross-stall notifications
  const [showStallSwitcherModal, setShowStallSwitcherModal] = useState(false);
  const [crossStallNotification, setCrossStallNotification] = useState(null);
  const [otherStallPendingCounts, setOtherStallPendingCounts] = useState({});
  const [showQuickAddStallModal, setShowQuickAddStallModal] = useState(false);
  const [allLocations, setAllLocations] = useState(DEFAULT_CAMPUS_LOCATIONS);
  const [newStallForm, setNewStallForm] = useState({
    name: '',
    category: 'Fast Food',
    market: 'BH1 Market',
    locationId: '69e7913ddcad79aeb3f8ce23',
    upiId: '',
  });
  const [creatingStall, setCreatingStall] = useState(false);

  // Delivery Dispatch & Management Hub States
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDeliveryHubModal, setShowDeliveryHubModal] = useState(false);
  const [deliveryHubTab, setDeliveryHubTab] = useState('all'); // 'all', 'cooking', 'ready', 'delivering'
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [dispatchOrdersList, setDispatchOrdersList] = useState([]);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [customRiderName, setCustomRiderName] = useState('');
  const [customRiderPhone, setCustomRiderPhone] = useState('');
  const [dispatchingRider, setDispatchingRider] = useState(false);

  const isAnyModalOpen = Boolean(showStallSwitcherModal || showQuickAddStallModal || showDispatchModal || showDeliveryHubModal);

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

  // Fetch campus locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await apiClient.get('/store/locations/list');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAllLocations(res.data);
        }
      } catch (err) {
        console.log('Failed to fetch locations in LiveOrdersScreen:', err.message);
      }
    };
    fetchLocations();
  }, []);

  const { 
    isAudioEnabled, 
    toggleAudio, 
    playTestSound, 
    syncPendingOrders, 
    queueAnnouncement, 
    cancelAnnouncement, 
    queuePreOrderReminder,
    speakOrderAlert 
  } = useAudioAlerts();
  const alertedPreOrdersRef = useRef(new Set());

  // Current active store identification
  const currentStoreId = activeStore?._id || activeStore?.id || storeData?._id || storeData?.id || user?.storeId || user?.id;

  // Selected Location & Dynamic Markets for Quick Add Modal
  const selectedLiveLocationId = newStallForm.locationId || storeData?.locationId || activeStore?.locationId || (allLocations.length > 0 ? allLocations[0].id : '69e7913ddcad79aeb3f8ce23');
  const selectedLiveLocation = allLocations.find(l => l.id === selectedLiveLocationId) || allLocations[0];
  const liveModalMarkets = useMemo(() => {
    return getMarketsForLocation(selectedLiveLocation);
  }, [selectedLiveLocation]);

  // Calculate pending orders across all other stalls
  const totalOtherPending = useMemo(() => {
    return Object.entries(otherStallPendingCounts).reduce((sum, [sId, count]) => {
      if (sId !== currentStoreId) {
        return sum + (count || 0);
      }
      return sum;
    }, 0);
  }, [otherStallPendingCounts, currentStoreId]);

  // Sync active store attributes to local state
  useEffect(() => {
    if (activeStore) {
      setStoreData(activeStore);
      setIsStoreOpen(activeStore.isOpen !== false);
      setAutoAcceptOrders(Boolean(activeStore.autoAcceptOrders));
    }
  }, [activeStore]);

  const isFocused = useIsFocused();

  // Continuously monitor pending orders and repeat single bell ding every 10s until accepted or rejected
  useEffect(() => {
    const pendingCount = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
    syncPendingOrders(isFocused ? pendingCount : 0);
  }, [orders, isFocused, syncPendingOrders]);

  const fetchStoreStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/store/my-stores');
      if (res.data && res.data.length > 0) {
        const found = activeStore ? res.data.find(s => (s.id || s._id) === (activeStore.id || activeStore._id)) : null;
        const current = found || res.data[0];
        setStoreData(current);
        setIsStoreOpen(current.isOpen !== false);
        setAutoAcceptOrders(Boolean(current.autoAcceptOrders));
      }
    } catch (e) {
      console.error('Failed to fetch store status:', e.message);
    }
  }, [activeStore]);

  const handleSwitchStore = async (targetStore) => {
    if (isEmployee) return;
    setShowStallSwitcherModal(false);
    setOrders([]);
    const targetStoreObj = typeof targetStore === 'object' && targetStore !== null 
      ? targetStore 
      : (stores || []).find(s => String(s.id || s._id) === String(targetStore));

    if (targetStoreObj) {
      setStoreData(targetStoreObj);
      setIsStoreOpen(targetStoreObj.isOpen !== false);
      setAutoAcceptOrders(Boolean(targetStoreObj.autoAcceptOrders));
    }
    await switchActiveStore(targetStoreObj || targetStore);
    const targetId = typeof targetStore === 'string' ? targetStore : (targetStore?.id || targetStore?._id);
    if (targetId) {
      setOtherStallPendingCounts(prev => ({
        ...prev,
        [targetId]: 0
      }));
    }
    setCrossStallNotification(null);
  };

  const handleCreateNewStall = async () => {
    if (isEmployee) {
      Alert.alert('Permission Denied', 'Only the Cart Owner can create new stalls.');
      return;
    }
    if (!newStallForm.name.trim()) {
      Alert.alert('Required', 'Please enter a name for the new stall.');
      return;
    }
    const finalLocationId = newStallForm.locationId || selectedLiveLocationId || (allLocations.length > 0 ? allLocations[0].id : null);
    const finalMarket = newStallForm.market || liveModalMarkets[0] || 'BH1 Market';

    setCreatingStall(true);
    try {
      const res = await apiClient.post('/store/create', {
        name: newStallForm.name.trim(),
        category: newStallForm.category || 'General',
        market: finalMarket,
        locationId: finalLocationId,
        upiId: newStallForm.upiId ? newStallForm.upiId.trim() : ''
      });
      
      Alert.alert('Stall Created! 🎉', `"${res.data.name}" is now live and linked to ${selectedLiveLocation?.name || 'campus'}.`);
      setShowQuickAddStallModal(false);
      setNewStallForm({ name: '', category: 'Fast Food', market: '', locationId: '', upiId: '' });
      
      const updatedStores = await refreshStores();
      const created = (updatedStores || []).find(s => (s.id || s._id) === (res.data.id || res.data._id));
      if (created) {
        await handleSwitchStore(created);
      }
    } catch (err) {
      console.error('Failed to create stall:', err);
      Alert.alert('Creation Failed', err.response?.data?.message || err.message || 'Could not create stall.');
    } finally {
      setCreatingStall(false);
    }
  };

  const handleToggleStoreStatus = async (forceCancel = false) => {
    const storeId = currentStoreId;
    if (!storeId || togglingStatus) return;

    // Instant optimistic UI update so switch slides over immediately
    const previousState = isStoreOpen;
    const nextState = !previousState;
    setIsStoreOpen(nextState);
    setTogglingStatus(true);

    try {
      const res = await apiClient.put(`/store/${storeId}/toggle-status`, {
        forceCancelPending: forceCancel
      });

      if (res.data?.requiresConfirmation) {
        // Revert until vendor confirms cancellation of pending orders
        setIsStoreOpen(previousState);
        Alert.alert(
          '⚠️ Pending Orders Alert',
          res.data.message || `You have ${res.data.pendingCount} pending order(s) waiting for acceptance.\n\nClosing your stall will automatically cancel these orders and issue instant refunds to students.\n\nOrders already in cooking will remain unaffected.\n\nDo you want to proceed?`,
          [
            { 
              text: 'Keep Stall Open', 
              style: 'cancel',
              onPress: () => setTogglingStatus(false)
            },
            {
              text: 'Close Stall & Refund',
              style: 'destructive',
              onPress: () => handleToggleStoreStatus(true)
            }
          ],
          { cancelable: true }
        );
        return;
      }

      if (res.data?.isOpen !== undefined) {
        setIsStoreOpen(res.data.isOpen);
      }
      refreshStores();
    } catch (error) {
      console.error('Failed to toggle stall status:', error);
      setIsStoreOpen(previousState);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update stall status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleToggleAutoAccept = async () => {
    const storeId = currentStoreId;
    if (!storeId || togglingAutoAccept) return;

    // Instant optimistic UI update
    const previousState = autoAcceptOrders;
    const nextState = !previousState;
    setAutoAcceptOrders(nextState);
    setTogglingAutoAccept(true);

    try {
      const res = await apiClient.put(`/store/${storeId}/toggle-auto-accept`);
      if (res.data?.autoAcceptOrders !== undefined) {
        setAutoAcceptOrders(Boolean(res.data.autoAcceptOrders));
      }
      refreshStores();
    } catch (error) {
      console.error('Failed to toggle auto-accept:', error);
      setAutoAcceptOrders(previousState);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update auto-accept');
    } finally {
      setTogglingAutoAccept(false);
    }
  };

  // Tick every 30 seconds to refresh relative times and pre-order countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // 🔔 Kitchen Reminder: Check pre-orders every tick and alert when time <= 20 min!
  useEffect(() => {
    orders.forEach(order => {
      if (order.isPreOrder && order.scheduledTime && (order.status === 'Confirmed' || order.status === 'Pending')) {
        const parsed = parseScheduledTimeIST(order.scheduledTime);
        if (parsed && parsed.diffMinutes <= 20 && parsed.diffMinutes >= -30) {
          const orderId = order._id || order.id;
          if (!alertedPreOrdersRef.current.has(orderId)) {
            alertedPreOrdersRef.current.add(orderId);

            // 1. Play chime + Speak TTS alert
            queuePreOrderReminder(order);

            // 2. Trigger local push notification & vibration
            try {
              const notifMod = getNotifications();
              if (notifMod?.scheduleNotificationAsync) {
                notifMod.scheduleNotificationAsync({
                  content: {
                    title: `🔥 Start Cooking Pre-Order #${order.orderNumber || ''}!`,
                    body: `Scheduled for ${order.scheduledTime}. Preparation window is open now.`,
                    sound: true,
                    priority: notifMod.AndroidNotificationPriority?.HIGH,
                  },
                  trigger: null,
                }).catch(e => console.log('[PreOrderNotification] Error:', e));
              }
            } catch (err) {
              console.log('[PreOrderNotification] Local notification bypassed:', err.message);
            }
          }
        }
      }
    });
  }, [orders, tick, queuePreOrderReminder]);

  // Sync app badge count for active orders
  useEffect(() => {
    const activeCount = orders.filter(o => 
      ['Pending', 'Confirmed', 'Cooking'].includes(o.status)
    ).length;
    
    try {
      const notifMod = getNotifications();
      if (notifMod?.setBadgeCountAsync) {
        notifMod.setBadgeCountAsync(activeCount).catch(() => {});
      }
    } catch (e) {}
  }, [orders]);

  const fetchOrders = useCallback(async (isPullRefresh = false) => {
    if (!currentStoreId) return;
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await apiClient.get(`/orders/${currentStoreId}/vendor-orders`);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentStoreId]);

  const fetchDeliveryStaff = useCallback(async () => {
    if (!currentStoreId) return;
    try {
      const res = await apiClient.get(`/delivery/staff/${currentStoreId}`);
      setDeliveryStaff(res.data || []);
    } catch (e) {
      console.log('Failed to fetch delivery staff:', e.message);
    }
  }, [currentStoreId]);

  // Refetch when focused or active stall changes
  useEffect(() => {
    if (isFocused && currentStoreId) {
      fetchOrders();
      fetchStoreStatus();
      fetchDeliveryStaff();
    }
  }, [isFocused, currentStoreId, fetchOrders, fetchStoreStatus, fetchDeliveryStaff]);

  useEffect(() => {
    if (isConnected && currentStoreId) {
      fetchOrders();
      fetchStoreStatus();
      fetchDeliveryStaff();
    }
  }, [isConnected, currentStoreId, fetchOrders, fetchStoreStatus, fetchDeliveryStaff]);

  // Socket listeners for real-time order lifecycle with multi-stall cross-alerting
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      const orderStoreId = String(newOrder.storeId || '');
      const activeId = String(currentStoreId || '');
      const isForActiveStall = Boolean(orderStoreId && activeId && orderStoreId === activeId);

      if (isForActiveStall) {
        setOrders((prev) => {
          if (prev.some((o) => (o._id || o.id) === (newOrder._id || newOrder.id))) return prev;
          return [newOrder, ...prev];
        });
        speakOrderAlert(activeStore?.name || 'your stall', newOrder.orderNumber);
        try {
          Vibration.vibrate([0, 500, 200, 500]);
        } catch (e) {}
      } else if (!isEmployee) {
        // Multi-stall cross alert: ONLY for Cart Owner!
        const targetStore = (stores || []).find(s => String(s.id || s._id) === orderStoreId);
        const storeName = targetStore?.name || 'Another Stall';

        speakOrderAlert(storeName, newOrder.orderNumber);
        try {
          Vibration.vibrate([0, 500, 200, 500]);
        } catch (e) {}

        setOtherStallPendingCounts(prev => ({
          ...prev,
          [orderStoreId]: (prev[orderStoreId] || 0) + 1
        }));

        setCrossStallNotification({
          storeId: orderStoreId,
          storeName,
          orderNumber: newOrder.orderNumber,
          timestamp: Date.now()
        });
      }
    };

    const handleStatusUpdate = (updatedOrder) => {
      if (String(updatedOrder.storeId) === String(currentStoreId)) {
        cancelAnnouncement(updatedOrder._id); 
        setOrders((prev) => prev.map((o) => ((o._id || o.id) === (updatedOrder._id || updatedOrder.id) ? updatedOrder : o)));
      } else if (!isEmployee) {
        if (['Completed', 'Cancelled', 'Confirmed', 'Cooking'].includes(updatedOrder.status)) {
          const uStoreId = String(updatedOrder.storeId);
          setOtherStallPendingCounts(prev => ({
            ...prev,
            [uStoreId]: Math.max(0, (prev[uStoreId] || 0) - 1)
          }));
        }
      }
    };

    const handleCancelled = (cancelledOrder) => {
      if (String(cancelledOrder.storeId) === String(currentStoreId)) {
        cancelAnnouncement(cancelledOrder._id); 
        setOrders((prev) => prev.map((o) => ((o._id || o.id) === (cancelledOrder._id || cancelledOrder.id) ? cancelledOrder : o)));
      } else if (!isEmployee) {
        const cStoreId = String(cancelledOrder.storeId);
        setOtherStallPendingCounts(prev => ({
          ...prev,
          [cStoreId]: Math.max(0, (prev[cStoreId] || 0) - 1)
        }));
      }
    };

    const handleStoreStatus = ({ storeId, isOpen }) => {
      if (String(storeId) === String(currentStoreId)) {
        setIsStoreOpen(isOpen);
      }
      refreshStores();
    };

    const handleAutoAcceptUpdate = ({ storeId, autoAcceptOrders: newStatus }) => {
      if (String(storeId) === String(currentStoreId)) {
        setAutoAcceptOrders(Boolean(newStatus));
      }
      refreshStores();
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_cancelled', handleCancelled);
    socket.on('store_status_update', handleStoreStatus);
    socket.on('store_auto_accept_update', handleAutoAcceptUpdate);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_cancelled', handleCancelled);
      socket.off('store_status_update', handleStoreStatus);
      socket.off('store_auto_accept_update', handleAutoAcceptUpdate);
    };
  }, [socket, cancelAnnouncement, currentStoreId, activeStore, stores, speakOrderAlert, refreshStores, isEmployee]);

  const updateStatus = async (orderId, currentStatus, newStatus, force = false) => {
    try {
      const targetOrder = orders.find(o => o._id === orderId);
      if (targetOrder && targetOrder.status !== currentStatus) {
        Alert.alert('Hold on!', 'This order has already been updated by another team member.');
        return;
      }

      // Tactile physical feedback for kitchen vendor
      Vibration.vibrate(40);

      // Optimistic Update
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus, force });
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Conflict', 'Someone else already processed this order!');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update order status');
      }
      fetchOrders();
    }
  };

  const handleDirectHandover = async (orderId, orderNumber) => {
    try {
      // Tactile double vibration on completed handover
      Vibration.vibrate([0, 50, 40, 80]);

      // Optimistic Update
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: 'Completed' } : o)));
      await apiClient.put(`/orders/${orderId}/handover-direct`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete handover');
      fetchOrders();
    }
  };

  // Safe handler to allow early cooking with kitchen confirmation
  const handleStartCookingPreOrder = (order, preOrderInfo) => {
    if (preOrderInfo.locked) {
      Alert.alert(
        '⏳ Scheduled Pre-Order',
        `Order #${order.orderNumber || ''} is scheduled for ${order.scheduledTime} (in ${preOrderInfo.diffMins} minutes).\n\nDo you want to begin cooking early?`,
        [
          { text: 'Keep on Hold', style: 'cancel' },
          { 
            text: 'Yes, Start Cooking', 
            style: 'default', 
            onPress: () => updateStatus(order._id, 'Confirmed', 'Cooking', true) 
          }
        ]
      );
    } else {
      updateStatus(order._id, 'Confirmed', 'Cooking', false);
    }
  };

  const handleCompleteAllReady = async () => {
    const readyCount = orders.filter(o => o.status === 'Ready').length;
    if (readyCount === 0) return;

    Alert.alert(
      'Complete All Ready Orders?',
      `Are you sure you want to mark all ${readyCount} Ready orders as handed over to students?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Yes, Complete All (${readyCount})`,
          style: 'default',
          onPress: async () => {
            const storeId = user?.storeId || user?.id;
            if (!storeId) return;

            try {
              Vibration.vibrate([0, 60, 50, 100]);
              // Optimistic update
              setOrders((prev) => prev.map((o) => (o.status === 'Ready' ? { ...o, status: 'Completed' } : o)));
              const res = await apiClient.put(`/orders/store/${storeId}/complete-all-ready`);
              Alert.alert('Success', res.data?.message || `Completed ${readyCount} orders!`);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to bulk complete orders');
              fetchOrders();
            }
          }
        }
      ]
    );
  };

  // ---------------------------------------------------------
  // Universal Delivery Management Memos & Dispatch Handlers
  // ---------------------------------------------------------
  const deliveryOrders = useMemo(() => {
    return orders.filter(o => String(o.orderType || '').toLowerCase() === 'delivery' && o.status !== 'Cancelled');
  }, [orders]);

  const activeDeliveryOrders = useMemo(() => {
    return deliveryOrders.filter(o => o.status !== 'Completed');
  }, [deliveryOrders]);

  const preparingDeliveryOrders = useMemo(() => {
    return deliveryOrders.filter(o => ['Pending', 'Confirmed', 'Cooking'].includes(o.status));
  }, [deliveryOrders]);

  const readyDeliveryOrders = useMemo(() => {
    return deliveryOrders.filter(o => o.status === 'Ready');
  }, [deliveryOrders]);

  const deliveringOrders = useMemo(() => {
    return deliveryOrders.filter(o => o.status === 'Out for Delivery' || Boolean(o.riderName && o.status !== 'Completed'));
  }, [deliveryOrders]);

  const toggleBatchSelectOrder = (orderId) => {
    setSelectedBatchIds(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleSelectAllReady = () => {
    const readyIds = readyDeliveryOrders.map(o => o._id || o.id);
    setSelectedBatchIds(readyIds);
  };

  const handleClearBatchSelection = () => {
    setSelectedBatchIds([]);
  };

  const handleLaunchBatchDispatch = () => {
    const targetOrders = deliveryOrders.filter(o => selectedBatchIds.includes(o._id || o.id));
    if (targetOrders.length === 0) {
      Alert.alert('Select Orders', 'Please tap the checkboxes to select at least one ready order to batch dispatch.');
      return;
    }
    setDispatchOrdersList(targetOrders);
    if (deliveryStaff.length > 0) {
      setSelectedRiderId(deliveryStaff[0].id || deliveryStaff[0]._id);
    } else {
      setSelectedRiderId('custom');
    }
    setShowDispatchModal(true);
  };

  const openSingleDispatchModal = (order) => {
    setDispatchOrdersList([order]);
    if (deliveryStaff.length > 0) {
      setSelectedRiderId(deliveryStaff[0].id || deliveryStaff[0]._id);
    } else {
      setSelectedRiderId('custom');
    }
    setShowDispatchModal(true);
  };

  const openBatchDispatchModal = () => {
    if (readyDeliveryOrders.length > 0) {
      setDispatchOrdersList(readyDeliveryOrders);
    } else if (activeDeliveryOrders.length > 0) {
      setDispatchOrdersList(activeDeliveryOrders);
    } else {
      setShowDeliveryHubModal(true);
      return;
    }
    if (deliveryStaff.length > 0) {
      setSelectedRiderId(deliveryStaff[0].id || deliveryStaff[0]._id);
    } else {
      setSelectedRiderId('custom');
    }
    setShowDispatchModal(true);
  };

  const handleShareRiderLink = async (order) => {
    const token = order.deliveryBatchId || order.id || order._id;
    const frontendBase = 'https://universe-lpu.com';
    const dispatchLink = `${frontendBase}/deliver/${token}`;
    const cleanPhone = (order.riderPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const stallName = storeData?.name || activeStore?.name || 'UniVerse Stall';

    const msg = `🛵 *UniVerse Delivery Trip*\n` +
      `Stall: *${stallName}*\n` +
      `Order: #${order.orderNumber} • ${order.deliveryAddress || 'Campus'}\n\n` +
      `👉 *Open Navigation Cockpit:*\n${dispatchLink}\n\n` +
      `Customer OTP PIN: *${order.deliveryOtp || '****'}*`;

    const waUrl = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    const webWaUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;

    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Linking.openURL(webWaUrl);
      }
    } catch (e) {
      Linking.openURL(webWaUrl);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchOrdersList || dispatchOrdersList.length === 0) {
      Alert.alert('Error', 'No orders selected for dispatch.');
      return;
    }

    let riderName = '';
    let riderPhone = '';

    if (selectedRiderId === 'custom') {
      riderName = customRiderName.trim();
      riderPhone = customRiderPhone.trim();
      if (!riderName || !riderPhone) {
        Alert.alert('Required', 'Please enter rider name and phone number.');
        return;
      }
    } else {
      const found = deliveryStaff.find(s => (s.id || s._id) === selectedRiderId);
      if (!found) {
        Alert.alert('Required', 'Please select a delivery partner or enter rider details.');
        return;
      }
      riderName = found.name;
      riderPhone = found.phone;
    }

    setDispatchingRider(true);
    try {
      const orderIds = dispatchOrdersList.map(o => o._id || o.id);
      const res = await apiClient.post('/delivery/dispatch', {
        storeId: currentStoreId,
        orderIds,
        riderName,
        riderPhone,
      });

      if (res.data?.success) {
        const { dispatchLink, dispatchedCount, orders: updated } = res.data;

        // Optimistically update orders in local state
        if (updated && Array.isArray(updated)) {
          setOrders(prev => prev.map(o => {
            const up = updated.find(u => (u._id || u.id) === (o._id || o.id));
            return up ? { ...o, ...up } : o;
          }));
        }

        setShowDispatchModal(false);
        setCustomRiderName('');
        setCustomRiderPhone('');

        // Prepare WhatsApp link
        const cleanPhone = (riderPhone || '').replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const stallName = storeData?.name || activeStore?.name || 'UniVerse Stall';
        const msg = `*UniVerse Delivery Assignment*\n` +
          `Stall: *${stallName}*\n` +
          `Orders Assigned: *${dispatchedCount}*\n\n` +
          `*Open Navigation Cockpit:*\n${dispatchLink}\n\n` +
          `Please verify the 4-digit PIN with each customer upon drop.`;

        const waUrl = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
        const webWaUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;

        // Proactively open WhatsApp directly
        try {
          await Linking.openURL(waUrl).catch(() => Linking.openURL(webWaUrl));
        } catch (e) {
          Linking.openURL(webWaUrl);
        }

        Alert.alert(
          'Trip Dispatched',
          `${dispatchedCount} order(s) assigned to ${riderName}. Live navigation link dispatched to WhatsApp.`,
          [
            { text: 'Done', style: 'cancel' },
            {
              text: 'Resend via WhatsApp',
              style: 'default',
              onPress: async () => {
                try {
                  await Linking.openURL(waUrl).catch(() => Linking.openURL(webWaUrl));
                } catch (e) {
                  Linking.openURL(webWaUrl);
                }
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('Failed to dispatch trip:', err);
      Alert.alert('Dispatch Error', err.response?.data?.message || 'Could not dispatch delivery trip.');
    } finally {
      setDispatchingRider(false);
    }
  };

  // Helper to parse scheduled pickup time in Indian Standard Time (IST, UTC + 5:30) with midnight protection
  function parseScheduledTimeIST(scheduledTimeStr) {
    if (!scheduledTimeStr) return null;
    const trimmed = scheduledTimeStr.trim().toUpperCase();
    const isPM = trimmed.includes('PM');
    const isAM = trimmed.includes('AM');
    const cleanStr = trimmed.replace(/[^\d:]/g, '');
    const parts = cleanStr.split(':');
    if (parts.length < 2) return null;

    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcMs + (5.5 * 3600000));

    const istScheduled = new Date(istNow);
    istScheduled.setHours(hours, minutes, 0, 0);

    let diffMinutes = (istScheduled.getTime() - istNow.getTime()) / (1000 * 60);

    // Midnight rollover protection: if order is for 12:xx AM / early AM and current time is late evening
    if (diffMinutes < -120 && istNow.getHours() >= 18 && hours <= 6) {
      istScheduled.setDate(istScheduled.getDate() + 1);
      diffMinutes = (istScheduled.getTime() - istNow.getTime()) / (1000 * 60);
    } else if (diffMinutes > 720 && istNow.getHours() <= 6 && hours >= 18) {
      // Early AM to yesterday late evening
      istScheduled.setDate(istScheduled.getDate() - 1);
      diffMinutes = (istScheduled.getTime() - istNow.getTime()) / (1000 * 60);
    }

    return {
      diffMinutes: Math.round(diffMinutes),
      hours,
      minutes,
      formattedTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
  }

  // Pre-order calculation helper (Accurate IST & Auto-unlocking)
  const getPreOrderInfo = (order) => {
    if (!order.isPreOrder || !order.scheduledTime) return { isPreOrder: false, locked: false, text: '' };
    
    const parsed = parseScheduledTimeIST(order.scheduledTime);
    if (!parsed) return { isPreOrder: false, locked: false, text: '' };

    const diffMins = parsed.diffMinutes;

    if (diffMins > 20) {
      return { 
        isPreOrder: true, 
        locked: true, 
        text: `⏳ Scheduled in ${diffMins}m (Hold preparation)`,
        diffMins,
        isWarning: true
      };
    } else if (diffMins > 0) {
      return { 
        isPreOrder: true, 
        locked: false, 
        text: `🔥 Ready to Prepare (${diffMins}m left)`,
        diffMins,
        isWarning: false
      };
    } else {
      return { 
        isPreOrder: true, 
        locked: false, 
        text: `⏰ Pickup Time Reached (${order.scheduledTime})`,
        diffMins,
        isWarning: false
      };
    }
  };

  // Status counts for tab badges
  const counts = useMemo(() => {
    const active = orders.filter(o => ['Pending', 'Confirmed', 'Cooking'].includes(o.status)).length;
    const preOrders = orders.filter(o => o.isPreOrder && ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)).length;
    const ready = orders.filter(o => o.status === 'Ready').length;
    const history = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status)).length;
    return { active, preOrders, ready, history };
  }, [orders]);

  // Today's summary statistics for history tab
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCompleted = orders.filter(o => 
      o.status === 'Completed' && new Date(o.createdAt).toDateString() === today
    );
    
    const count = todayCompleted.length;
    const revenue = todayCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { count, revenue };
  }, [orders]);

  // Filtered & Searched Orders list
  const displayOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter(o => {
      // 1. Search query filter (Order ID only)
      if (query) {
        const orderNum = (o.orderNumber || '').toString().toLowerCase();
        const orderId = (o._id || o.id || '').toString().toLowerCase();
        const match = orderNum.includes(query) || orderId.includes(query);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      // For active tab: pending first, then confirmed/cooking
      if (filter === 'Active') {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (b.status === 'Pending' && a.status !== 'Pending') return 1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [orders, filter, searchQuery]);
  const activeOrders = useMemo(() => displayOrders.filter(o => ['Pending', 'Confirmed', 'Cooking'].includes(o.status)), [displayOrders]);
  const preOrdersList = useMemo(() => {
    return displayOrders
      .filter(o => o.isPreOrder && ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status))
      .sort((a, b) => {
        const timeA = parseScheduledTimeIST(a.scheduledTime)?.diffMinutes ?? 9999;
        const timeB = parseScheduledTimeIST(b.scheduledTime)?.diffMinutes ?? 9999;
        return timeA - timeB;
      });
  }, [displayOrders]);
  const readyOrders = useMemo(() => displayOrders.filter(o => o.status === 'Ready'), [displayOrders]);
  const historyOrders = useMemo(() => displayOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status)), [displayOrders]);
  


  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#F59E0B';
      case 'Confirmed': return '#3B82F6';
      case 'Cooking': return '#8B5CF6';
      case 'Ready': return '#EF4123'; // Signature UniVerse logo orange
      case 'Completed': return '#EA580C'; // Warm deep orange
      case 'Cancelled': return '#EF4444';
      default: return '#64748B';
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const created = new Date(timestamp);
    const diffSecs = Math.floor((now - created) / 1000);

    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return created.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getActionButtons = (order) => {
    if (order.status === 'Pending') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => updateStatus(order._id, 'Pending', 'Confirmed')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientBtn}>
              <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Accept Order</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 0.8 }} 
            onPress={() => {
              Alert.alert(
                'Reject Order',
                `Are you sure you want to reject Order #${order.orderNumber}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', style: 'destructive', onPress: () => updateStatus(order._id, 'Pending', 'Cancelled') }
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dangerBtn}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.dangerBtnText}>Reject</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (order.status === 'Confirmed') {
      const preOrderInfo = getPreOrderInfo(order);
      return (
        <View style={autoAcceptOrders ? styles.actionRow : null}>
          <TouchableOpacity 
            style={{ flex: autoAcceptOrders ? 1.4 : 1 }}
            onPress={() => handleStartCookingPreOrder(order, preOrderInfo)}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={preOrderInfo.locked ? ['#7C3AED', '#6D28D9'] : ['#8B5CF6', '#7C3AED']} 
              style={styles.gradientBtn}
            >
              <Ionicons name="restaurant-outline" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>
                {preOrderInfo.locked ? `Start Cooking (${preOrderInfo.diffMins}m hold)` : 'Start Cooking'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {autoAcceptOrders && (
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={() => {
                Alert.alert(
                  'Cancel & Refund Order?',
                  `Cancel Order #${order.orderNumber || ''}?\n\nThis will instantly issue a full refund to the student via UPI.`,
                  [
                    { text: 'Keep Order', style: 'cancel' },
                    { 
                      text: 'Cancel & Refund', 
                      style: 'destructive', 
                      onPress: () => updateStatus(order._id, 'Confirmed', 'Cancelled') 
                    }
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <View style={styles.dangerBtn}>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.dangerBtnText}>Cancel/Refund</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (order.status === 'Cooking') {
      if (order.orderType === 'Delivery') {
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={{ flex: 1.3 }}
              onPress={async () => {
                await updateStatus(order._id, 'Cooking', 'Ready');
                openSingleDispatchModal(order);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientBtn}>
                <Ionicons name="bicycle" size={17} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Ready & Dispatch</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 0.8 }}
              onPress={() => updateStatus(order._id, 'Cooking', 'Ready')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientBtn}>
                <Ionicons name="checkmark-done" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.btnText}>Mark Ready</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <TouchableOpacity 
          onPress={() => updateStatus(order._id, 'Cooking', 'Ready')}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientBtn}>
            <Ionicons name="checkmark-done-outline" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Mark as Ready for Pickup</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    if (order.status === 'Ready' || order.status === 'Out for Delivery') {
      if (order.orderType === 'Delivery') {
        const isDispatched = order.status === 'Out for Delivery' || Boolean(order.riderName || order.dispatchedAt);
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={{ flex: 1.4 }} 
              onPress={() => isDispatched ? handleShareRiderLink(order) : openSingleDispatchModal(order)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={isDispatched ? ['#059669', '#047857'] : ['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
                <Ionicons name={isDispatched ? "logo-whatsapp" : "bicycle"} size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>
                  {isDispatched ? `WhatsApp: ${order.riderName || 'Rider'}` : 'Assign Rider'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flex: 0.8 }} 
              onPress={() => handleDirectHandover(order._id, order.orderNumber)}
              activeOpacity={0.8}
            >
              <View style={[styles.gradientBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}>
                <Ionicons name="checkmark-done" size={16} color="#475569" style={{ marginRight: 4 }} />
                <Text style={[styles.btnText, { color: '#475569' }]}>Complete</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={{ flex: 1.3 }} 
            onPress={() => handleDirectHandover(order._id, order.orderNumber)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#FF6B00', '#EF4123']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Ionicons name="flash" size={17} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Complete Handover</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 0.8 }} 
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.8}
          >
            <View style={[styles.gradientBtn, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }]}>
              <Ionicons name="qr-code-outline" size={17} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={[styles.btnText, { color: '#EA580C' }]}>Scan QR</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (order.status === 'Completed') {
      return (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.completedText}>Handover Verified & Completed</Text>
        </View>
      );
    }

    if (order.status === 'Cancelled') {
      return (
        <View style={styles.cancelledBanner}>
          <Ionicons name="close-circle" size={18} color="#EF4444" />
          <Text style={styles.cancelledText}>Order Cancelled</Text>
        </View>
      );
    }

    return null;
  };

  const renderItem = ({ item }) => {
    const preOrderInfo = getPreOrderInfo(item);
    const statusColor = getStatusColor(item.status);
    const isDelivery = String(item.orderType || '').toLowerCase() === 'delivery';
    const isTakeaway = String(item.orderType || '').toLowerCase().includes('take') || String(item.orderType || '').toLowerCase().includes('pack');
    const tableClean = item.tableNumber ? String(item.tableNumber).toUpperCase().replace(/DINE IN/i, '').trim() : '';
    
    return (
      <View style={[
        styles.card,
        isDelivery ? [styles.takeawayCard, { borderLeftColor: '#10B981' }] : isTakeaway ? styles.takeawayCard : styles.dineInCard,
        item.status === 'Pending' && styles.pendingCard,
        item.isPreOrder && styles.preOrderCard
      ]}>
        {/* Top High-Signal Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={styles.orderId}>#{item.orderNumber || item._id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.timeElapsed}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Clean Order Type Tag */}
            {isDelivery ? (
              <View style={styles.deliveryTypeBadge}>
                <Ionicons name="bicycle" size={12} color="#047857" />
                <Text style={styles.deliveryTypeBadgeText}>DELIVERY</Text>
              </View>
            ) : isTakeaway ? (
              <View style={styles.takeawayTypeBadge}>
                <Ionicons name="bag-handle" size={12} color="#C2410C" />
                <Text style={styles.takeawayTypeBadgeText}>TAKEAWAY</Text>
              </View>
            ) : (
              <View style={styles.dineInTypeBadge}>
                <Ionicons name="restaurant" size={12} color="#4338CA" />
                <Text style={styles.dineInTypeBadgeText}>{tableClean ? `TABLE ${tableClean}` : 'DINE IN'}</Text>
              </View>
            )}

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
        </View>

        {/* Refined Delivery Destination Strip (Single Clean Line) */}
        {isDelivery && (
          <View style={styles.refinedDeliveryStrip}>
            <Ionicons name="location-sharp" size={15} color="#059669" />
            <Text style={styles.refinedDeliveryText} numberOfLines={1}>
              {item.deliveryAddress || 'Hostel Drop'}
            </Text>
            {item.riderName ? (
              <View style={styles.riderAssignedPill}>
                <Ionicons name="bicycle" size={11} color="#1E40AF" />
                <Text style={styles.riderAssignedText} numberOfLines={1}>{item.riderName}</Text>
              </View>
            ) : (
              <View style={styles.riderUnassignedPill}>
                <Text style={styles.riderUnassignedText}>No Rider</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Pre-order Live Banner (If Scheduled) */}
        {item.isPreOrder && item.status !== 'Completed' && item.status !== 'Cancelled' && (
          <View style={[
            styles.preOrderBanner, 
            { backgroundColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 65, 35, 0.08)',
              borderColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 65, 35, 0.3)' }
          ]}>
            <Ionicons 
              name={preOrderInfo.isWarning ? 'warning-outline' : 'flame-outline'} 
              size={15} 
              color={preOrderInfo.isWarning ? '#DC2626' : '#EF4123'} 
            />
            <Text style={{ 
              color: preOrderInfo.isWarning ? '#DC2626' : '#EF4123', 
              fontWeight: '700', 
              fontSize: 12.5,
              flex: 1
            }}>
              {preOrderInfo.text}
            </Text>
          </View>
        )}
        
        {/* Items Ordered List */}
        <View style={styles.itemsList}>
          {item.items?.map((cartItem, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.itemQty}>{cartItem.quantity}x</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {cartItem.name || cartItem.menuItem?.name || 'Item'}
                  {cartItem.variant ? <Text style={styles.variantText}> ({cartItem.variant})</Text> : null}
                </Text>
                {cartItem.comboItems?.map((ci, cidx) => (
                  <Text key={cidx} style={styles.subItemText}>• {ci.quantity} {ci.name}</Text>
                ))}
                {cartItem.freeItems?.map((fi, fidx) => (
                  <Text key={fidx} style={styles.freeItemText}>+ Free {fi.quantity} {fi.name}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Special Cooking Requests / Chef Note (Compact) */}
        {!!(item.cookingInstructions || item.specialRequest || item.instructions) && (
          <View style={styles.cookingInstructionsBox}>
            <Ionicons name="chatbubble-ellipses" size={13} color="#B45309" />
            <Text style={styles.cookingInstructionsText} numberOfLines={2}>
              "{item.cookingInstructions || item.specialRequest || item.instructions}"
            </Text>
          </View>
        )}

        {/* Customer & Total Row */}
        <View style={styles.customerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <View style={styles.customerAvatarMini}>
              <Ionicons name="person" size={11} color="#475569" />
            </View>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName || 'Customer'}
            </Text>
            {item.paymentMethod === 'Razorpay' ? (
              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#DCFCE7' }}>
                <Text style={{ fontSize: 9.5, color: '#16A34A', fontWeight: '800' }}>PAID</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.orderTotal}>₹{item.totalAmount}</Text>
        </View>

        {/* Action Controls */}
        <View style={styles.cardFooter}>
          {getActionButtons(item)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      {/* Executive Kitchen Command Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {/* Left / Center-left: Title + Carts Dropdown */}
          <View style={styles.headerLeftGroup}>
            <Text style={styles.headerTitle}>Kitchen Orders</Text>

            {/* Active Cart Name Badge */}
            <View style={styles.activeCartBadge}>
              <Ionicons name="storefront" size={12} color="#EF4123" style={{ marginRight: 4 }} />
              <Text style={styles.activeCartBadgeText} numberOfLines={1}>
                {activeStore?.name || storeData?.name || 'UniVerse Stall'}
              </Text>
            </View>
          </View>

          {/* Right: Auto-Accept Toggle Button */}
          <TouchableOpacity 
            style={[
              styles.autoAcceptChip,
              autoAcceptOrders ? styles.autoAcceptChipActive : styles.autoAcceptChipInactive
            ]}
            onPress={handleToggleAutoAccept}
            disabled={togglingAutoAccept}
            activeOpacity={0.75}
          >
            <Ionicons 
              name={autoAcceptOrders ? "flash" : "flash-outline"} 
              size={11} 
              color={autoAcceptOrders ? '#EF4123' : '#94A3B8'} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[
              styles.autoAcceptChipText,
              { color: autoAcceptOrders ? '#EF4123' : '#94A3B8' }
            ]}>
              {autoAcceptOrders ? 'Auto: ON' : 'Auto: OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Cross-Stall Incoming Order Banner (Owner Only) */}
        {!isEmployee && crossStallNotification && (
          <TouchableOpacity 
            style={styles.crossStallBanner}
            onPress={() => handleSwitchStore(crossStallNotification.storeId)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={styles.crossStallIconCircle}>
                <Ionicons name="notifications" size={15} color="#EA580C" />
              </View>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.crossStallTitle} numberOfLines={1}>
                  New Order #{crossStallNotification.orderNumber || ''} for {crossStallNotification.storeName}!
                </Text>
                <Text style={styles.crossStallSub}>Tap to switch stall in 1-tap</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.crossStallSwitchBtn}>
                <Text style={styles.crossStallSwitchBtnText}>Switch</Text>
                <Ionicons name="arrow-forward" size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
              <TouchableOpacity 
                style={styles.crossStallDismissBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setCrossStallNotification(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color="#9A3412" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Modern 4-Tab Filter Bar inside Header */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'Active', label: 'Active', count: counts.active, color: '#3B82F6' },
            { key: 'Pre-Orders', label: 'Pre-Orders', count: counts.preOrders, color: '#8B5CF6' },
            { key: 'Ready', label: 'Ready', count: counts.ready, color: '#EF4123' },
            { key: 'History', label: 'History', count: counts.history, color: '#64748B' },
          ].map((tab, idx) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity 
                key={tab.key} 
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => {
                  setFilter(tab.key);
                  scrollViewRef.current?.scrollTo({ x: idx * screenWidth, animated: true });
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                <View style={[
                  styles.tabBadge, 
                  isActive ? [styles.tabBadgeActive, { backgroundColor: tab.color }] : styles.tabBadgeInactive
                ]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Search Bar inside Header */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Order ID only..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            inputMode="numeric"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Body */}
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {/* History Stats Header (Hidden for Stall Employees for Privacy) */}
      {filter === 'History' && (
        <View style={styles.historyStatsCard}>
          <View style={styles.historyStatCol}>
            <Text style={styles.historyStatLabel}>Today's Orders</Text>
            <Text style={styles.historyStatValue}>{todayStats.count} Completed</Text>
          </View>
          
          {!isEmployee && (
            <View style={styles.historyStatColRight}>
              <Text style={styles.historyStatLabel}>Today's Revenue</Text>
              <Text style={styles.historyStatValueGreen}>₹{todayStats.revenue}</Text>
            </View>
          )}
        </View>
      )}

      {/* Main Order List with Swiping */}
      {loading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.pagerView}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const pageIndex = Math.round(offsetX / screenWidth);
            if (pageIndex === 0 && filter !== 'Active') setFilter('Active');
            else if (pageIndex === 1 && filter !== 'Pre-Orders') setFilter('Pre-Orders');
            else if (pageIndex === 2 && filter !== 'Ready') setFilter('Ready');
            else if (pageIndex === 3 && filter !== 'History') setFilter('History');
          }}
        >
          {/* Page 0: Active */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={activeOrders}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#3B82F6']} />}
              ListEmptyComponent={<EmptyQueueState type="Active" />}
            />
          </View>

          {/* Page 1: Dedicated Pre-Orders Queue */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={preOrdersList}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#8B5CF6']} />}
              ListHeaderComponent={
                preOrdersList.length > 0 ? (
                  <View style={styles.preOrderHeaderNotice}>
                    <Ionicons name="calendar" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                    <Text style={styles.preOrderNoticeText}>
                      Advance pickup schedule. Audio chime rings 20m before pickup.
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={<EmptyQueueState type="Pre-Orders" />}
            />
          </View>

          {/* Page 2: Ready */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={readyOrders}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#3B82F6']} />}
              ListHeaderComponent={
                readyOrders.length > 0 ? (
                  <View style={{ marginBottom: 14, gap: 10 }}>
                    {readyOrders.some(o => o.orderType === 'Delivery' && !o.dispatchedAt) && (
                      <TouchableOpacity
                        onPress={openBatchDispatchModal}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: '#10B981',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
                            elevation: 4
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Ionicons name="bicycle" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
                                🛵 Batch Dispatch Delivery Orders ({readyOrders.filter(o => o.orderType === 'Delivery' && !o.dispatchedAt).length})
                              </Text>
                              <Text style={{ color: '#D1FAE5', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                                Assign multi-stop route to 1 rider with WhatsApp link
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={handleCompleteAllReady}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#FF6B00', '#EF4123']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          shadowColor: '#EF4123',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.25,
                          shadowRadius: 8,
                          elevation: 4
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="flash" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
                              Complete All Ready Orders ({readyOrders.length})
                            </Text>
                            <Text style={{ color: '#FFEDD5', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
                              Rush-hour or closing clear (no QR scan needed)
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              ListEmptyComponent={<EmptyQueueState type="Ready" />}
            />
          </View>

          {/* Page 3: History */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={historyOrders}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={[styles.list, { paddingTop: 0 }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#3B82F6']} />}
              ListEmptyComponent={<EmptyQueueState type="History" />}
            />
          </View>
        </ScrollView>
      )}

      {/* Floating QR Scanner Button on Ready tab */}
      {filter === 'Ready' && displayOrders.length > 0 && (
        <TouchableOpacity 
          style={styles.fabContainer} 
          onPress={() => navigation.navigate('Scanner')} 
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#FF6B00', '#EF4123']} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="qr-code-outline" size={22} color="white" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: 'white', letterSpacing: 0.5 }}>Scan Handover QR</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      </View>
      {/* Stall Switcher Bottom Sheet / Modal */}
      <Modal
        visible={!isEmployee && showStallSwitcherModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowStallSwitcherModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.switcherModalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Switch Stall</Text>
                <Text style={styles.modalSub}>Select a stall to manage orders & menu</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowStallSwitcherModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {(stores || []).map((store) => {
                const sId = store.id || store._id;
                const isActive = (sId === currentStoreId);
                const pendingCount = otherStallPendingCounts[sId] || 0;

                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.stallOptionItem, isActive && styles.stallOptionItemActive]}
                    onPress={() => handleSwitchStore(store)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stallOptionIconBox, isActive && styles.stallOptionIconBoxActive]}>
                      <Ionicons name="storefront" size={20} color={isActive ? '#EF4123' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.stallOptionName, isActive && styles.stallOptionNameActive]} numberOfLines={1}>
                          {store.name}
                        </Text>
                        {isActive && (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stallOptionMeta}>
                        {store.market || 'Market'} • {store.isOpen !== false ? '🟢 Open' : '⚪ Closed'}
                      </Text>
                    </View>

                    {pendingCount > 0 && (
                      <View style={styles.stallOptionPendingBadge}>
                        <Text style={styles.stallOptionPendingText}>{pendingCount} pending</Text>
                      </View>
                    )}

                    {isActive && (
                      <Ionicons name="checkmark-circle" size={22} color="#EF4123" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {!isEmployee && (
              <TouchableOpacity
                style={styles.modalAddStallBtn}
                onPress={() => {
                  setShowStallSwitcherModal(false);
                  setShowQuickAddStallModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#EF4123" style={{ marginRight: 6 }} />
                <Text style={styles.modalAddStallText}>+ Add New Stall</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Add Stall Modal */}
      <Modal
        visible={!isEmployee && showQuickAddStallModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowQuickAddStallModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.switcherModalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Add New Stall</Text>
                <Text style={styles.modalSub}>Instantly launch another food counter</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowQuickAddStallModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stall Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Fresh Juice Bar, Dosa Corner"
                placeholderTextColor="#94A3B8"
                value={newStallForm.name}
                onChangeText={(val) => setNewStallForm(p => ({ ...p, name: val }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Food Category</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Fast Food, Beverages, South Indian"
                placeholderTextColor="#94A3B8"
                value={newStallForm.category}
                onChangeText={(val) => setNewStallForm(p => ({ ...p, category: val }))}
              />
            </View>

            {/* Select Campus / Location * (Wrapped pills just like markets) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Campus / Location *</Text>
              <View style={styles.marketPillsContainer}>
                {allLocations.map((loc) => {
                  const isSelected = selectedLiveLocationId === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.marketSelectPill, isSelected && styles.marketSelectPillActive]}
                      onPress={() => {
                        const locMarkets = getMarketsForLocation(loc);
                        setNewStallForm((prev) => ({
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
            </View>

            {/* Select Campus Market / Zone * (Dynamic wrapped pills for selected location) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Campus Market / Zone *</Text>
              <View style={styles.marketPillsContainer}>
                {liveModalMarkets.map((marketName) => {
                  const isSelected = (newStallForm.market || liveModalMarkets[0]) === marketName;
                  return (
                    <TouchableOpacity
                      key={marketName}
                      style={[
                        styles.marketSelectPill,
                        isSelected && styles.marketSelectPillActive,
                      ]}
                      onPress={() =>
                        setNewStallForm((prev) => ({ ...prev, market: marketName }))
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
            </View>

            {/* UPI ID (for payments) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UPI ID (for payments)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. yourname@oksbi"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={newStallForm.upiId}
                onChangeText={(val) => setNewStallForm(p => ({ ...p, upiId: val }))}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowQuickAddStallModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#EF4123' }]}
                onPress={handleCreateNewStall}
                disabled={creatingStall}
                activeOpacity={0.8}
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
      {/* MODAL: ASSIGN DELIVERY PARTNER & DISPATCH TRIP      */}
      {/* =================================================== */}
      <Modal
        visible={showDispatchModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDispatchModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.switcherModalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bicycle" size={20} color="#10B981" />
                  <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
                </View>
                <Text style={styles.modalSub}>
                  Dispatch {dispatchOrdersList.length} order{dispatchOrdersList.length > 1 ? 's' : ''} with live WhatsApp magic link
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDispatchModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Order destinations preview */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
                  Trip Stops ({dispatchOrdersList.length})
                </Text>
                {dispatchOrdersList.map((ord, idx) => (
                  <View key={ord._id || ord.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4123', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
                        #{ord.orderNumber} • {ord.deliveryAddress || 'Campus'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Saved Staff Options */}
              <Text style={styles.inputLabel}>Select Delivery Partner</Text>
              {deliveryStaff.length > 0 ? (
                <View style={{ marginBottom: 12 }}>
                  {deliveryStaff.map((staff) => {
                    const sId = staff.id || staff._id;
                    const isSelected = selectedRiderId === sId;
                    return (
                      <TouchableOpacity
                        key={sId}
                        style={[
                          styles.stallOptionItem,
                          isSelected && { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
                          { paddingVertical: 10, marginBottom: 8 }
                        ]}
                        onPress={() => setSelectedRiderId(sId)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? '#10B981' : '#94A3B8'}
                          style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stallOptionName, isSelected && { color: '#065F46' }]}>
                            {staff.name}
                          </Text>
                          <Text style={styles.modalSub}>{staff.phone}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[
                      styles.stallOptionItem,
                      selectedRiderId === 'custom' && { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
                      { paddingVertical: 10, marginBottom: 8 }
                    ]}
                    onPress={() => setSelectedRiderId('custom')}
                  >
                    <Ionicons
                      name={selectedRiderId === 'custom' ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedRiderId === 'custom' ? '#10B981' : '#94A3B8'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.stallOptionName, selectedRiderId === 'custom' && { color: '#065F46' }]}>
                      + Enter Another Rider Details
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Custom Rider Inputs if selected or if no staff saved */}
              {(selectedRiderId === 'custom' || deliveryStaff.length === 0) && (
                <View style={{ marginBottom: 10 }}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rider Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                      value={customRiderName}
                      onChangeText={setCustomRiderName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rider Phone Number (WhatsApp) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={customRiderPhone}
                      onChangeText={setCustomRiderPhone}
                    />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Feather name="info" size={13} color="#64748B" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16, flex: 1 }}>
                  Upon dispatch, orders are tagged with this delivery partner. Live mobile web navigation cockpit opens directly on WhatsApp.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDispatchModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#10B981' }]}
                onPress={handleConfirmDispatch}
                disabled={dispatchingRider}
              >
                {dispatchingRider ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>Dispatch & Open WhatsApp</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================== */}
      {/* MODAL: DEDICATED DELIVERY DISPATCH & BATCHING HUB   */}
      {/* =================================================== */}
      <Modal
        visible={showDeliveryHubModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDeliveryHubModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.switcherModalContent, { maxHeight: '92%', height: '90%', paddingBottom: 12 }]}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bicycle" size={22} color="#059669" />
                  <Text style={styles.modalTitle}>Delivery Orders Hub</Text>
                </View>
                <Text style={styles.modalSub}>
                  {activeDeliveryOrders.length} active delivery orders • {activeStore?.name || storeData?.name || 'Stall'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDeliveryHubModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Sub-Tabs: All Active, Cooking, Ready to Dispatch, Out for Delivery */}
            <View style={styles.hubTabContainer}>
              <TouchableOpacity
                style={[styles.hubTabItem, deliveryHubTab === 'all' && styles.hubTabItemActive]}
                onPress={() => setDeliveryHubTab('all')}
              >
                <Text style={[styles.hubTabItemText, deliveryHubTab === 'all' && styles.hubTabItemTextActive]}>
                  All ({activeDeliveryOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hubTabItem, deliveryHubTab === 'cooking' && styles.hubTabItemActive]}
                onPress={() => setDeliveryHubTab('cooking')}
              >
                <Text style={[styles.hubTabItemText, deliveryHubTab === 'cooking' && styles.hubTabItemTextActive]}>
                  🍳 Cooking ({preparingDeliveryOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hubTabItem, deliveryHubTab === 'ready' && styles.hubTabItemActive]}
                onPress={() => setDeliveryHubTab('ready')}
              >
                <Text style={[styles.hubTabItemText, deliveryHubTab === 'ready' && styles.hubTabItemTextActive]}>
                  📦 Ready ({readyDeliveryOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hubTabItem, deliveryHubTab === 'delivering' && styles.hubTabItemActive]}
                onPress={() => setDeliveryHubTab('delivering')}
              >
                <Text style={[styles.hubTabItemText, deliveryHubTab === 'delivering' && styles.hubTabItemTextActive]}>
                  🛵 On Trip ({deliveringOrders.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Manual Batch Action Toolbar (When on Ready or All tab) */}
            {(deliveryHubTab === 'ready' || deliveryHubTab === 'all') && readyDeliveryOrders.length > 0 && (
              <View style={styles.hubBatchToolbar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.hubSelectAllBtn}
                    onPress={selectedBatchIds.length === readyDeliveryOrders.length ? handleClearBatchSelection : handleSelectAllReady}
                  >
                    <Ionicons
                      name={selectedBatchIds.length > 0 && selectedBatchIds.length === readyDeliveryOrders.length ? "checkbox" : "square-outline"}
                      size={18}
                      color="#059669"
                    />
                    <Text style={styles.hubSelectAllBtnText}>
                      {selectedBatchIds.length === readyDeliveryOrders.length ? "Deselect All" : "Select All Ready"}
                    </Text>
                  </TouchableOpacity>
                  {selectedBatchIds.length > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857' }}>
                      ({selectedBatchIds.length} Selected)
                    </Text>
                  )}
                </View>

                {selectedBatchIds.length > 0 && (
                  <TouchableOpacity
                    style={styles.hubBatchDispatchBtn}
                    onPress={handleLaunchBatchDispatch}
                  >
                    <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                    <Text style={styles.hubBatchDispatchBtnText}>
                      Dispatch Batch ({selectedBatchIds.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* List of Delivery Orders in Selected Tab */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {(() => {
                let list = activeDeliveryOrders;
                if (deliveryHubTab === 'cooking') list = preparingDeliveryOrders;
                else if (deliveryHubTab === 'ready') list = readyDeliveryOrders;
                else if (deliveryHubTab === 'delivering') list = deliveringOrders;

                if (list.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                      <Ionicons name="bicycle-outline" size={44} color="#94A3B8" />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#475569', marginTop: 10 }}>
                        No Orders in this Section
                      </Text>
                      <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center', maxWidth: 260 }}>
                        Delivery orders in this stage will appear here for instant management.
                      </Text>
                    </View>
                  );
                }

                return list.map((ord) => {
                  const oId = ord._id || ord.id;
                  const isSelected = selectedBatchIds.includes(oId);
                  const isReady = ord.status === 'Ready';
                  const isDispatched = ord.status === 'Out for Delivery' || Boolean(ord.riderName && ord.status !== 'Completed');

                  return (
                    <View key={oId} style={[styles.hubOrderCard, isSelected && styles.hubOrderCardSelected]}>
                      {/* Top Row: Checkbox, Order #, Status */}
                      <View style={styles.hubOrderHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          {isReady && (
                            <TouchableOpacity onPress={() => toggleBatchSelectOrder(oId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons
                                name={isSelected ? "checkbox" : "square-outline"}
                                size={22}
                                color={isSelected ? "#059669" : "#94A3B8"}
                              />
                            </TouchableOpacity>
                          )}
                          <Text style={styles.hubOrderNumber}>#{ord.orderNumber}</Text>
                          <Text style={styles.hubOrderTime}>{formatRelativeTime(ord.createdAt)}</Text>
                        </View>

                        <View style={[styles.hubStatusBadge, {
                          backgroundColor: isDispatched ? '#DBEAFE' : isReady ? '#DCFCE7' : '#FEF3C7',
                          borderColor: isDispatched ? '#93C5FD' : isReady ? '#86EFAC' : '#FDE68A'
                        }]}>
                          <Text style={[styles.hubStatusText, {
                            color: isDispatched ? '#1E40AF' : isReady ? '#166534' : '#92400E'
                          }]}>
                            {ord.status}
                          </Text>
                        </View>
                      </View>

                      {/* Drop Address */}
                      <View style={styles.hubAddressRow}>
                        <Ionicons name="location" size={15} color="#059669" style={{ marginTop: 2 }} />
                        <Text style={styles.hubAddressText}>
                          {ord.deliveryAddress || 'Hostel Drop Address'}
                        </Text>
                      </View>

                      {/* Customer Note if any */}
                      {!!(ord.cookingInstructions || ord.specialRequest || ord.instructions) && (
                        <View style={styles.hubNoteRow}>
                          <Text style={styles.hubNoteText}>
                            📝 "{ord.cookingInstructions || ord.specialRequest || ord.instructions}"
                          </Text>
                        </View>
                      )}

                      {/* Items */}
                      <Text style={styles.hubItemsText} numberOfLines={2}>
                        {(ord.items || []).map(i => `${i.quantity || 1}x ${i.name || i.menuItem?.name || 'Item'}`).join(', ')}
                      </Text>

                      {/* Customer & Total Row */}
                      <View style={styles.hubCustomerRow}>
                        <Text style={styles.hubCustomerName}>
                          👤 {ord.customerName || 'Customer'} ({ord.customerPhone})
                        </Text>
                        <Text style={styles.hubTotalAmount}>₹{ord.totalAmount}</Text>
                      </View>

                      {/* Rider / PIN Info (If Dispatched) */}
                      {isDispatched && (
                        <View style={styles.hubRiderInfoStrip}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.hubRiderNameText}>
                              🛵 Rider: {ord.riderName} ({ord.riderPhone})
                            </Text>
                            <Text style={styles.hubPinText}>
                              Customer PIN: <Text style={{ fontWeight: '900', color: '#047857' }}>{ord.deliveryOtp || '****'}</Text>
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.hubWaBtn}
                            onPress={() => handleShareRiderLink(ord)}
                          >
                            <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                            <Text style={styles.hubWaBtnText}>WhatsApp</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.hubCardActionRow}>
                        {ord.status === 'Pending' && (
                          <TouchableOpacity
                            style={[styles.hubActionBtn, { backgroundColor: '#10B981', width: '100%' }]}
                            onPress={() => updateStatus(ord._id, 'Pending', 'Confirmed')}
                          >
                            <Text style={styles.hubActionBtnText}>Accept Order</Text>
                          </TouchableOpacity>
                        )}

                        {ord.status === 'Confirmed' && (
                          <TouchableOpacity
                            style={[styles.hubActionBtn, { backgroundColor: '#8B5CF6', width: '100%' }]}
                            onPress={() => updateStatus(ord._id, 'Confirmed', 'Cooking')}
                          >
                            <Text style={styles.hubActionBtnText}>Start Cooking</Text>
                          </TouchableOpacity>
                        )}

                        {ord.status === 'Cooking' && (
                          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                            <TouchableOpacity
                              style={[styles.hubActionBtn, { backgroundColor: '#3B82F6', flex: 1 }]}
                              onPress={() => updateStatus(ord._id, 'Cooking', 'Ready')}
                            >
                              <Text style={styles.hubActionBtnText}>Mark Ready</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.hubActionBtn, { backgroundColor: '#10B981', flex: 1.2 }]}
                              onPress={async () => {
                                await updateStatus(ord._id, 'Cooking', 'Ready');
                                openSingleDispatchModal(ord);
                              }}
                            >
                              <Text style={styles.hubActionBtnText}>Ready & Dispatch</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isReady && (
                          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                            <TouchableOpacity
                              style={[styles.hubActionBtn, { backgroundColor: '#10B981', flex: 1.3 }]}
                              onPress={() => openSingleDispatchModal(ord)}
                            >
                              <Ionicons name="bicycle" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.hubActionBtnText}>Assign Rider</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.hubActionBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', flex: 0.8 }]}
                              onPress={() => handleDirectHandover(ord._id, ord.orderNumber)}
                            >
                              <Text style={[styles.hubActionBtnText, { color: '#475569' }]}>Complete</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isDispatched && (
                          <TouchableOpacity
                            style={[styles.hubActionBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', width: '100%' }]}
                            onPress={() => handleDirectHandover(ord._id, ord.orderNumber)}
                          >
                            <Ionicons name="checkmark-done" size={15} color="#475569" style={{ marginRight: 4 }} />
                            <Text style={[styles.hubActionBtnText, { color: '#475569' }]}>Mark Handover Completed</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Delivery Dispatch Hub Button (Always Accessible from ANY Tab) */}
      {activeDeliveryOrders.length > 0 && (
        <TouchableOpacity
          style={styles.floatingDeliveryHub}
          onPress={() => setShowDeliveryHubModal(true)}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#065F46', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingDeliveryGradient}
          >
            <View style={styles.floatingDeliveryIconBox}>
              <Ionicons name="bicycle" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.floatingDeliveryTitle}>
                {activeDeliveryOrders.length} {activeDeliveryOrders.length === 1 ? 'Delivery' : 'Deliveries'} Active
              </Text>
              <Text style={styles.floatingDeliverySub}>
                {readyDeliveryOrders.length > 0 
                  ? `${readyDeliveryOrders.length} ready to dispatch` 
                  : deliveringOrders.length > 0 
                    ? `${deliveringOrders.length} out for delivery` 
                    : `${preparingDeliveryOrders.length} cooking in kitchen`}
              </Text>
            </View>
            <View style={styles.floatingDeliveryActionBadge}>
              <Text style={styles.floatingDeliveryActionText}>Manage Hub</Text>
              <Ionicons name="chevron-forward" size={13} color="#065F46" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingDeliveryHub: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingDeliveryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 12,
  },
  floatingDeliveryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDeliveryTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  floatingDeliverySub: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
    marginTop: 1,
  },
  floatingDeliveryActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2,
  },
  floatingDeliveryActionText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#065F46',
  },
  deliveryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.4,
  },
  takeawayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  takeawayTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 0.4,
  },
  dineInTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dineInTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 0.4,
  },
  refinedDeliveryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    gap: 6,
  },
  refinedDeliveryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  riderAssignedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  riderAssignedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  riderUnassignedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  riderUnassignedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
  },
  hubTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  hubTabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  hubTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hubTabItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  hubTabItemTextActive: {
    color: '#059669',
    fontWeight: '900',
  },
  hubBatchToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  hubSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubSelectAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  hubBatchDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  hubBatchDispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
  hubOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hubOrderCardSelected: {
    borderColor: '#059669',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  hubOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hubOrderNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  hubOrderTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  hubStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  hubStatusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  hubAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  hubAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    lineHeight: 16,
  },
  hubNoteRow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  hubNoteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  hubItemsText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  hubCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 8,
  },
  hubCustomerName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  hubTotalAmount: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#059669',
  },
  hubRiderInfoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  hubRiderNameText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  hubPinText: {
    fontSize: 11,
    color: '#1E3A8A',
    marginTop: 1,
  },
  hubWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  hubWaBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  hubCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hubActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  hubActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  activeCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 4.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 130,
  },
  activeCartBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  badgesCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  autoAcceptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  autoAcceptChipActive: {
    backgroundColor: 'rgba(239, 65, 35, 0.18)',
    borderColor: 'rgba(239, 65, 35, 0.4)',
  },
  autoAcceptChipInactive: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  autoAcceptChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 6.5,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabActive: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 11,
  },
  activeTabText: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  tabBadge: {
    marginLeft: 3,
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeInactive: {
    backgroundColor: '#0F172A',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  preOrderHeaderNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  preOrderNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    height: 38,
    marginBottom: 0,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  historyStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyStatCol: {
    flex: 1,
  },
  historyStatColRight: {
    alignItems: 'flex-end',
  },
  historyStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  historyStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyStatValueGreen: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EF4123',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  takeawayCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#EA580C',
  },
  dineInCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#2563EB',
  },
  pendingCard: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
  },
  preOrderCard: {
    borderColor: '#F472B6',
  },
  packingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  packingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  packingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packingBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9A3412',
    letterSpacing: 0.3,
  },
  packingBannerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#C2410C',
    marginTop: 1,
  },
  packingPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FB923C',
  },
  packingPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  dineInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  dineInBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dineInIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dineInBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.3,
  },
  dineInBannerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 1,
  },
  dineInPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  dineInPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timeElapsed: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontWeight: '700',
    fontSize: 11,
  },
  preOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  cookingInstructionsBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  cookingInstructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cookingInstructionsLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  cookingInstructionsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 18,
  },
  itemsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  qtyBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
    marginTop: 1,
  },
  itemQty: {
    color: '#0369A1',
    fontWeight: '900',
    fontSize: 13,
  },
  itemName: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
  },
  variantText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  subItemText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  freeItemText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    marginBottom: 14,
  },
  customerAvatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  orderTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gradientBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  dangerBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dangerBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  completedText: {
    color: '#EF4123',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  cancelledText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Auto-cancel timer styles */
  autoCancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  autoCancelNormal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  autoCancelUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  autoCancelExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  autoCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  autoCancelSubText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Multi-Stall Switcher & Cross-Stall Alert Styles */
  stallChipWithAlert: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  headerAlertBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAlertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  crossStallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  crossStallIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossStallTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: -0.2,
  },
  crossStallSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C2410C',
    marginTop: 1,
  },
  crossStallSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4123',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  crossStallSwitchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  crossStallDismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Switcher & Create Stall Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  switcherModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    margin: 0,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  stallOptionItemActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EF4123',
  },
  stallOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallOptionIconBoxActive: {
    backgroundColor: '#FFEDD5',
  },
  stallOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  stallOptionNameActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stallOptionMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  stallOptionPendingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  stallOptionPendingText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  modalAddStallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FDBA74',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 8,
  },
  modalAddStallText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4123',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  createSubmitBtn: {
    backgroundColor: '#EF4123',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
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
});
