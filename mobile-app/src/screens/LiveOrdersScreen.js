import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';
import * as Notifications from 'expo-notifications';

export default function LiveOrdersScreen() {
  const { user } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending'); // 'Pending', 'Cooking', 'Ready'

  // Fetch initial orders via REST
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

  // Initial Sync and Re-sync on reconnect
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (isConnected) {
      fetchOrders(); // Resync immediately if we reconnect to avoid missing events
    }
  }, [isConnected, fetchOrders]);

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleStatusUpdate = (updatedOrder) => {
      setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    const handleCancelled = (cancelledOrder) => {
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

  // Handle State Transitions Atomically
  const updateStatus = async (orderId, currentStatus, newStatus) => {
    try {
      // Optimistic lock check (the backend enforces this too, but we block it here as well)
      const targetOrder = orders.find(o => o._id === orderId);
      if (targetOrder.status !== currentStatus) {
        Alert.alert('Hold on!', 'This order has already been updated by someone else.');
        return;
      }

      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      // We don't need to manually update state; Socket.IO will broadcast the success!
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Conflict', 'Someone else already processed this order!');
        fetchOrders(); // Resync to get the true state
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update order');
      }
    }
  };

  // Filter Active Orders
  const displayOrders = orders.filter((o) => {
    if (o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Payment Pending') return false;
    
    if (filter === 'Pending' && o.status === 'Pending') return true;
    if (filter === 'Cooking' && (o.status === 'Confirmed' || o.status === 'Cooking')) return true;
    if (filter === 'Ready' && o.status === 'Ready') return true;
    return false;
  });

  const getActionButtons = (order) => {
    if (order.status === 'Pending') {
      return (
        <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(order._id, 'Pending', 'Confirmed')}>
          <Text style={styles.actionText}>Accept Order</Text>
        </TouchableOpacity>
      );
    }
    if (order.status === 'Confirmed') {
      return (
        <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(order._id, 'Confirmed', 'Cooking')}>
          <Text style={styles.actionText}>Start Cooking</Text>
        </TouchableOpacity>
      );
    }
    if (order.status === 'Cooking') {
      return (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10b981' }]} onPress={() => updateStatus(order._id, 'Cooking', 'Ready')}>
          <Text style={styles.actionText}>Mark Ready</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <Text style={styles.customerName}>{item.customerName || 'Walk-in Customer'}</Text>

      <View style={styles.itemsContainer}>
        {item.items.map((i, idx) => (
          <Text key={idx} style={styles.itemText}>
            {i.quantity}x {i.name} {i.variant ? `(${i.variant})` : ''}
          </Text>
        ))}
      </View>

      <View style={styles.cardFooter}>
        {getActionButtons(item)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Orders</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#ff4757', padding: 8, borderRadius: 8 }}
          onPress={async () => {
            const categories = await Notifications.getNotificationCategoriesAsync();
            console.log('Registered Categories:', categories);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Local Action Test 🚀",
                body: "Do you see the Accept/Reject buttons?",
                categoryIdentifier: "order_pending",
                sound: true,
              },
              trigger: null,
            });
            alert('Fired! Check your notification shade.');
          }}
        >
          <Text style={{ color: 'white' }}>Test Action Push</Text>
        </TouchableOpacity>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
      </View>

      <View style={styles.tabs}>
        {['Pending', 'Cooking', 'Ready'].map((t) => (
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
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No {filter.toLowerCase()} orders.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeText: {
    color: '#888',
  },
  customerName: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
  },
  itemsContainer: {
    backgroundColor: '#2d2d2d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  itemText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },
  cardFooter: {
    alignItems: 'stretch',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
