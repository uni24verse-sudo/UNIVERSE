import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  Switch, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { SocketContext } from '../context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUICK_CATEGORIES = ['All', 'Snacks', 'Beverages', 'Meals', 'Fast Food', 'Desserts', 'Other'];
const FORM_CATEGORIES = ['Snacks', 'Beverages', 'Meals', 'Fast Food', 'Desserts', 'Other'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { socket } = useContext(SocketContext);

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [togglingProducts, setTogglingProducts] = useState({});
  const [deletingProducts, setDeletingProducts] = useState({});

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'Snacks',
    dietaryPreference: 'veg',
    description: ''
  });

  // Fetch Vendor Store Data
  const fetchStore = async () => {
    try {
      const res = await apiClient.get('/store/my-stores');
      if (res.data && res.data.length > 0) {
        setStore(res.data[0]); // Default to primary store
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
      Alert.alert('Error', 'Failed to load store menu. Please check your connection.');
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

  // Real-time WebSocket synchronization
  useEffect(() => {
    if (!socket || !store) return;
    const storeId = store._id || store.id;

    const handleStoreStatus = ({ storeId: updatedStoreId, isOpen }) => {
      if (updatedStoreId === storeId) {
        setStore(prev => prev ? { ...prev, isOpen } : prev);
      }
    };

    const handleProductAvailability = ({ storeId: updatedStoreId, productId, isAvailable }) => {
      if (updatedStoreId === storeId) {
        setStore(prev => {
          if (!prev) return prev;
          const updatedProducts = (prev.products || []).map(p => 
            (p._id === productId || p.id === productId) ? { ...p, isAvailable } : p
          );
          return { ...prev, products: updatedProducts };
        });
      }
    };

    const handleStoreMenu = ({ storeId: updatedStoreId, products }) => {
      if (updatedStoreId === storeId && Array.isArray(products)) {
        setStore(prev => prev ? { ...prev, products } : prev);
      }
    };

    socket.on('store_status_update', handleStoreStatus);
    socket.on('product_availability_update', handleProductAvailability);
    socket.on('store_menu_update', handleStoreMenu);

    return () => {
      socket.off('store_status_update', handleStoreStatus);
      socket.off('product_availability_update', handleProductAvailability);
      socket.off('store_menu_update', handleStoreMenu);
    };
  }, [socket, store?._id, store?.id]);

  // Stall Open/Closed Status Toggle with Pending Orders Protection
  const handleToggleStoreStatus = async (forceCancel = false) => {
    if (!store || togglingStatus) return;
    const storeId = store._id || store.id;

    setTogglingStatus(true);
    try {
      const res = await apiClient.put(`/store/${storeId}/toggle-status`, {
        forceCancelPending: forceCancel
      });

      // Backend detected pending orders and requires confirmation before cancelling them
      if (res.data.requiresConfirmation) {
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

      // Success
      setStore(prev => ({
        ...prev,
        isOpen: res.data.isOpen !== undefined ? res.data.isOpen : !prev.isOpen
      }));
    } catch (error) {
      console.error('Failed to toggle stall status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update stall status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Toggle Individual Product Stock Availability
  const handleToggleStock = async (productId, currentStatus) => {
    if (!store) return;
    const storeId = store._id || store.id;

    // Optimistic UI update
    setTogglingProducts(prev => ({ ...prev, [productId]: true }));
    setStore(prev => ({
      ...prev,
      products: (prev.products || []).map(p => 
        (p._id === productId || p.id === productId) ? { ...p, isAvailable: !currentStatus } : p
      )
    }));

    try {
      await apiClient.put(`/store/${storeId}/product/${productId}/toggle`);
    } catch (error) {
      console.error('Failed to toggle product stock:', error);
      // Revert on error
      setStore(prev => ({
        ...prev,
        products: (prev.products || []).map(p => 
          (p._id === productId || p.id === productId) ? { ...p, isAvailable: currentStatus } : p
        )
      }));
      Alert.alert('Error', 'Failed to update stock status.');
    } finally {
      setTogglingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Delete Product completely from Stall
  const confirmDeleteProduct = (product) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to permanently delete "${product.name}" from your stall menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteProduct(product._id || product.id)
        }
      ]
    );
  };

  const handleDeleteProduct = async (productId) => {
    if (!store) return;
    const storeId = store._id || store.id;

    setDeletingProducts(prev => ({ ...prev, [productId]: true }));
    const originalProducts = store.products;

    // Optimistic delete
    setStore(prev => ({
      ...prev,
      products: (prev.products || []).filter(p => (p._id || p.id) !== productId)
    }));

    try {
      const res = await apiClient.delete(`/store/${storeId}/product/${productId}`);
      if (res.data && res.data.products) {
        setStore(res.data);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      // Rollback
      setStore(prev => ({ ...prev, products: originalProducts }));
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete item.');
    } finally {
      setDeletingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Add New Product Submission
  const handleAddProduct = async () => {
    if (!newItem.name.trim()) {
      Alert.alert('Validation Error', 'Please enter an item name.');
      return;
    }
    const parsedPrice = parseFloat(newItem.price);
    if (!newItem.price || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0.');
      return;
    }

    setAddingProduct(true);
    const storeId = store._id || store.id;

    try {
      const res = await apiClient.post(`/store/${storeId}/product`, {
        name: newItem.name.trim(),
        price: parsedPrice,
        category: newItem.category.trim() || 'General',
        dietaryPreference: newItem.dietaryPreference || 'veg',
        description: newItem.description.trim()
      });

      if (res.data) {
        setStore(res.data);
      }

      setShowAddModal(false);
      setNewItem({
        name: '',
        price: '',
        category: 'Snacks',
        dietaryPreference: 'veg',
        description: ''
      });
      Alert.alert('Success', 'New item added to your stall menu!');
    } catch (error) {
      console.error('Failed to add product:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add item to menu.');
    } finally {
      setAddingProduct(false);
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    if (!store || !store.products) return [];
    return store.products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = 
        selectedCategory === 'All' || 
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [store, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4123" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Loading your stall menu...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.center}>
        <Ionicons name="storefront-outline" size={48} color="#94A3B8" />
        <Text style={styles.errorText}>No stall assigned to your account.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStore}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOpen = store.isOpen !== false;

  const renderProduct = ({ item }) => {
    const isAvailable = item.isAvailable !== false;
    const pId = item._id || item.id;
    const isDeleting = deletingProducts[pId];
    const isToggling = togglingProducts[pId];

    return (
      <View style={[styles.productCard, !isAvailable && styles.productCardUnavailable]}>
        <View style={styles.productLeft}>
          <View style={styles.productTitleRow}>
            {/* Dietary Preference Indicator */}
            {item.dietaryPreference === 'veg' && (
              <View style={[styles.dietaryBadge, { borderColor: '#10B981' }]}>
                <View style={[styles.dietaryDot, { backgroundColor: '#10B981' }]} />
              </View>
            )}
            {item.dietaryPreference === 'non-veg' && (
              <View style={[styles.dietaryBadge, { borderColor: '#EF4444' }]}>
                <View style={[styles.dietaryDot, { backgroundColor: '#EF4444' }]} />
              </View>
            )}
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          </View>

          <View style={styles.productMetaRow}>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || 'General'}</Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>

        <View style={styles.productActions}>
          {/* Stock Availability Toggle */}
          <View style={styles.stockControl}>
            <Text style={[styles.statusText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={() => handleToggleStock(pId, isAvailable)}
              disabled={isToggling || isDeleting}
              trackColor={{ false: '#FECACA', true: '#A7F3D0' }}
              thumbColor={isAvailable ? '#10B981' : '#EF4444'}
            />
          </View>

          {/* Delete Button */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmDeleteProduct(item)}
            disabled={isDeleting || isToggling}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menu & Stall</Text>
          <Text style={styles.headerSubtitle}>{store.name || 'Vendor Stall'}</Text>
        </View>

        <TouchableOpacity 
          style={styles.addItemHeaderBtn} 
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addItemHeaderBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id || item.id || String(Math.random())}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF4123']} />
        }
        ListHeaderComponent={
          <View>
            {/* Stall Hero Control Card */}
            <View style={[styles.stallCard, isOpen ? styles.stallCardOpen : styles.stallCardClosed]}>
              <View style={styles.stallCardHeader}>
                <View style={styles.stallStatusInfo}>
                  <View style={styles.stallStatusBadgeRow}>
                    <View style={[styles.statusDot, { backgroundColor: isOpen ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.stallStatusBadgeText, { color: isOpen ? '#10B981' : '#EF4444' }]}>
                      {isOpen ? 'STALL IS OPEN' : 'STALL IS CLOSED'}
                    </Text>
                  </View>
                  <Text style={styles.stallStatusDesc}>
                    {isOpen 
                      ? 'Currently accepting live orders from students.' 
                      : 'Closed. Students cannot place new orders.'}
                  </Text>
                </View>

                <View style={styles.stallToggleContainer}>
                  {togglingStatus ? (
                    <ActivityIndicator size="small" color={isOpen ? '#10B981' : '#EF4444'} />
                  ) : (
                    <Switch
                      value={isOpen}
                      onValueChange={() => handleToggleStoreStatus(false)}
                      disabled={togglingStatus}
                      trackColor={{ false: '#FECACA', true: '#A7F3D0' }}
                      thumbColor={isOpen ? '#10B981' : '#EF4444'}
                    />
                  )}
                </View>
              </View>

              <View style={styles.stallCardDivider} />

              <View style={styles.stallCardFooter}>
                <View style={styles.stallStat}>
                  <Ionicons name="location-outline" size={14} color="#64748B" />
                  <Text style={styles.stallStatText}>{store.market || 'Campus'}</Text>
                </View>
                <View style={styles.stallStat}>
                  <Ionicons name="fast-food-outline" size={14} color="#64748B" />
                  <Text style={styles.stallStatText}>{(store.products || []).length} Menu Items</Text>
                </View>
                <View style={styles.stallStat}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                  <Text style={styles.stallStatText}>
                    {(store.products || []).filter(p => p.isAvailable !== false).length} In Stock
                  </Text>
                </View>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search dish, category..."
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

            {/* Category Filter Pills */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {QUICK_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'All' ? 'All Dishes' : selectedCategory} ({filteredProducts.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {searchQuery ? `No items found matching "${searchQuery}"` : 'No menu items found.'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyAddButtonText}>+ Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Menu Item</Text>
                <Text style={styles.modalSubtitle}>Added items immediately sync to student apps</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
              {/* Item Name */}
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Veg Cheese Sandwich, Cold Coffee"
                placeholderTextColor="#94A3B8"
                value={newItem.name}
                onChangeText={txt => setNewItem(prev => ({ ...prev, name: txt }))}
              />

              {/* Item Price */}
              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 60"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={newItem.price}
                onChangeText={txt => setNewItem(prev => ({ ...prev, price: txt }))}
              />

              {/* Dietary Preference */}
              <Text style={styles.inputLabel}>Dietary Preference</Text>
              <View style={styles.dietarySelectRow}>
                {[
                  { key: 'veg', label: 'Veg', color: '#10B981' },
                  { key: 'non-veg', label: 'Non-Veg', color: '#EF4444' },
                  { key: 'none', label: 'None / Other', color: '#64748B' }
                ].map(opt => {
                  const isSelected = newItem.dietaryPreference === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.dietaryOption,
                        isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}15` }
                      ]}
                      onPress={() => setNewItem(prev => ({ ...prev, dietaryPreference: opt.key }))}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dietaryDot, { backgroundColor: opt.color }]} />
                      <Text style={[styles.dietaryOptionText, isSelected && { color: opt.color, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.formCategoryWrap}>
                {FORM_CATEGORIES.map(cat => {
                  const isSelected = newItem.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.formCatChip, isSelected && styles.formCatChipActive]}
                      onPress={() => setNewItem(prev => ({ ...prev, category: cat }))}
                    >
                      <Text style={[styles.formCatChipText, isSelected && styles.formCatChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Brief description, e.g. Served with green chutney and ketchup"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={newItem.description}
                onChangeText={txt => setNewItem(prev => ({ ...prev, description: txt }))}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, addingProduct && styles.submitButtonDisabled]}
                onPress={handleAddProduct}
                disabled={addingProduct}
                activeOpacity={0.8}
              >
                {addingProduct ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Add to Menu</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  addItemHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addItemHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // Stall Status Hero Card
  stallCard: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  stallCardOpen: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  stallCardClosed: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  stallCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stallStatusInfo: {
    flex: 1,
    marginRight: 10,
  },
  stallStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  stallStatusBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stallStatusDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  stallToggleContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  stallCardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
  },
  stallCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stallStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stallStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  // Category pills
  categoryScroll: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  // Product Card
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  productCardUnavailable: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  productLeft: {
    flex: 1,
    marginRight: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dietaryBadge: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dietaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B82F6',
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  productDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockControl: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyAddButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  dietarySelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dietaryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  dietaryOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formCategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formCatChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  formCatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  formCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
