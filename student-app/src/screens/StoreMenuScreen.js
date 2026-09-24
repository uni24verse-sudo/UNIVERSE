import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useLocation } from '../context/LocationContext';
import apiClient from '../api/client';
import ProductCard from '../components/ProductCard';
import VariantModal from '../components/VariantModal';
import DietaryBadge from '../components/DietaryBadge';
import CategoryOverview from '../components/CategoryOverview';
import { shareStall, shareDish } from '../utils/shareHelper';

const StoreMenuScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route.params || {};
  const { socket, connected } = useSocket();
  const { cart, addToCart, updateQuantity, getItemQuantity, storeId: currentCartStoreId } = useCart();
  const { currentLocation } = useLocation();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [showMenuSheet, setShowMenuSheet] = useState(false); // slide-up category drawer

  const isExternal = useMemo(() => {
    return (store?.locationId?.type === 'External') || 
           (store?.location?.type === 'External') || 
           (currentLocation?.type === 'External');
  }, [store, currentLocation]);

  const scrollViewRef = useRef(null);
  const searchInputRef = useRef(null);

  const fetchStore = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/store/${id}`);
      setStore(res.data);
    } catch (err) {
      console.warn('Failed to fetch store details:', err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Real-time socket sync for this store
  useEffect(() => {
    if (!socket || !connected || !id) return;

    const handleStoreStatus = ({ storeId, isOpen }) => {
      if (String(storeId) === String(id)) {
        setStore(prev => prev ? { ...prev, isOpen } : prev);
      }
    };

    const handleProductAvailability = ({ storeId, productId, isAvailable }) => {
      if (String(storeId) === String(id)) {
        setStore(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            products: (prev.products || []).map(p => 
              (String(p._id) === String(productId) || String(p.id) === String(productId))
                ? { ...p, isAvailable }
                : p
            )
          };
        });
      }
    };

    const handleStoreMenu = (data) => {
      const targetStoreId = data?.storeId || data?.store?._id || data?.store?.id;
      if (targetStoreId && String(targetStoreId) === String(id)) {
        if (data.store) {
          setStore(prev => prev ? { ...prev, ...data.store } : prev);
        } else if (Array.isArray(data.products)) {
          setStore(prev => prev ? { ...prev, products: data.products } : prev);
        }
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
  }, [socket, connected, id]);

  const handleShare = () => {
    if (!store) return;
    shareStall(store);
  };

  // SuperAdmin Dietary Settings Parity - Exactly mirroring webapp StoreMenu.jsx lines 464-482
  const effectiveDietaryMode = useMemo(() => {
    if (!store) return 'veg';
    const loc = store.location || store.locationId || currentLocation || {};
    const locName = (loc.name || currentLocation?.name || '').toLowerCase();
    
    // Explicit setting on location from SuperAdmin
    if (loc.dietaryType === 'veg') return 'veg';
    if (loc.dietaryType === 'non-veg') return 'non-veg';
    if (loc.dietaryType === 'both') return 'both';

    // Heuristics for Lovely Professional University
    if (locName.includes('lovely') || locName.includes('lpu')) {
      return 'veg';
    }

    // Check store products: if store has non-veg or egg items, allow 'both', otherwise 'veg'
    const hasNonVeg = (store.products || []).some(p => ['non-veg', 'egg'].includes(p.dietaryPreference));
    return hasNonVeg ? 'both' : 'veg';
  }, [store, currentLocation]);

  const showDietaryFilter = effectiveDietaryMode === 'both';

  // Extract base categories
  const categories = useMemo(() => {
    if (!store?.products) return ['All'];
    const set = new Set();
    let hasCombos = false;

    store.products.forEach(p => {
      if (p.isCombo || (p.category || '').toLowerCase().includes('combo')) {
        hasCombos = true;
      } else if (p.category) {
        set.add(p.category.trim());
      }
    });

    return ['All', ...(hasCombos ? ['Combos'] : []), ...Array.from(set)];
  }, [store]);

  // Dynamic visible categories: automatically hides categories with 0 matching dishes when filtered
  const visibleCategories = useMemo(() => {
    if (!store?.products) return ['All'];
    return categories.filter(cat => {
      if (cat === 'All') return true;
      return store.products.some(p => {
        let matchesDietary = true;
        if (dietaryFilter === 'veg') matchesDietary = p.dietaryPreference === 'veg';
        else if (dietaryFilter === 'non-veg') matchesDietary = ['non-veg', 'egg'].includes(p.dietaryPreference);
        if (!matchesDietary) return false;

        const isThisCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
        return cat === 'Combos' ? isThisCombo : (p.category || 'Specialty').trim().toLowerCase() === cat.toLowerCase();
      });
    });
  }, [store, categories, dietaryFilter]);

  // If currently active category is filtered out by dietary switch, gracefully reset to 'All'
  useEffect(() => {
    if (selectedCategory !== 'All' && !visibleCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [selectedCategory, visibleCategories]);

  // Dynamic Category item counts for the slide-up drawer based on dietary filter
  const categoryCounts = useMemo(() => {
    if (!store?.products) return { All: 0 };
    const matchingProducts = store.products.filter(p => {
      if (dietaryFilter === 'veg') return p.dietaryPreference === 'veg';
      if (dietaryFilter === 'non-veg') return ['non-veg', 'egg'].includes(p.dietaryPreference);
      return true;
    });

    const counts = { All: matchingProducts.length };
    let comboCount = 0;

    matchingProducts.forEach(p => {
      const isCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
      if (isCombo) comboCount++;
      const cat = p.category ? p.category.trim() : 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    if (comboCount > 0) {
      counts['Combos'] = comboCount;
    }
    return counts;
  }, [store, dietaryFilter]);

  // Filter products by search, category, and dietary preferences (Non-veg merges non-veg & egg matching webapp line 436)
  const filteredProducts = useMemo(() => {
    if (!store?.products) return [];

    return store.products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDiet = true;
      if (dietaryFilter === 'veg') {
        matchesDiet = p.dietaryPreference === 'veg';
      } else if (dietaryFilter === 'non-veg') {
        matchesDiet = ['non-veg', 'egg'].includes(p.dietaryPreference);
      }

      if (!matchesSearch || !matchesDiet) return false;
      if (selectedCategory === 'All') return true;

      const isCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
      if (selectedCategory === 'Combos') return isCombo;

      const pCat = (p.category || 'Specialty').trim();
      return pCat.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [store, searchQuery, selectedCategory, dietaryFilter]);

  const handleOpenVariantModal = (product) => {
    setSelectedProductForModal(product);
    setShowVariantModal(true);
  };

  const handleAddToCartWithVariant = (product, variant) => {
    addToCart(product, store._id || store.id, store.name, variant, store.locationId?._id || store.locationId);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading stall menu...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Feather name="alert-circle" size={40} color={THEME.colors.error} />
        <Text style={styles.errorTitle}>Stall not found</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backHomeText}>Return to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isStoreClosed = store.isOpen === false;
  const isCartFromThisStore = String(currentCartStoreId) === String(store._id || store.id);
  const cartItemCount = isCartFromThisStore ? cart.reduce((acc, it) => acc + (it.quantity || 0), 0) : 0;
  const cartSubtotal = isCartFromThisStore ? cart.reduce((acc, it) => acc + ((it.price || 0) * (it.quantity || 0)), 0) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Navbar matching Image 2 */}
      <View style={[styles.topNavbar, { paddingTop: Platform.OS === 'android' ? (insets.top > 0 ? insets.top : 8) : insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
          style={styles.navLogoWrapper}
        >
          <Image
            source={require('../../assets/logo-symbol.png')}
            style={styles.navLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.navLocationPill}>
          <View style={styles.navPinCircle}>
            <Ionicons name="location-sharp" size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.navLocationText} numberOfLines={1}>
            {store.location?.name || (isExternal ? 'LAW GATE' : 'Campus Hub')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navProfileBtn}
          onPress={() => navigation.navigate('RecentOrders')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area: Smooth unified scroll of banner, hero card, filters, and categories */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuScrollContent}
      >
        {/* Full-Width Edge-to-Edge Hero Banner with Bottom-Only Rounded Corners */}
        <View style={styles.bannerWrapper}>
          <Image
            source={{ uri: store.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerScrim} />

          {/* Back button on top-left of banner matching Image 2 */}
          <TouchableOpacity
            style={styles.bannerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Feather name="arrow-left" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Floating Glass Hero Card matching Image 2 */}
        <View style={styles.glassHeroCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.storeTitle} numberOfLines={1}>{store.name}</Text>
                <Ionicons name="checkmark-circle" size={18} color={THEME.colors.primary} />
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="location-sharp" size={12} color={THEME.colors.primary} />
                  <Text style={styles.metaChipText}>
                    {store.market || store.location?.name || (isExternal ? 'LAW GATE' : 'Campus Hub')}
                  </Text>
                </View>

                <Text style={styles.dotSeparator}>•</Text>

                <View style={styles.metaChip}>
                  <Feather name="clock" size={12} color={THEME.colors.textSecondary} />
                  <Text style={styles.metaChipText}>20-30 mins</Text>
                </View>
              </View>
            </View>

            {/* Rating badge if present */}
            {store.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{Number(store.rating).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {/* Action Row matching Image 2: Share button & Operating status */}
          <View style={styles.actionsMetaRow}>
            <TouchableOpacity
              style={styles.shareStallBtn}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={13} color={THEME.colors.primary} />
              <Text style={styles.shareStallBtnText}>Share</Text>
            </TouchableOpacity>

            <View style={[styles.statusPill, isStoreClosed ? styles.closedPill : styles.openPill]}>
              {isStoreClosed ? (
                <Feather name="clock" size={11} color="#EF4444" style={{ marginRight: 3 }} />
              ) : (
                <View style={styles.pulseLiveDot} />
              )}
              <Text style={[styles.statusPillText, isStoreClosed ? styles.closedPillText : styles.openPillText]}>
                {isStoreClosed ? 'CURRENTLY CLOSED' : 'LIVE & OPEN'}
              </Text>
            </View>
          </View>

          {store.packagingCharge > 0 && (
            <View style={styles.packagingNotice}>
              <Feather name="info" size={11} color={THEME.colors.textSecondary} />
              <Text style={styles.packagingText}>
                ₹{store.packagingCharge} packaging charge applies on takeaway orders
              </Text>
            </View>
          )}
        </View>

        {/* Filter and Category Navigation */}
        <View style={styles.filterSection}>
          {/* Dynamic Dietary Switcher - Unified Capsule Bar matching Image 2 */}
          {showDietaryFilter && (
            <View style={styles.dietaryCapsuleContainer}>
              <TouchableOpacity
                style={[styles.dietaryTab, dietaryFilter === 'all' && styles.dietaryTabActive]}
                onPress={() => setDietaryFilter('all')}
                activeOpacity={0.85}
              >
                <Text style={[styles.dietaryTabText, dietaryFilter === 'all' && styles.dietaryTabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dietaryTab, dietaryFilter === 'veg' && styles.dietaryTabActive]}
                onPress={() => setDietaryFilter('veg')}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.dietaryDot,
                    { backgroundColor: dietaryFilter === 'veg' ? '#FFFFFF' : '#10B981' }
                  ]}
                />
                <Text style={[styles.dietaryTabText, dietaryFilter === 'veg' && styles.dietaryTabTextActive]}>
                  Veg
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dietaryTab, dietaryFilter === 'non-veg' && styles.dietaryTabActive]}
                onPress={() => setDietaryFilter('non-veg')}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.dietaryDot,
                    { backgroundColor: dietaryFilter === 'non-veg' ? '#FFFFFF' : '#EF4444' }
                  ]}
                />
                <Text style={[styles.dietaryTabText, dietaryFilter === 'non-veg' && styles.dietaryTabTextActive]}>
                  Non-Veg
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Input in Store (Rendered for College hubs or when search is active in external hubs) */}
          {(!isExternal || selectedCategory !== 'All' || searchQuery) && (
            <View style={styles.searchBar}>
              <Feather name="search" size={15} color={THEME.colors.textSecondary} />
              <TextInput
                ref={searchInputRef}
                placeholder={`Search dishes in ${store.name}...`}
                placeholderTextColor={THEME.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={14} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Horizontal Category Jump Bar (Only for College hubs) */}
          {!isExternal && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, isSelected && styles.activeCatPill]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catPillText, isSelected && styles.activeCatPillText]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
        {/* EXTERNAL HUB MODE: Circular Category Grid when on 'All' (Image 4 Parity) */}
        {isExternal && selectedCategory === 'All' && !searchQuery ? (
          <CategoryOverview
            categories={visibleCategories}
            store={store}
            onCategorySelect={setSelectedCategory}
            activeCategory={selectedCategory}
          />
        ) : (
          <>
            {/* Back to Categories Button for External Hubs */}
            {isExternal && selectedCategory !== 'All' && (
              <View style={styles.backToCatWrapper}>
                <TouchableOpacity
                  style={styles.backToCatBtn}
                  onPress={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="arrow-left" size={15} color="#FFFFFF" />
                  <Text style={styles.backToCatText}>Back to Categories</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'All' ? 'All Dishes' : selectedCategory}
              </Text>
              <Text style={styles.itemCountText}>{filteredProducts.length} items</Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="coffee" size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No dishes found</Text>
                <Text style={styles.emptySubtitle}>Try changing your search or dietary filter</Text>
              </View>
            ) : viewMode === 'grid' ? (
              <View style={styles.gridRowWrap}>
                {filteredProducts.map((product) => {
                  const qty = getItemQuantity(product._id || product.id);

                  return (
                    <ProductCard
                      key={product._id || product.id}
                      product={product}
                      quantity={qty}
                      viewMode="grid"
                      storeClosed={isStoreClosed}
                      onIncrement={() => {
                        addToCart(
                          product,
                          store._id || store.id,
                          store.name,
                          null,
                          store.locationId?._id || store.locationId
                        );
                      }}
                      onDecrement={() => {
                        updateQuantity(product._id || product.id, -1);
                      }}
                      onVariantPress={handleOpenVariantModal}
                      onShare={(prod) => shareDish(prod, store)}
                    />
                  );
                })}
              </View>
            ) : (
              filteredProducts.map((product) => {
                const qty = getItemQuantity(product._id || product.id);

                return (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    quantity={qty}
                    viewMode="list"
                    storeClosed={isStoreClosed}
                    onIncrement={() => {
                      addToCart(
                        product,
                        store._id || store.id,
                        store.name,
                        null,
                        store.locationId?._id || store.locationId
                      );
                    }}
                    onDecrement={() => {
                      updateQuantity(product._id || product.id, -1);
                    }}
                    onVariantPress={handleOpenVariantModal}
                    onShare={(prod) => shareDish(prod, store)}
                  />
                );
              })
            )}
          </>
        )}

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Floating Precision-Machined Stall Controller Rail (Docked flush to extreme right - Campus Stalls Only) */}
      {!isExternal && (
        <View style={styles.stallControllerRail} pointerEvents="box-none">
          <View style={styles.controllerRailInner}>
            {/* 1. Search Action */}
            <TouchableOpacity
              style={[styles.railBtn, searchQuery ? styles.railBtnActive : null]}
              onPress={() => {
                if (searchQuery) {
                  setSearchQuery('');
                } else {
                  scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                  searchInputRef.current?.focus();
                }
              }}
              activeOpacity={0.8}
            >
              <Feather
                name={searchQuery ? 'x' : 'search'}
                size={16}
                color={searchQuery ? '#FFFFFF' : '#EF4123'}
              />
            </TouchableOpacity>

            <View style={styles.railDivider} />

            {/* 2. Menu Categories Drawer Action with badge */}
            <TouchableOpacity
              style={[
                styles.railBtn,
                styles.railBtnMenu,
                selectedCategory !== 'All' ? styles.railBtnActive : null,
              ]}
              onPress={() => setShowMenuSheet(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant"
                size={16}
                color={selectedCategory !== 'All' ? '#FFFFFF' : '#EF4123'}
              />
              <View style={styles.railBadge}>
                <Text style={styles.railBadgeText}>{visibleCategories.length}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.railDivider} />

            {/* 3. Layout Switcher (List ☰ / Grid ⊞) */}
            <TouchableOpacity
              style={styles.railBtn}
              onPress={() => setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))}
              activeOpacity={0.8}
            >
              <Feather
                name={viewMode === 'list' ? 'grid' : 'list'}
                size={16}
                color="#EF4123"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Slide-Up Browse Menu Category Drawer Modal */}
      <Modal
        visible={showMenuSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenuSheet(false)}
      >
        <TouchableOpacity
          style={styles.menuSheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenuSheet(false)}
        >
          <TouchableOpacity
            style={[styles.menuSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleBar} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="restaurant" size={20} color={THEME.colors.primary} />
                <Text style={styles.sheetHeaderTitle}>Browse Menu</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMenuSheet(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Categories List */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;

                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.sheetItem, isSelected && styles.sheetItemActive]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowMenuSheet(false);
                      scrollViewRef.current?.scrollTo({ y: 340, animated: true });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextActive]}>
                      {cat}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.sheetCountBadge, isSelected && styles.sheetCountBadgeActive]}>
                        <Text style={[styles.sheetCountText, isSelected && styles.sheetCountTextActive]}>
                          {count}
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={isSelected ? THEME.colors.primary : '#94A3B8'}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Variant Selection Modal */}
      <VariantModal
        visible={showVariantModal}
        product={selectedProductForModal}
        storeClosed={isStoreClosed}
        isUnavailable={selectedProductForModal?.isAvailable === false}
        onClose={() => setShowVariantModal(false)}
        onAddToCart={handleAddToCartWithVariant}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 12,
    marginBottom: 16,
  },
  backHomeBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    zIndex: 20,
  },
  navLogoWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLogo: {
    width: 30,
    height: 30,
  },
  navLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  navPinCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLocationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  navProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrapper: {
    width: '100%',
    height: 195,
    position: 'relative',
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  bannerBackBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  glassHeroCard: {
    marginTop: -28,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    zIndex: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  storeTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  storeCuisine: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 3,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  dotSeparator: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  actionsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  shareStallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 65, 35, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.25)',
    gap: 5,
  },
  shareStallBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  pulseLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  openPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  openPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  closedPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  closedPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  packagingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  packagingText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  filterSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  dietaryCapsuleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    width: '100%',
  },
  dietaryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  dietaryTabActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  dietaryTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  dietaryTabTextActive: {
    color: '#FFFFFF',
  },
  dietaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 14,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  activeCatPill: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  activeCatPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  menuScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  /* Precision-Machined Stall Controller Rail docked flush to extreme right */
  stallControllerRail: {
    position: 'absolute',
    right: 0,
    top: '46%',
    zIndex: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: 'rgba(239, 65, 35, 0.28)',
    shadowColor: '#EF4123',
    shadowOffset: { width: -4, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    paddingVertical: 8,
    paddingLeft: 5,
    paddingRight: 3,
  },
  controllerRailInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  railBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  railBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  railBtnMenu: {
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
  },
  railBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  railBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  railDivider: {
    width: 18,
    height: 1,
    backgroundColor: 'rgba(239, 65, 35, 0.2)',
    marginVertical: 1,
  },

  /* 2-Column Grid Layout */
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  /* Slide-Up Browse Menu Category Drawer Modal */
  menuSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 20,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  sheetItemActive: {
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.25)',
  },
  sheetItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  sheetItemTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  sheetCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  sheetCountBadgeActive: {
    backgroundColor: THEME.colors.primary,
  },
  sheetCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  sheetCountTextActive: {
    color: '#FFFFFF',
  },
  backToCatWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backToCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  backToCatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default StoreMenuScreen;
