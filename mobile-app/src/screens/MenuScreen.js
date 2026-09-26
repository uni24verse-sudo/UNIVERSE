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
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUICK_CATEGORIES = ['All', 'Snacks', 'Beverages', 'Meals', 'Fast Food', 'Desserts', 'Other'];
const FORM_CATEGORIES = ['Snacks', 'Beverages', 'Meals', 'Fast Food', 'Desserts', 'Other'];

const detectDietaryPreference = (name) => {
  const nameLower = (name || '').toLowerCase();
  const nonVegKeywords = ['chicken', 'beef', 'meat', 'pork', 'fish', 'prawn', 'mutton', 'lamb', 'bacon', 'shrimp', 'crab', 'keema', 'kheema'];
  const eggKeywords = ['egg', 'omelette', 'bhurji'];
  if (nonVegKeywords.some(kw => nameLower.includes(kw))) return 'non-veg';
  if (eggKeywords.some(kw => nameLower.includes(kw))) return 'egg';
  return 'veg';
};

export default function MenuScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, stores, activeStore, switchActiveStore } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const isEmployee = user?.role === 'employee' || user?.role === 'staff';

  const [store, setStore] = useState(activeStore || null);
  const [showStallModal, setShowStallModal] = useState(false);
  const [loading, setLoading] = useState(!activeStore);
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

  // AI Menu Scan States
  const [showScanPickerModal, setShowScanPickerModal] = useState(false);
  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const [showScanReviewModal, setShowScanReviewModal] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [isImportingScanned, setIsImportingScanned] = useState(false);

  // Check if current stall location is pure veg
  const currentStore = activeStore || store;
  const isVegOnlyLocation = useMemo(() => {
    const loc = currentStore?.location;
    if (loc?.dietaryType === 'veg') return true;
    if (currentStore?.dietaryType === 'veg') return true;
    const locName = (loc?.name || '').toLowerCase();
    if (locName.includes('lpu') || locName.includes('lovely')) return true;
    return false;
  }, [currentStore]);

  // Tab bar hiding when any modal/sheet is open
  const isAnyModalOpen = Boolean(
    showAddModal ||
    showScanPickerModal ||
    isScanningMenu ||
    showScanReviewModal
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

  // Fetch Vendor Store Data
  const fetchStore = useCallback(async () => {
    try {
      const res = await apiClient.get('/store/my-stores');
      if (res.data && res.data.length > 0) {
        const found = activeStore ? res.data.find(s => (s.id || s._id) === (activeStore.id || activeStore._id)) : null;
        setStore(found || res.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
      Alert.alert('Error', 'Failed to load store menu. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      setStore(activeStore);
      setLoading(false);
    }
    fetchStore();
  }, [activeStore, fetchStore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStore();
  }, [fetchStore]);

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

    const handleAutoAcceptUpdate = ({ storeId: updatedStoreId, autoAcceptOrders }) => {
      if (updatedStoreId === storeId) {
        setStore(prev => prev ? { ...prev, autoAcceptOrders } : prev);
      }
    };

    const handleOffersUpdate = ({ storeId: updatedStoreId, offers }) => {
      if (updatedStoreId === storeId && Array.isArray(offers)) {
        setStore(prev => prev ? { ...prev, offers } : prev);
      }
    };

    socket.on('store_status_update', handleStoreStatus);
    socket.on('product_availability_update', handleProductAvailability);
    socket.on('store_menu_update', handleStoreMenu);
    socket.on('store_auto_accept_update', handleAutoAcceptUpdate);
    socket.on('store_offers_update', handleOffersUpdate);

    return () => {
      socket.off('store_status_update', handleStoreStatus);
      socket.off('product_availability_update', handleProductAvailability);
      socket.off('store_menu_update', handleStoreMenu);
      socket.off('store_auto_accept_update', handleAutoAcceptUpdate);
      socket.off('store_offers_update', handleOffersUpdate);
    };
  }, [socket, store?._id, store?.id]);

  const [togglingAutoAccept, setTogglingAutoAccept] = useState(false);

  const handleToggleAutoAccept = async () => {
    if (!store || togglingAutoAccept) return;
    const storeId = store._id || store.id;
    const nextStatus = !store.autoAcceptOrders;

    setTogglingAutoAccept(true);
    setStore(prev => ({ ...prev, autoAcceptOrders: nextStatus }));

    try {
      const res = await apiClient.put(`/store/${storeId}/toggle-auto-accept`);
      if (res.data?.autoAcceptOrders !== undefined) {
        setStore(prev => ({ ...prev, autoAcceptOrders: res.data.autoAcceptOrders }));
      }
    } catch (err) {
      console.error('Failed to toggle auto accept:', err);
      setStore(prev => ({ ...prev, autoAcceptOrders: !nextStatus }));
      Alert.alert('Error', err.response?.data?.message || 'Failed to update auto accept');
    } finally {
      setTogglingAutoAccept(false);
    }
  };

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

    if (isVegOnlyLocation && (newItem.dietaryPreference === 'non-veg' || (newItem.name && /(chicken|mutton|beef|pork|fish|prawn|meat)/i.test(newItem.name)))) {
      Alert.alert('Pure Veg Restriction', 'Non-veg items are strictly prohibited at this Pure Veg campus location.');
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

  // Handle Opening Camera or Gallery for Menu Scan
  const handlePickMenuImage = async (useCamera = false) => {
    setShowScanPickerModal(false);
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to photograph your menu.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to choose a menu photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || !result.assets[0]) return;

      const asset = result.assets[0];
      processMenuImage(asset.uri);
    } catch (err) {
      console.error('Pick menu image error:', err);
      Alert.alert('Error', 'Could not open camera or gallery.');
    }
  };

  // Upload Photo to AI Scanner
  const processMenuImage = async (imageUri) => {
    setIsScanningMenu(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'menu.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      formData.append('menuImage', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name: filename,
        type: fileType,
      });

      const res = await apiClient.post('/scan-menu/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!Array.isArray(res.data) || res.data.length === 0) {
        Alert.alert('No Items Detected', 'The AI could not clearly detect items and prices from this image. Please take a clear, well-lit photo of your menu.');
        return;
      }

      const formatted = res.data.map((item, idx) => ({
        tempId: String(idx) + '_' + Date.now(),
        name: String(item.name || '').trim(),
        price: String(item.price || '0'),
        category: String(item.category || 'General').trim(),
        dietaryPreference: detectDietaryPreference(item.name),
        selected: true,
      }));

      setScannedItems(formatted);
      setShowScanReviewModal(true);
    } catch (err) {
      console.error('Process menu image error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to scan menu image.';
      Alert.alert('Scan Failed', msg);
    } finally {
      setIsScanningMenu(false);
    }
  };

  // Import Selected Scanned Items into Store Menu
  const handleImportScannedItems = async () => {
    const selected = scannedItems.filter(i => i.selected && i.name.trim());
    if (selected.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to add to your menu.');
      return;
    }

    const invalidPrice = selected.find(i => isNaN(parseFloat(i.price)) || parseFloat(i.price) < 0);
    if (invalidPrice) {
      Alert.alert('Invalid Price', `Please check price for "${invalidPrice.name}".`);
      return;
    }

    setIsImportingScanned(true);
    const storeId = store._id || store.id;

    try {
      const payload = selected.map(i => ({
        name: i.name.trim(),
        price: parseFloat(i.price),
        category: i.category.trim() || 'General',
        dietaryPreference: i.dietaryPreference || 'veg',
      }));

      const res = await apiClient.post(`/store/${storeId}/products/batch`, {
        products: payload
      });

      if (res.data) {
        setStore(res.data);
      }

      setShowScanReviewModal(false);
      setScannedItems([]);
      Alert.alert('Menu Updated 🎉', `Successfully added ${payload.length} items to your stall! They are now immediately live for all students.`);
    } catch (err) {
      console.error('Import batch error:', err);
      Alert.alert('Import Failed', err.response?.data?.message || 'Failed to import items.');
    } finally {
      setIsImportingScanned(false);
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

          {/* Delete Button - Cart Owner Only */}
          {!isEmployee && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => confirmDeleteProduct(item)}
              disabled={isDeleting || isToggling}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={19} color="#94A3B8" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle}>Menu Items</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {store.name || 'Vendor Stall'} • {store.market || 'Campus Market'}
          </Text>
        </View>

        {!isEmployee ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              style={styles.scanHeaderBtn} 
              onPress={() => setShowScanPickerModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={14} color="#EF4123" />
              <Text style={styles.scanHeaderBtnText}>AI Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.addItemHeaderBtn} 
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6B00', '#EF4123']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addItemGradient}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={styles.addItemHeaderBtnText}>Add Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.employeeBadgeContainer}>
            <Ionicons name="shield-checkmark" size={13} color="#7E22CE" style={{ marginRight: 4 }} />
            <Text style={styles.employeeBadgeText}>STAFF MODE</Text>
          </View>
        )}
      </View>

      {/* Main Content Body */}
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
            {isEmployee ? (
              <View style={styles.staffNoticeBox}>
                <Ionicons name="shield-checkmark" size={16} color="#7E22CE" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.staffNoticeText}>
                  Staff Stock Mode: Toggle dish availability anytime. Dish creation, price edits, and removals are restricted to the Cart Owner.
                </Text>
              </View>
            ) : (
              <View style={styles.inventorySummaryCard}>
                <View style={styles.inventoryStatCol}>
                  <Text style={styles.inventoryStatNumber}>{(store.products || []).length}</Text>
                  <Text style={styles.inventoryStatLabel}>Total Dishes</Text>
                </View>
                <View style={styles.inventoryDivider} />
                <View style={styles.inventoryStatCol}>
                  <Text style={[styles.inventoryStatNumber, { color: '#059669' }]}>
                    {(store.products || []).filter(p => p.isAvailable !== false).length}
                  </Text>
                  <Text style={styles.inventoryStatLabel}>In Stock</Text>
                </View>
                <View style={styles.inventoryDivider} />
                <View style={styles.inventoryStatCol}>
                  <Text style={[styles.inventoryStatNumber, { color: '#DC2626' }]}>
                    {(store.products || []).filter(p => p.isAvailable === false).length}
                  </Text>
                  <Text style={styles.inventoryStatLabel}>Sold Out</Text>
                </View>
              </View>
            )}

            {/* Quick Offers & Deals Banner */}
            {!isEmployee && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 65, 35, 0.3)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2
                }}
                onPress={() => navigation.navigate('Offers')}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239, 65, 35, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="flash" size={18} color="#EF4123" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Store Offers & Deals</Text>
                      <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '900' }}>
                          {(store.offers || []).filter(o => o.isActive !== false).length} ACTIVE
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                      Run % discounts or flat ₹50 deals on drinks & chaap
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#EF4123', fontSize: 12, fontWeight: '800' }}>Manage</Text>
                  <Ionicons name="chevron-forward" size={15} color="#EF4123" />
                </View>
              </TouchableOpacity>
            )}

            {/* Quick Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search dish by name or category..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94A3B8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
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
              <Text style={styles.sectionSub}>Tap switch to toggle instant availability</Text>
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
      </View>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 }}>
                <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Dietary Preference</Text>
                {isVegOnlyLocation && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <Ionicons name="leaf" size={11} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>PURE VEG LOCATION</Text>
                  </View>
                )}
              </View>
              {isVegOnlyLocation && (
                <Text style={{ fontSize: 11, color: '#059669', marginBottom: 8, fontWeight: '500' }}>
                  🌿 This stall is at a pure veg campus location. Non-veg items are prohibited.
                </Text>
              )}
              <View style={styles.dietarySelectRow}>
                {(isVegOnlyLocation ? [
                  { key: 'veg', label: 'Pure Veg', color: '#10B981' },
                  { key: 'none', label: 'Drink / Other', color: '#64748B' }
                ] : [
                  { key: 'veg', label: 'Veg', color: '#10B981' },
                  { key: 'non-veg', label: 'Non-Veg', color: '#EF4444' },
                  { key: 'none', label: 'None / Other', color: '#64748B' }
                ]).map(opt => {
                  const isSelected = (isVegOnlyLocation && newItem.dietaryPreference === 'non-veg') 
                    ? opt.key === 'veg' 
                    : newItem.dietaryPreference === opt.key;
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

      {/* Scan Picker Modal (Camera vs Gallery) */}
      <Modal
        visible={showScanPickerModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowScanPickerModal(false)}
      >
        <TouchableOpacity 
          style={styles.pickerBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowScanPickerModal(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Scan Menu with AI</Text>
            <Text style={styles.pickerSubtitle}>
              Photograph your printed menu card or signboard. UniVerse AI will automatically extract all dishes and prices.
            </Text>

            <TouchableOpacity 
              style={styles.pickerOptionBtn} 
              onPress={() => handlePickMenuImage(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.pickerOptionIconWrap, { backgroundColor: 'rgba(239, 65, 35, 0.1)' }]}>
                <Ionicons name="camera" size={24} color="#EF4123" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.pickerOptionDesc}>Snap a clear picture of your menu card or wall board</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pickerOptionBtn} 
              onPress={() => handlePickMenuImage(false)}
              activeOpacity={0.8}
            >
              <View style={[styles.pickerOptionIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="images" size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.pickerOptionDesc}>Select an existing menu picture from your phone</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pickerCancelBtn} 
              onPress={() => setShowScanPickerModal(false)}
            >
              <Text style={styles.pickerCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Scanning Progress Overlay */}
      <Modal
        visible={isScanningMenu}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#EF4123" />
            <Text style={styles.loadingBoxTitle}>AI Menu Scanner</Text>
            <Text style={styles.loadingBoxSubtitle}>
              Reading your menu image... detecting all dish names, categories, and prices.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Scanned Items Review Modal */}
      <Modal
        visible={showScanReviewModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (!isImportingScanned) setShowScanReviewModal(false);
        }}
      >
        <View style={[styles.reviewContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#EF4123" />
                <Text style={styles.reviewTitle}>Scanned Dishes Review</Text>
              </View>
              <Text style={styles.reviewSubtitle}>
                {scannedItems.filter(i => i.selected).length} of {scannedItems.length} dishes selected
              </Text>
            </View>

            <TouchableOpacity
              style={styles.reviewSelectAllBtn}
              onPress={() => {
                const allSelected = scannedItems.every(i => i.selected);
                setScannedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
              }}
            >
              <Text style={styles.reviewSelectAllText}>
                {scannedItems.every(i => i.selected) ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reviewCloseBtn}
              onPress={() => setShowScanReviewModal(false)}
              disabled={isImportingScanned}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Scanned Items List */}
          <ScrollView contentContainerStyle={styles.reviewList} showsVerticalScrollIndicator={true}>
            {scannedItems.map((item, index) => (
              <View key={item.tempId || index} style={[styles.reviewCard, !item.selected && styles.reviewCardDimmed]}>
                <TouchableOpacity
                  style={styles.reviewCheckbox}
                  onPress={() => {
                    setScannedItems(prev => prev.map((it, idx) => idx === index ? { ...it, selected: !it.selected } : it));
                  }}
                >
                  <Ionicons 
                    name={item.selected ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={item.selected ? "#EF4123" : "#94A3B8"} 
                  />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  {/* Dish Name (Editable) */}
                  <TextInput
                    style={styles.reviewItemNameInput}
                    value={item.name}
                    onChangeText={text => {
                      setScannedItems(prev => prev.map((it, idx) => idx === index ? { ...it, name: text } : it));
                    }}
                    placeholder="Dish Name"
                    placeholderTextColor="#94A3B8"
                  />

                  {/* Category & Price Row */}
                  <View style={styles.reviewDetailsRow}>
                    <View style={styles.reviewCategoryInputWrap}>
                      <TextInput
                        style={styles.reviewCategoryInput}
                        value={item.category}
                        onChangeText={text => {
                          setScannedItems(prev => prev.map((it, idx) => idx === index ? { ...it, category: text } : it));
                        }}
                        placeholder="Category"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.reviewPriceInputWrap}>
                      <Text style={styles.reviewCurrencySymbol}>₹</Text>
                      <TextInput
                        style={styles.reviewPriceInput}
                        value={String(item.price)}
                        keyboardType="numeric"
                        onChangeText={text => {
                          setScannedItems(prev => prev.map((it, idx) => idx === index ? { ...it, price: text } : it));
                        }}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    {/* Veg / Non-Veg Toggle */}
                    <TouchableOpacity
                      style={[
                        styles.reviewDietaryBadge,
                        { borderColor: item.dietaryPreference === 'non-veg' ? '#EF4444' : item.dietaryPreference === 'egg' ? '#F59E0B' : '#10B981' }
                      ]}
                      onPress={() => {
                        const next = isVegOnlyLocation
                          ? (item.dietaryPreference === 'veg' ? 'egg' : 'veg')
                          : (item.dietaryPreference === 'veg' ? 'non-veg' : item.dietaryPreference === 'non-veg' ? 'egg' : 'veg');
                        setScannedItems(prev => prev.map((it, idx) => idx === index ? { ...it, dietaryPreference: next } : it));
                      }}
                    >
                      <View 
                        style={[
                          styles.reviewDietaryDot,
                          { backgroundColor: item.dietaryPreference === 'non-veg' ? '#EF4444' : item.dietaryPreference === 'egg' ? '#F59E0B' : '#10B981' }
                        ]} 
                      />
                      <Text style={[styles.reviewDietaryText, { color: item.dietaryPreference === 'non-veg' ? '#EF4444' : item.dietaryPreference === 'egg' ? '#F59E0B' : '#10B981' }]}>
                        {item.dietaryPreference === 'non-veg' ? 'Non-Veg' : item.dietaryPreference === 'egg' ? 'Egg' : 'Veg'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Delete Item */}
                <TouchableOpacity
                  style={styles.reviewDeleteBtn}
                  onPress={() => {
                    setScannedItems(prev => prev.filter((_, idx) => idx !== index));
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={styles.reviewFooter}>
            <TouchableOpacity
              style={styles.reviewCancelBtn}
              onPress={() => setShowScanReviewModal(false)}
              disabled={isImportingScanned}
            >
              <Text style={styles.reviewCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reviewImportBtn, isImportingScanned && styles.reviewImportBtnDisabled]}
              onPress={handleImportScannedItems}
              disabled={isImportingScanned || scannedItems.filter(i => i.selected).length === 0}
            >
              {isImportingScanned ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.reviewImportBtnText}>
                    Import {scannedItems.filter(i => i.selected).length} Dishes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    gap: 5,
  },
  scanHeaderBtnText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 13,
  },
  addItemHeaderBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addItemHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  employeeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  employeeBadgeText: {
    color: '#7E22CE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  staffNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  staffNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#6B21A8',
    fontWeight: '600',
    lineHeight: 17,
  },
  inventorySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inventoryStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  inventoryStatNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  inventoryStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inventoryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
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
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
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
    color: '#EF4123',
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
    backgroundColor: '#EF4123',
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
    margin: 0,
    padding: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    margin: 0,
    width: '100%',
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
    backgroundColor: '#EF4123',
    borderColor: '#EF4123',
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
    backgroundColor: '#EF4123',
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
  // AI Menu Scan Styles
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  scanHeaderBtnText: {
    color: '#EF4123',
    fontWeight: '800',
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scanMenuBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4123',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  scanMenuBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  addItemSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4123',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 5,
  },
  addItemSecondaryBtnText: {
    color: '#EF4123',
    fontWeight: '800',
    fontSize: 14,
  },
  // Picker Modal
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  pickerOptionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  pickerCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  // Loading Overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingBoxTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
  },
  loadingBoxSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Review Modal
  reviewContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reviewSelectAllBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reviewSelectAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4123',
  },
  reviewCloseBtn: {
    padding: 4,
  },
  reviewList: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewCardDimmed: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
  },
  reviewCheckbox: {
    paddingTop: 4,
  },
  reviewItemNameInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 8,
  },
  reviewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewCategoryInputWrap: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCategoryInput: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    padding: 2,
  },
  reviewPriceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reviewCurrencySymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4123',
    marginRight: 2,
  },
  reviewPriceInput: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4123',
    padding: 2,
    minWidth: 40,
  },
  reviewDietaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  reviewDietaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reviewDietaryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  reviewDeleteBtn: {
    padding: 6,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  reviewCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reviewCancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 15,
  },
  reviewImportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4123',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewImportBtnDisabled: {
    opacity: 0.6,
  },
  reviewImportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
