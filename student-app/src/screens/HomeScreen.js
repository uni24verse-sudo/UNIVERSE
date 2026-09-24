import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';
import HeaderNav from '../components/HeaderNav';
import MarqueePromo from '../components/MarqueePromo';
import HeroCarousel from '../components/HeroCarousel';
import TrendingRow from '../components/TrendingRow';
import LocationModal from '../components/LocationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exact 8 craving categories from webapp (frontend/src/pages/Home.jsx lines 499-506)
const CATEGORIES = [
  { id: 'All', name: 'All Cravings', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
  { id: 'Biryani', name: 'Biryani & Rice', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80' },
  { id: 'Pizza', name: 'Hand-tossed Pizzas', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80' },
  { id: 'Burger', name: 'Juicy Burgers', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80' },
  { id: 'Chinese', name: 'Asian Wok', img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80' },
  { id: 'Dessert', name: 'Sweet Delights', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80' },
  { id: 'Healthy', name: 'Healthy Eats', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80' },
  { id: 'Beverages', name: 'Cold Sips', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80' },
];

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation, hubType: contextHubType } = useLocation();
  const { socket, connected } = useSocket();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const locationId = currentLocation?._id || currentLocation?.id;
  const hubType = currentLocation?.type || contextHubType || 'College';

  // Reset filters when location or hub type changes
  useEffect(() => {
    setSelectedMarket('All');
    setSelectedCategory('All');
  }, [locationId, hubType]);

  const fetchStores = useCallback(async () => {
    if (!locationId) return;
    try {
      setFetchError(null);
      const res = await apiClient.get('/store/all/list', {
        params: { locationId }
      });
      setStores(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch stores:', err.message);
      setFetchError(err.message || 'Network connection issue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Live socket updates for store status (Open / Closed) matching webapp lines 180-188
  useEffect(() => {
    if (!socket || !connected) return;

    const handleStoreStatus = ({ storeId, isOpen }) => {
      setStores(prev => prev.map(s => 
        (String(s._id) === String(storeId) || String(s.id) === String(storeId)) ? { ...s, isOpen } : s
      ));
    };

    socket.on('store_status_update', handleStoreStatus);
    return () => socket.off('store_status_update', handleStoreStatus);
  }, [socket, connected]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  // Dynamic markets for College hubs matching webapp lines 191-203
  const availableMarkets = useMemo(() => {
    if (hubType !== 'College') return [];
    
    let configured = [];
    if (currentLocation?.markets && currentLocation.markets.trim()) {
      configured = currentLocation.markets.split(',').map(m => m.trim()).filter(Boolean);
    } else if ((currentLocation?.name || '').toLowerCase().includes('lpu') || (currentLocation?.name || '').toLowerCase().includes('lovely')) {
      configured = ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market'];
    }

    const liveStoreMarkets = stores.map(s => s.market).filter(Boolean);
    return ['All', ...Array.from(new Set([...configured, ...liveStoreMarkets]))];
  }, [currentLocation, stores, hubType]);

  // Filtered and sorted stores matching webapp lines 220-281
  const filteredStores = useMemo(() => {
    return stores
      .filter(store => {
        // Hub type filtering
        if (hubType === 'College') {
          if (selectedMarket !== 'All' && (store.market || 'BH1 Market') !== selectedMarket) return false;
        } else {
          if (selectedCategory !== 'All') {
            const cat = (store.category || '').toLowerCase();
            const sel = selectedCategory.toLowerCase();
            if (!cat.includes(sel) && !sel.includes(cat)) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // 1. Primary: Completed Orders Count (descending)
        const aOrders = a.completedOrdersCount || 0;
        const bOrders = b.completedOrdersCount || 0;
        if (bOrders !== aOrders) return bOrders - aOrders;

        // 2. Secondary: Cancelled Orders Count (ascending)
        const aCancelled = a.cancelledOrdersCount || 0;
        const bCancelled = b.cancelledOrdersCount || 0;
        if (aCancelled !== bCancelled) return aCancelled - bCancelled;

        // 3. Tertiary: Rating (descending)
        const aRating = a.rating || 5.0;
        const bRating = b.rating || 5.0;
        if (bRating !== aRating) return bRating - aRating;

        // 4. Quaternary: Open status (Open stores first)
        const aOpen = a.isOpen !== false;
        const bOpen = b.isOpen !== false;
        if (aOpen !== bOpen) return aOpen ? -1 : 1;

        return 0;
      });
  }, [stores, hubType, selectedMarket, selectedCategory]);

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
    const base = apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
    return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Marquee Promo Bar filling phone status bar cleanly */}
      <MarqueePromo topInset={insets.top} />

      {/* Top HeaderNav matching web Navbar */}
      <HeaderNav
        onOpenLocation={() => setLocationModalVisible(true)}
        onOpenSearch={() => navigation.navigate('Search')}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* Full-Bleed Edge-to-Edge Hero Promotions Carousel */}
        <HeroCarousel
          navigation={navigation}
          hubName={currentLocation?.name || 'Campus'}
          hubType={hubType}
          onExplore={() => navigation.navigate('Search')}
        />

        {/* ─── COLLEGE HUB LAYOUT: TrendingRow -> Campus Market Zones -> Stalls ─── */}
        {hubType === 'College' ? (
          <>
            {/* Dynamic Trending Row from Web */}
            <TrendingRow navigation={navigation} />

            {/* Campus Market Zones Filter (Only rendered if campus has multiple zones) */}
            {availableMarkets.length > 1 && (
              <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Campus Market Zones</Text>
                  <Text style={styles.sectionCounter}>{availableMarkets.length - 1} areas</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillsList}
                >
                  {availableMarkets.map((market) => {
                    const isSelected = selectedMarket === market;
                    const label = market === 'All' ? 'All Areas' : market.replace(' Market', '');

                    return (
                      <TouchableOpacity
                        key={market}
                        style={[styles.marketPill, isSelected && styles.activeMarketPill]}
                        onPress={() => setSelectedMarket(market)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <View style={styles.activeDot} />}
                        <Text style={[styles.marketPillText, isSelected && styles.activeMarketPillText]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          /* ─── EXTERNAL HUB LAYOUT: Category Cravings Horizontal Track -> TrendingRow -> Stalls ─── */
          <>
            {/* Category Cravings Horizontal Track matching webapp category-grid-premium */}
            <View style={styles.categoryTrackWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryTrack}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.premiumBentoCat, isSelected && styles.premiumBentoCatActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                      activeOpacity={0.88}
                    >
                      <Image source={{ uri: cat.img }} style={styles.bentoCatBg} resizeMode="cover" />
                      <LinearGradient
                        colors={isSelected 
                          ? ['rgba(239, 65, 35, 0.18)', 'rgba(239, 65, 35, 0.88)'] 
                          : ['rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.82)']}
                        style={styles.bentoCatScrim}
                      />
                      {isSelected && (
                        <View style={styles.catPulseBeacon}>
                          <View style={styles.catPulseDot} />
                        </View>
                      )}
                      <View style={styles.bentoCatContent}>
                        <Text style={[styles.bentoCatText, isSelected && styles.bentoCatTextActive]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Dynamic Trending Row for External Hubs (Below Categories, matching webapp line 524) */}
            <TrendingRow navigation={navigation} />
          </>
        )}

        {/* Stalls Section Header */}
        <View style={styles.stallsHeader}>
          <View>
            <Text style={styles.stallsHeading}>
              {hubType === 'College'
                ? (selectedMarket === 'All' ? 'Campus Stalls' : `${selectedMarket.replace(' Market', '')} Stalls`)
                : (selectedCategory === 'All' ? 'Featured Places' : `Best in ${selectedCategory}`)
              }
            </Text>
            <Text style={styles.sectionSubtitle}>
              {hubType === 'College'
                ? 'Discover unique tastes across the campus'
                : 'The finest ordering experience for the best locations'
              }
            </Text>
          </View>
        </View>

        {/* Stalls Cards List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>
              {hubType === 'College' ? 'Loading campus stalls...' : 'Loading food spots...'}
            </Text>
          </View>
        ) : fetchError && stores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyTitle}>Unable to Reach Server</Text>
            <Text style={styles.emptySubtitle}>Please check your internet connection or tap below to reconnect.</Text>
            <TouchableOpacity
              style={[styles.clearFilterBtn, { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary }]}
              onPress={() => {
                setLoading(true);
                fetchStores();
              }}
            >
              <Text style={[styles.clearFilterText, { color: '#FFFFFF', fontWeight: '800' }]}>Tap to Reconnect</Text>
            </TouchableOpacity>
          </View>
        ) : stores.length === 0 ? (
          /* Exact Empty State from webapp lines 543-569: "No Stalls Live at {location} Yet" */
          <View style={styles.noStallsLiveCard}>
            <View style={styles.storeIconCircle}>
              <Feather name="shopping-bag" size={32} color={THEME.colors.primary} />
            </View>
            <Text style={styles.noStallsTitle}>
              No Stalls Live at {currentLocation?.name || (hubType === 'College' ? 'this Campus' : 'this Location')} Yet
            </Text>
            <Text style={styles.noStallsDesc}>
              We are expanding rapidly! If you operate a food stall, tuck shop, or kitchen here, you can launch your digital storefront in minutes.
            </Text>
            <TouchableOpacity
              style={styles.launchStallBtn}
              onPress={() => {
                // Open vendor portal or contact in browser
                const base = apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
                Linking.openURL(`${base}/vendor/register`).catch(() => {});
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.launchStallBtnText}>Launch Your Stall Here</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : filteredStores.length === 0 ? (
          /* Filter Empty State matching webapp lines 571-576 */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No stalls found matching your filter</Text>
            <Text style={styles.emptySubtitle}>
              {hubType === 'College'
                ? 'Try choosing another campus market zone above.'
                : 'Try selecting another craving category above.'}
            </Text>
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => {
                setSelectedMarket('All');
                setSelectedCategory('All');
              }}
            >
              <Text style={styles.clearFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredStores.map((store) => {
            const isOpen = store.isOpen !== false;
            return (
              <TouchableOpacity
                key={store._id || store.id}
                style={[styles.storeCard, !isOpen && styles.closedStoreCard]}
                onPress={() => navigation.navigate('StoreMenu', { id: store._id || store.id, name: store.name })}
                activeOpacity={0.88}
              >
                {/* Stall Media Container */}
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: getImageUrl(store.image) }}
                    style={styles.storeImage}
                    resizeMode="cover"
                  />
                  <View style={styles.scrimOverlay} />

                  {/* Top Bar Badges */}
                  <View style={styles.cardTopBar}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.ratingText}>{store.rating || '4.5'}</Text>
                    </View>

                    {isOpen ? (
                      <View style={styles.openBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.openBadgeText}>OPEN NOW</Text>
                      </View>
                    ) : (
                      <View style={styles.closedBadge}>
                        <Feather name="lock" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                        <Text style={styles.closedBadgeText}>CLOSED</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom Market/Location Chip */}
                  <View style={styles.marketChip}>
                    <Ionicons name="location-sharp" size={10} color="#0F172A" />
                    <Text style={styles.marketChipText}>
                      {store.market || (hubType === 'College' ? 'Campus' : (currentLocation?.city || 'Local'))}
                    </Text>
                  </View>
                </View>

                {/* Stall Content Details */}
                <View style={styles.storeDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
                  </View>

                  <Text style={styles.storeCategory} numberOfLines={1}>
                    {store.category || (hubType === 'College' ? 'Specialty Campus Kitchen' : 'Quality Fast Food & Kitchen')}
                  </Text>

                  {/* Footer Stats & Action */}
                  <View style={styles.storeFooter}>
                    <View style={styles.statsRow}>
                      <View style={styles.statPill}>
                        <Feather name="shopping-bag" size={12} color={isOpen ? THEME.colors.primary : "#94A3B8"} />
                        <Text style={styles.statText}>
                          <Text style={{ fontWeight: '800' }}>{store.products?.length || 0}</Text> items
                        </Text>
                      </View>
                      <Text style={styles.statDot}>•</Text>
                      <View style={styles.statPill}>
                        <Feather name="clock" size={12} color={isOpen ? THEME.colors.textSecondary : "#94A3B8"} />
                        <Text style={styles.statText}>{isOpen ? '15m prep' : 'Offline'}</Text>
                      </View>
                    </View>

                    <View style={[styles.ctaButton, !isOpen && styles.ctaButtonClosed]}>
                      <Text style={[styles.ctaText, !isOpen && styles.ctaTextClosed]}>
                        {isOpen ? 'Order Now' : 'View Menu'}
                      </Text>
                      <Feather name="chevron-right" size={14} color={isOpen ? '#FFFFFF' : '#64748B'} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* UniVerse Branding at the end of scroll - Logo Only */}
        <View style={styles.brandFooter}>
          <Image
            source={require('../../assets/logo-full.png')}
            style={styles.brandLogoOnly}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Interactive Hub Selector Modal */}
      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 90,
    backgroundColor: '#F8FAFC',
  },
  sectionWrapper: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  pillsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  marketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 6,
  },
  activeMarketPill: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  marketPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  activeMarketPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Category Cravings Horizontal Track matching webapp category-grid-premium (Image 3) */
  categoryTrackWrapper: {
    marginTop: 10,
    marginBottom: 6,
  },
  categoryTrack: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  premiumBentoCat: {
    width: 140,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderWidth: 2.5,
    borderColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  premiumBentoCatActive: {
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  bentoCatBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bentoCatScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  catPulseBeacon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 65, 35, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  catPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  bentoCatContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    zIndex: 2,
  },
  bentoCatText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  bentoCatTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* Stalls Header */
  stallsHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  stallsHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },

  /* No Stalls Live Empty Card (Webapp parity) */
  noStallsLiveCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  storeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noStallsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  noStallsDesc: {
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: 20,
  },
  launchStallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  launchStallBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  clearFilterBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  closedStoreCard: {
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(226, 232, 240, 0.85)',
    opacity: 0.82,
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  cardTopBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.96)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4.5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  openBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  closedBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 0.4,
  },
  marketChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 100,
    gap: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  marketChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  storeDetails: {
    padding: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  storeCategory: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 10,
  },
  storeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  statDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 2,
  },
  ctaButtonClosed: {
    backgroundColor: '#F1F5F9',
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaTextClosed: {
    color: '#64748B',
  },

  /* Brand Footer Styling - Logo Only */
  brandFooter: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoOnly: {
    width: 130,
    height: 130,
    opacity: 0.9,
  },
});

export default HomeScreen;
