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
  RefreshControl 
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
import PagerView from 'react-native-pager-view';

export default function LiveOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { socket, isConnected, socketError } = useContext(SocketContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Active'); // 'Active', 'Ready', 'History'
  const pagerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);
  
  const { isAudioEnabled, toggleAudio, queueAnnouncement, cancelAnnouncement } = useAudioAlerts();

  // Role check: employees must not see financial/revenue summaries for privacy
  const isEmployee = user?.role === 'employee';

  const isFocused = useIsFocused();

  // Tick every 30 seconds to refresh relative times and pre-order countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

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
    }
  }, [isFocused, fetchOrders]);

  useEffect(() => {
    if (isConnected) fetchOrders();
  }, [isConnected, fetchOrders]);

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

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_cancelled', handleCancelled);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_cancelled', handleCancelled);
    };
  }, [socket, queueAnnouncement, cancelAnnouncement]);

  const updateStatus = async (orderId, currentStatus, newStatus) => {
    try {
      const targetOrder = orders.find(o => o._id === orderId);
      if (targetOrder && targetOrder.status !== currentStatus) {
        Alert.alert('Hold on!', 'This order has already been updated by another team member.');
        return;
      }

      // Optimistic Update
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Conflict', 'Someone else already processed this order!');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update order status');
      }
      fetchOrders();
    }
  };

  // Pre-order calculation helper
  const getPreOrderInfo = (order) => {
    if (!order.isPreOrder || !order.scheduledTime) return { isPreOrder: false, locked: false, text: '' };
    
    const [hours, minutes] = order.scheduledTime.split(':').map(Number);
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    const diffMs = scheduledDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

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
    const ready = orders.filter(o => o.status === 'Ready').length;
    const history = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status)).length;
    return { active, ready, history };
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
  const readyOrders = useMemo(() => displayOrders.filter(o => o.status === 'Ready'), [displayOrders]);
  const historyOrders = useMemo(() => displayOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status)), [displayOrders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#F59E0B';
      case 'Confirmed': return '#3B82F6';
      case 'Cooking': return '#8B5CF6';
      case 'Ready': return '#10B981';
      case 'Completed': return '#059669';
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
        <TouchableOpacity 
          onPress={() => updateStatus(order._id, 'Confirmed', 'Cooking')}
          disabled={preOrderInfo.locked}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={preOrderInfo.locked ? ['#94A3B8', '#64748B'] : ['#8B5CF6', '#7C3AED']} 
            style={styles.gradientBtn}
          >
            <Ionicons name="restaurant-outline" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>
              {preOrderInfo.locked ? 'Scheduled for Later' : 'Start Cooking'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
        <TouchableOpacity 
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#10B981', '#047857']} style={styles.gradientBtn}>
            <Ionicons name="qr-code-outline" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Scan QR Handover</Text>
          </LinearGradient>
        </TouchableOpacity>
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
            { backgroundColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              borderColor: preOrderInfo.isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' }
          ]}>
            <Ionicons 
              name={preOrderInfo.isWarning ? 'warning-outline' : 'flame-outline'} 
              size={16} 
              color={preOrderInfo.isWarning ? '#DC2626' : '#059669'} 
            />
            <Text style={{ 
              color: preOrderInfo.isWarning ? '#DC2626' : '#059669', 
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
        <View>
          <Text style={styles.headerTitle}>Kitchen Orders</Text>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Live Sync Active' : (socketError ? `Err: ${socketError}` : 'Reconnecting...')}
            </Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.audioToggle, { backgroundColor: isAudioEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}
            onPress={toggleAudio}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isAudioEnabled ? 'volume-high' : 'volume-mute'} 
              size={18} 
              color={isAudioEnabled ? '#10B981' : '#EF4444'} 
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: isAudioEnabled ? '#10B981' : '#EF4444', marginLeft: 4 }}>
              {isAudioEnabled ? 'AUDIO ON' : 'MUTED'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern 3-Tab Filter Bar */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'Active', label: 'Active', count: counts.active, color: '#3B82F6' },
          { key: 'Ready', label: 'Ready', count: counts.ready, color: '#10B981' },
          { key: 'History', label: 'History', count: counts.history, color: '#64748B' },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity 
              key={tab.key} 
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setFilter(tab.key);
                const pageIndex = tab.key === 'Active' ? 0 : tab.key === 'Ready' ? 1 : 2;
                pagerRef.current?.setPage(pageIndex);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              <View style={[
                styles.tabBadge, 
                isActive ? styles.tabBadgeActive : styles.tabBadgeInactive
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
        <PagerView 
          style={styles.pagerView} 
          initialPage={0}
          ref={pagerRef}
          onPageSelected={(e) => {
            const index = e.nativeEvent.position;
            if (index === 0) setFilter('Active');
            if (index === 1) setFilter('Ready');
            if (index === 2) setFilter('History');
          }}
        >
          {/* Page 0: Active */}
          <View key="1" style={styles.page}>
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

          {/* Page 1: Ready */}
          <View key="2" style={styles.page}>
            <FlatList
              data={readyOrders}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#3B82F6']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Ready Orders</Text>
                  <Text style={styles.emptySub}>Orders that are marked ready will appear here.</Text>
                </View>
              }
            />
          </View>

          {/* Page 2: History */}
          <View key="3" style={styles.page}>
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
        </PagerView>
      )}

      {/* Floating QR Scanner Button on Ready tab */}
      {filter === 'Ready' && displayOrders.length > 0 && (
        <TouchableOpacity 
          style={styles.fabContainer} 
          onPress={() => navigation.navigate('Scanner')} 
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#10B981', '#059669']} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
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
  audioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tabBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
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
    color: '#059669',
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
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  completedText: {
    color: '#059669',
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
    shadowColor: '#10B981',
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
});
