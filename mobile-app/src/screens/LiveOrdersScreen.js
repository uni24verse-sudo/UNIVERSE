import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';
import { useAudioAlerts } from '../hooks/useAudioAlerts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LiveOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Active'); // 'Active', 'Ready'
  
  const { isAudioEnabled, toggleAudio, queueAnnouncement, cancelAnnouncement } = useAudioAlerts();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const storeId = user?.storeId || user?.id;
      const response = await apiClient.get(`/orders/${storeId}/vendor-orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (isConnected) fetchOrders();
  }, [isConnected, fetchOrders]);

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
  }, [socket]);

  const updateStatus = async (orderId, currentStatus, newStatus) => {
    try {
      const targetOrder = orders.find(o => o._id === orderId);
      if (targetOrder.status !== currentStatus) {
        Alert.alert('Hold on!', 'This order has already been updated by someone else.');
        return;
      }

      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Conflict', 'Someone else already processed this order!');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update order');
      }
      fetchOrders();
    }
  };

  const displayOrders = orders.filter((o) => {
    if (o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Payment Pending') return false;
    if (filter === 'Active' && (o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Cooking')) return true;
    if (filter === 'Ready' && o.status === 'Ready') return true;
    return false;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#F59E0B';
      case 'Confirmed': return '#3B82F6';
      case 'Cooking': return '#8B5CF6';
      case 'Ready': return '#10B981';
      default: return '#64748B';
    }
  };

  const getActionButtons = (order) => {
    if (order.status === 'Pending') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => updateStatus(order._id, 'Pending', 'Confirmed')}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientBtn}>
              <Text style={styles.btnText}>Accept</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => updateStatus(order._id, 'Pending', 'Cancelled')}>
            <View style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>Reject</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    if (order.status === 'Confirmed') {
      return (
        <TouchableOpacity onPress={() => updateStatus(order._id, 'Confirmed', 'Cooking')}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.gradientBtn}>
            <Text style={styles.btnText}>Start Cooking</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    if (order.status === 'Cooking') {
      return (
        <TouchableOpacity onPress={() => updateStatus(order._id, 'Cooking', 'Ready')}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientBtn}>
            <Text style={styles.btnText}>Mark Ready</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{item._id.slice(-6).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) + '50' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.itemsList}>
        {item.items.map((cartItem, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemQty}>{cartItem.quantity}x</Text>
            <Text style={styles.itemName}>{cartItem.menuItem?.name || 'Item'}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.customerName}>User: {item.customerName || 'Guest'}</Text>

      <View style={styles.cardFooter}>
        {getActionButtons(item)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Orders</Text>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.connectionText}>{isConnected ? 'Connected' : 'Reconnecting...'}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.audioToggle, { backgroundColor: isAudioEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}
          onPress={toggleAudio}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: isAudioEnabled ? '#10B981' : '#EF4444' }}>
            {isAudioEnabled ? 'SOUND ON' : 'MUTED'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {['Active', 'Ready'].map((t) => (
          <TouchableOpacity 
            key={t} 
            style={[styles.tab, filter === t && styles.activeTab]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.tabText, filter === t && styles.activeTabText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && orders.length === 0 ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🥡</Text>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySub}>No {filter.toLowerCase()} orders at the moment.</Text>
            </View>
          }
        />
      )}

      {filter === 'Ready' && (
        <TouchableOpacity style={styles.fabContainer} onPress={() => navigation.navigate('Scanner')} activeOpacity={0.8}>
          <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="qr-code-outline" size={24} color="white" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white', letterSpacing: 0.5 }}>Scan QR</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
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
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  audioToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTab: {
    backgroundColor: '#38BDF8',
    borderColor: '#0EA5E9',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 15,
  },
  activeTabText: {
    color: '#0F172A',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderId: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsList: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQty: {
    color: '#38BDF8',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  itemName: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  customerName: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gradientBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  dangerBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 15,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  fab: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
