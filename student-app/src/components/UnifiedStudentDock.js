import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UnifiedStudentDock = ({ navigation, currentRouteName = 'Home' }) => {
  const insets = useSafeAreaInsets();
  const { totalItems, subtotal } = useCart();
  const { socket, connected } = useSocket();

  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);

  // Hide on checkout, tracker, splash, and location select screens
  const hideOn = ['Cart', 'OrderTracker', 'Splash', 'LocationPortal'];
  const shouldHide = hideOn.includes(currentRouteName);

  const loadCustomerOrders = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('universe_customer_phone');
      const localRecent = JSON.parse(await AsyncStorage.getItem('universe_recent_orders') || '[]');

      if (phone) {
        const clean = phone.replace(/\D/g, '').slice(-10);
        if (clean.length === 10) {
          const res = await apiClient.get('/orders/customer/history', {
            params: { phone: clean },
          });
          if (res.data) {
            setActiveOrders(res.data.activeOrders || []);
            setPastOrders(res.data.orders || []);
            return;
          }
        }
      }

      // Fallback: local saved recent orders
      if (localRecent.length > 0) {
        const rehydrated = await Promise.all(
          localRecent.slice(0, 10).map(async (o) => {
            try {
              const res = await apiClient.get(`/orders/${o.id || o._id}`);
              return { ...o, ...res.data };
            } catch (_) {
              return o;
            }
          })
        );
        const active = rehydrated.filter((o) =>
          ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)
        );
        const past = rehydrated.filter((o) =>
          ['Completed', 'Cancelled'].includes(o.status)
        );
        setActiveOrders(active);
        setPastOrders(past);
      } else {
        setActiveOrders([]);
        setPastOrders([]);
      }
    } catch (err) {
      // Quiet fail
    }
  }, []);

  useEffect(() => {
    if (!shouldHide) {
      loadCustomerOrders();
      const interval = setInterval(loadCustomerOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [shouldHide, loadCustomerOrders]);

  // Join real-time socket room for all active customer orders
  useEffect(() => {
    if (!socket || !connected || activeOrders.length === 0) return;
    activeOrders.forEach(ord => {
      const ordId = ord._id || ord.id;
      if (ordId) {
        socket.emit('join_order_room', ordId.toString());
      }
    });
  }, [socket, connected, activeOrders]);

  // Real-time socket status updates
  useEffect(() => {
    if (!socket || !connected || shouldHide) return;

    const handleUpdate = () => {
      loadCustomerOrders();
    };

    socket.on('order_status_update', handleUpdate);
    return () => {
      socket.off('order_status_update', handleUpdate);
    };
  }, [socket, connected, shouldHide, loadCustomerOrders]);

  if (shouldHide) {
    return null;
  }

  const primaryActiveOrder = activeOrders[0];
  const hasActiveOrder = Boolean(primaryActiveOrder);
  const hasCart = totalItems > 0 && currentRouteName !== 'Cart';
  const orderCount = activeOrders.length + pastOrders.length;

  return (
    <View
      style={[
        styles.dockWrapper,
        { bottom: Math.max(insets.bottom, 12) + 6 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dockBar}>
        {/* 1. ACTIVE ORDER STATUS PILL (Matching Webapp) */}
        {hasActiveOrder && (
          <TouchableOpacity
            style={[
              styles.activeOrderPill,
              primaryActiveOrder.status === 'Ready'
                ? styles.readyBorder
                : primaryActiveOrder.status === 'Cooking'
                ? styles.cookingBorder
                : styles.pendingBorder,
            ]}
            onPress={() =>
              navigation.navigate('OrderTracker', {
                id: primaryActiveOrder._id || primaryActiveOrder.id,
              })
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.statusIconCircle,
                primaryActiveOrder.status === 'Ready'
                  ? styles.readyBg
                  : primaryActiveOrder.status === 'Cooking'
                  ? styles.cookingBg
                  : styles.pendingBg,
              ]}
            >
              {primaryActiveOrder.status === 'Ready' ? (
                <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              ) : primaryActiveOrder.status === 'Cooking' ? (
                <Ionicons name="flame" size={15} color="#FFFFFF" />
              ) : (
                <Feather name="clock" size={13} color="#FFFFFF" />
              )}
            </View>

            <View style={styles.activeOrderInfo}>
              <View style={styles.orderNumberRow}>
                <Text style={styles.orderNumberText}>
                  #{primaryActiveOrder.orderNumber || (primaryActiveOrder._id || '').slice(-4).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.orderStatusTag,
                    primaryActiveOrder.status === 'Ready'
                      ? styles.readyTag
                      : primaryActiveOrder.status === 'Cooking'
                      ? styles.cookingTag
                      : styles.pendingTag,
                  ]}
                >
                  <Text style={styles.orderStatusTagText}>
                    {primaryActiveOrder.status === 'Ready'
                      ? 'READY'
                      : primaryActiveOrder.status === 'Cooking'
                      ? 'COOKING'
                      : primaryActiveOrder.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.activeOrderStore} numberOfLines={1}>
                {primaryActiveOrder.store?.name || primaryActiveOrder.storeName || 'Campus Counter'}
              </Text>
            </View>

            <Feather name="chevron-right" size={15} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* 2. CART PILL (Matching Webapp: 🛍️ items + ₹total + View Cart button) */}
        {hasCart && (
          <TouchableOpacity
            style={styles.cartPill}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.88}
          >
            <View style={styles.cartLeft}>
              <View style={styles.cartIconCircle}>
                <Feather name="shopping-bag" size={14} color="#FFFFFF" />
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text style={styles.cartItemCountText}>
                  {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                </Text>
                <Text style={styles.cartTotalText}>₹{subtotal}</Text>
              </View>
            </View>

            <View style={styles.viewCartButton}>
              <Text style={styles.viewCartButtonText}>View Cart</Text>
              <Feather name="arrow-right" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* 3. 24/7 ORDERS BUTTON (Matching Webapp & Image 2: Red Badge + Orders) */}
        <TouchableOpacity
          style={[
            styles.ordersBtn,
            (hasActiveOrder || hasCart) && styles.ordersBtnBordered,
          ]}
          onPress={() => navigation.navigate('RecentOrders')}
          activeOpacity={0.85}
        >
          {orderCount > 0 ? (
            <View style={styles.ordersBadgeSolid}>
              <Text style={styles.ordersBadgeSolidText}>{orderCount}</Text>
            </View>
          ) : (
            <Feather name="clock" size={16} color={THEME.colors.primary} />
          )}
          <Text style={styles.ordersBtnText}>Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  dockBar: {
    maxWidth: SCREEN_WIDTH - 24,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },

  /* 1. Active Order Pill */
  activeOrderPill: {
    flex: 1,
    minWidth: 150,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  readyBorder: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  cookingBorder: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  pendingBorder: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  statusIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBg: { backgroundColor: '#10B981' },
  cookingBg: { backgroundColor: '#F59E0B' },
  pendingBg: { backgroundColor: '#3B82F6' },
  activeOrderInfo: {
    flex: 1,
    minWidth: 0,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderStatusTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  readyTag: { backgroundColor: '#10B981' },
  cookingTag: { backgroundColor: '#F59E0B' },
  pendingTag: { backgroundColor: '#64748B' },
  orderStatusTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  activeOrderStore: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },

  /* 2. Cart Pill */
  cartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 65, 35, 0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 10,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cartIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 14,
  },
  cartTotalText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
    lineHeight: 14,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 3,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  viewCartButtonText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },

  /* 3. Orders Button */
  ordersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 7,
  },
  ordersBtnBordered: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  ordersIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  ordersBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  ordersBadgeSolid: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersBadgeSolidText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  ordersBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default UnifiedStudentDock;
