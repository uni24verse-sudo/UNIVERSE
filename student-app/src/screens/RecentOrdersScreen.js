import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';
import { useCart } from '../context/CartContext';
import apiClient from '../api/client';

const RecentOrdersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { reorder } = useCart();
  const [phone, setPhone] = useState('');
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('universe_customer_phone');
      if (savedPhone) setPhone(savedPhone);

      const targetPhone = savedPhone || phone;
      if (targetPhone && targetPhone.replace(/\D/g, '').length === 10) {
        const clean = targetPhone.replace(/\D/g, '');
        const res = await apiClient.get('/orders/customer/history', {
          params: { phone: clean }
        });
        if (res.data) {
          setActiveOrders(res.data.activeOrders || []);
          setPastOrders(res.data.orders || []);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Fallback: local saved orders
      const local = JSON.parse(await AsyncStorage.getItem('universe_recent_orders') || '[]');
      if (local.length > 0) {
        const rehydrated = await Promise.all(local.map(async (o) => {
          try {
            const res = await apiClient.get(`/orders/${o.id}`);
            return { ...o, ...res.data };
          } catch (e) {
            return o;
          }
        }));
        setActiveOrders(rehydrated.filter(o => ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)));
        setPastOrders(rehydrated.filter(o => ['Completed', 'Cancelled'].includes(o.status)));
      }
    } catch (err) {
      console.error('Failed to load orders history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleReorder = (order) => {
    if (order.items && order.items.length > 0) {
      reorder(
        order.items,
        order.storeId?._id || order.storeId?.id || order.storeId,
        order.storeId?.name || order.storeName || 'Campus Stall',
        order.locationId?._id || order.locationId
      );
      navigation.navigate('Cart');
    }
  };

  const renderOrderCard = (order, isActive = false) => {
    const isReady = order.status === 'Ready';
    const storeName = order.storeId?.name || order.storeName || 'Campus Stall';
    const itemsCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);

    return (
      <View key={order._id || order.id} style={[styles.orderCard, isActive && styles.activeOrderCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stallName} numberOfLines={1}>{storeName}</Text>
            <Text style={styles.orderIdText}>Order #{String(order._id || order.id).slice(-6)}</Text>
          </View>

          <View style={[styles.statusBadge, isActive ? (isReady ? styles.readyBadge : styles.activeBadge) : styles.completedBadge]}>
            <Text style={[styles.statusBadgeText, isActive ? styles.activeBadgeText : styles.completedBadgeText]}>
              {order.status}
            </Text>
          </View>
        </View>

        {/* Dishes list snippet */}
        <Text style={styles.itemsSummary} numberOfLines={2}>
          {(order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.totalPrice}>₹{order.totalAmount}</Text>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate('OrderTracker', { id: order._id || order.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.trackBtnText}>{isActive ? 'Live Track' : 'View Receipt'}</Text>
              <Feather name="arrow-right" size={14} color={THEME.colors.primary} />
            </TouchableOpacity>

            {!isActive && (
              <TouchableOpacity
                style={styles.reorderBtn}
                onPress={() => handleReorder(order)}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={13} color="#FFFFFF" />
                <Text style={styles.reorderBtnText}>Reorder</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Campus Orders</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={18} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Phone Lookup Input */}
      <View style={styles.phoneBox}>
        <Feather name="phone" size={16} color={THEME.colors.textMuted} />
        <TextInput
          placeholder="Lookup orders by mobile number..."
          placeholderTextColor={THEME.colors.textMuted}
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          onSubmitEditing={fetchOrders}
          style={styles.phoneInput}
        />
        <TouchableOpacity onPress={fetchOrders} style={styles.lookupBtn}>
          <Text style={styles.lookupBtnText}>Sync</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading order history...</Text>
        </View>
      ) : (
        <FlatList
          data={[...activeOrders.map(o => ({ ...o, _isActive: true })), ...pastOrders.map(o => ({ ...o, _isActive: false }))]}
          keyExtractor={(item) => item._id || item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySub}>Enter your 10-digit mobile number above to view all past meals.</Text>
            </View>
          }
          renderItem={({ item }) => renderOrderCard(item, item._isActive)}
        />
      )}
      <View style={{ height: 80 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  refreshBtn: {
    padding: 6,
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  lookupBtn: {
    backgroundColor: THEME.colors.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.sm,
  },
  lookupBtnText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  activeOrderCard: {
    borderColor: THEME.colors.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stallName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  orderIdText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
  },
  activeBadge: {
    backgroundColor: THEME.colors.primarySoft,
  },
  readyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeBadgeText: {
    color: THEME.colors.primary,
  },
  completedBadgeText: {
    color: THEME.colors.textSecondary,
  },
  itemsSummary: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.primarySoft,
  },
  trackBtnText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.textPrimary,
  },
  reorderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});

export default RecentOrdersScreen;
