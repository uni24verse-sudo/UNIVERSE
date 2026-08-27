import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  Switch, 
  ActivityIndicator, 
  RefreshControl,
  Image,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toggling, setToggling] = useState({});

  const fetchStore = async () => {
    try {
      const res = await apiClient.get('/store/my-stores');
      if (res.data && res.data.length > 0) {
        setStore(res.data[0]); // Default to first store
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStore();
  }, []);

  const handleToggle = async (productId, currentStatus) => {
    if (!store) return;
    
    // Optimistic UI Update
    setToggling(prev => ({ ...prev, [productId]: true }));
    setStore(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p._id === productId ? { ...p, isAvailable: !currentStatus } : p
      )
    }));

    try {
      await apiClient.put(`/store/${store._id}/product/${productId}/toggle`);
    } catch (error) {
      console.error('Failed to toggle product:', error);
      // Revert on failure
      setStore(prev => ({
        ...prev,
        products: prev.products.map(p => 
          p._id === productId ? { ...p, isAvailable: currentStatus } : p
        )
      }));
      alert('Failed to update stock status.');
    } finally {
      setToggling(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4123" />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No store found.</Text>
      </View>
    );
  }

  const filteredProducts = store.products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderProduct = ({ item }) => {
    // If isAvailable is undefined, it defaults to true
    const isAvailable = item.isAvailable !== false;
    
    return (
      <View style={[styles.productCard, !isAvailable && styles.productCardUnavailable]}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          <Text style={styles.productCategory}>{item.category || 'General'}</Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={[styles.statusText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
            {isAvailable ? 'In Stock' : 'Out of Stock'}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={() => handleToggle(item._id, isAvailable)}
            disabled={toggling[item._id]}
            trackColor={{ false: '#FCA5A5', true: '#6EE7B7' }}
            thumbColor={isAvailable ? '#10B981' : '#EF4444'}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items by name or category..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF4123']} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found matching "{searchQuery}"</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardUnavailable: {
    opacity: 0.6,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748B',
    fontSize: 16,
  }
});
