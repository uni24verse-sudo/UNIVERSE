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
  Vibration
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';
import { useAudioAlerts } from '../hooks/useAudioAlerts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

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

export default function LiveOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { socket, isConnected, socketError } = useContext(SocketContext);
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
  
  const { isAudioEnabled, toggleAudio, playTestSound, syncPendingOrders, queueAnnouncement, cancelAnnouncement, queuePreOrderReminder } = useAudioAlerts();
  const alertedPreOrdersRef = useRef(new Set());

  // Role check: employees must not see financial/revenue summaries for privacy
  const isEmployee = user?.role === 'employee';

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
        setStoreData(res.data[0]);
        setIsStoreOpen(res.data[0].isOpen !== false);
        setAutoAcceptOrders(Boolean(res.data[0].autoAcceptOrders));
      }
    } catch (e) {
      console.error('Failed to fetch store status:', e.message);
    }
  }, []);

  const handleToggleStoreStatus = async (forceCancel = false) => {
    const storeId = storeData?._id || storeData?.id || user?.storeId || user?.id;
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
    } catch (error) {
      console.error('Failed to toggle stall status:', error);
      setIsStoreOpen(previousState);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update stall status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleToggleAutoAccept = async () => {
    const storeId = storeData?._id || storeData?.id || user?.storeId || user?.id;
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
            Notifications.scheduleNotificationAsync({
              content: {
                title: `🔥 Start Cooking Pre-Order #${order.orderNumber || ''}!`,
                body: `Scheduled for ${order.scheduledTime}. Preparation window is open now.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            }).catch(e => console.log('[PreOrderNotification] Error:', e));
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
    
    Notifications.setBadgeCountAsync(activeCount).catch(() => {});
  }, [orders]);

  const fetchOrders = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const storeId = user?.storeId || user?.id;
      const response = await apiClient.get(`/orders/${storeId}/vendor-orders`);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFocused) {
      fetchOrders();
      fetchStoreStatus();
    }
  }, [isFocused, fetchOrders, fetchStoreStatus]);

  useEffect(() => {
    if (isConnected) {
      fetchOrders();
      fetchStoreStatus();
    }
  }, [isConnected, fetchOrders, fetchStoreStatus]);

  // Socket listeners for real-time order lifecycle
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        queueAnnouncement(newOrder); 
        return [newOrder, ...prev];
      });
    };

    const handleStatusUpdate = (updatedOrder) => {
      cancelAnnouncement(updatedOrder._id); 
      setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    const handleCancelled = (cancelledOrder) => {
      cancelAnnouncement(cancelledOrder._id); 
      setOrders((prev) => prev.map((o) => (o._id === cancelledOrder._id ? cancelledOrder : o)));
    };

    const handleStoreStatus = ({ storeId, isOpen }) => {
      const currentStoreId = storeData?._id || storeData?.id || user?.storeId || user?.id;
      if (!currentStoreId || storeId === currentStoreId) {
        setIsStoreOpen(isOpen);
      }
    };

    const handleAutoAcceptUpdate = ({ storeId, autoAcceptOrders: newStatus }) => {
      const currentStoreId = storeData?._id || storeData?.id || user?.storeId || user?.id;
      if (!currentStoreId || storeId === currentStoreId) {
        setAutoAcceptOrders(Boolean(newStatus));
      }
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
  }, [socket, queueAnnouncement, cancelAnnouncement, user, storeData]);

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
      // 1. Search query filter
      if (query) {
        const orderNum = (o.orderNumber || '').toString().toLowerCase();
        const custName = (o.customerName || '').toLowerCase();
        const custPhone = (o.customerPhone || '').toLowerCase();
        const itemNames = (o.items || []).map(i => i.name?.toLowerCase()).join(' ');

        const match = orderNum.includes(query) || 
                      custName.includes(query) || 
                      custPhone.includes(query) || 
                      itemNames.includes(query);
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

    if (order.status === 'Ready') {
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
    
    return (
      <View style={[
        styles.card,
        item.status === 'Pending' && styles.pendingCard,
        item.isPreOrder && styles.preOrderCard
      ]}>
        {/* Top Meta Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.orderId}>#{item.orderNumber || item._id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.timeElapsed}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        
        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {item.orderType === 'Take Away' ? (
            <View style={[styles.tagBadge, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
              <Text style={[styles.tagText, { color: '#C2410C' }]}>🛍️ Take Away</Text>
            </View>
          ) : (
            <View style={[styles.tagBadge, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}>
              <Text style={[styles.tagText, { color: '#7E22CE' }]}>🍽️ Dine In</Text>
            </View>
          )}

          {item.isPreOrder && (
            <View style={[styles.tagBadge, { backgroundColor: '#FDF2F8', borderColor: '#FCE7F3' }]}>
              <Text style={[styles.tagText, { color: '#BE185D' }]}>⏰ Pre-Order: {item.scheduledTime}</Text>
            </View>
          )}

          <View style={[styles.tagBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.tagText, { color: '#475569' }]}>
              {item.paymentMethod === 'Razorpay' ? '💳 Online Paid' : '💵 Paid'}
            </Text>
          </View>
        </View>
        
        {/* Pre-order Live Banner */}
        {item.isPreOrder && item.status !== 'Completed' && item.status !== 'Cancelled' && (
          <View style={[
            styles.preOrderBanner, 
            { backgroundColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 65, 35, 0.08)',
              borderColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 65, 35, 0.3)' }
          ]}>
            <Ionicons 
              name={preOrderInfo.isWarning ? 'warning-outline' : 'flame-outline'} 
              size={16} 
              color={preOrderInfo.isWarning ? '#DC2626' : '#EF4123'} 
            />
            <Text style={{ 
              color: preOrderInfo.isWarning ? '#DC2626' : '#EF4123', 
              fontWeight: '700', 
              fontSize: 13,
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

        {/* Customer & Total Row */}
        <View style={styles.customerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name="person-circle-outline" size={18} color="#64748B" />
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName || 'Customer'}
              {item.customerPhone ? ` • ${item.customerPhone}` : ''}
            </Text>
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
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Kitchen Orders</Text>

          <View style={styles.headerControls}>
            {/* Audio Speaker Icon Button */}
            <TouchableOpacity 
              style={[
                styles.audioIconBtn,
                isAudioEnabled && styles.audioIconBtnActive
              ]}
              onPress={playTestSound}
              onLongPress={toggleAudio}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isAudioEnabled ? 'volume-high' : 'volume-mute'} 
                size={19} 
                color={isAudioEnabled ? '#EF4123' : '#94A3B8'} 
              />
            </TouchableOpacity>

            {/* Instant Stall On/Off Switch */}
            <View style={[
              styles.stallSwitchCard,
              isStoreOpen ? styles.stallSwitchCardOpen : styles.stallSwitchCardClosed
            ]}>
              <View style={[styles.miniStatusDot, { backgroundColor: isStoreOpen ? '#EF4123' : '#94A3B8' }]} />
              <Text style={[styles.stallSwitchText, { color: isStoreOpen ? '#EF4123' : '#64748B' }]}>
                {isStoreOpen ? 'STALL OPEN' : 'CLOSED'}
              </Text>
              <Switch
                value={isStoreOpen}
                onValueChange={() => handleToggleStoreStatus(false)}
                disabled={togglingStatus}
                trackColor={{ false: '#CBD5E1', true: '#FED7AA' }}
                thumbColor={isStoreOpen ? '#EF4123' : '#F1F5F9'}
                ios_backgroundColor="#CBD5E1"
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: 2, marginRight: -4 }}
              />
            </View>
          </View>
        </View>

        {/* Sub-Header Row: Live Sync on Left, Quick Auto-Accept on Right */}
        <View style={styles.subHeaderRow}>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Live Sync Active' : (socketError ? `Err: ${socketError}` : 'Reconnecting...')}
            </Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.autoAcceptPill,
              autoAcceptOrders ? styles.autoAcceptPillActive : styles.autoAcceptPillInactive
            ]}
            onPress={handleToggleAutoAccept}
            disabled={togglingAutoAccept}
            activeOpacity={0.75}
          >
            <Ionicons 
              name="flash" 
              size={12} 
              color={autoAcceptOrders ? '#EF4123' : '#64748B'} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[
              styles.autoAcceptPillText,
              { color: autoAcceptOrders ? '#EF4123' : '#64748B' }
            ]}>
              Auto-Accept {autoAcceptOrders ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern 4-Tab Filter Bar */}
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

      {/* Quick Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${filter.toLowerCase()} orders, token, customer...`}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

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
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Queue is Clear!</Text>
                  <Text style={styles.emptySub}>New orders will automatically ring and show up here.</Text>
                </View>
              }
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
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Scheduled Pre-Orders</Text>
                  <Text style={styles.emptySub}>Advance scheduled student orders will appear here.</Text>
                </View>
              }
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
                  <TouchableOpacity
                    onPress={handleCompleteAllReady}
                    activeOpacity={0.85}
                    style={{ marginBottom: 14 }}
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
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Ready Orders</Text>
                  <Text style={styles.emptySub}>Orders that are marked ready will appear here.</Text>
                </View>
              }
            />
          </View>

          {/* Page 3: History */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={historyOrders}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#3B82F6']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Order History</Text>
                  <Text style={styles.emptySub}>Completed or cancelled orders will appear here.</Text>
                </View>
              }
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  audioIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIconBtnActive: {
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderColor: 'rgba(239, 65, 35, 0.25)',
  },
  stallSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  stallSwitchCardOpen: {
    borderColor: 'rgba(239, 65, 35, 0.3)',
    backgroundColor: 'rgba(239, 65, 35, 0.05)',
  },
  stallSwitchCardClosed: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stallSwitchText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  autoAcceptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  autoAcceptPillActive: {
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderColor: 'rgba(239, 65, 35, 0.3)',
  },
  autoAcceptPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  autoAcceptPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 100,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  historyStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 14,
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
    paddingHorizontal: 20,
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
  pendingCard: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
  },
  preOrderCard: {
    borderColor: '#F472B6',
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
  customerName: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
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
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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

});
