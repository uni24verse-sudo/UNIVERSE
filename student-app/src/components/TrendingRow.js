import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import apiClient from '../api/client';

const TrendingRow = ({ navigation }) => {
  const { currentLocation } = useLocation();
  const { addToCart } = useCart();
  const [trendingItems, setTrendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTrending = async () => {
      try {
        const locationId = currentLocation?._id || currentLocation?.id;
        const res = await apiClient.get('/store/trending', {
          params: { locationId },
        });
        if (isMounted) {
          setTrendingItems(res.data || []);
        }
      } catch (err) {
        console.warn('Failed to load trending items:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrending();
    return () => {
      isMounted = false;
    };
  }, [currentLocation]);

  const [imgErrors, setImgErrors] = useState({});

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
    const base = apiClient.defaults.baseURL?.replace('/api', '') || 'https://food.universeorder.co.in';
    return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={THEME.colors.primary} />
      </View>
    );
  }

  if (trendingItems.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Section Header matching Webapp */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.flameIconWrapper}>
            <Ionicons name="flame" size={17} color="#EF4444" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Trending Cravings</Text>
            <Text style={styles.sectionSubtitle}>Most ordered & loved picks near you right now ❤️</Text>
          </View>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {trendingItems.map((item, idx) => {
          const itemKey = item.productId || item._id || idx;
          const imgUrl = imgErrors[itemKey]
            ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
            : getImageUrl(item.image);
          const isStoreOpen = item.isOpen !== false;
          const isAvailable = isStoreOpen && item.isAvailable !== false;
          const storeNameWithMarket = `${item.storeName || 'Campus Kitchen'}${item.market ? ` • ${item.market.replace(' Market', '')}` : ''}`;

          return (
            <TouchableOpacity
              key={itemKey}
              style={[styles.card, !isAvailable && styles.cardUnavailable]}
              activeOpacity={0.88}
              onPress={() => {
                if (item.storeId) {
                  navigation?.navigate('StoreMenu', { id: item.storeId, name: item.storeName });
                }
              }}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.dishImage}
                  resizeMode="cover"
                  onError={() => {
                    setImgErrors(prev => ({ ...prev, [itemKey]: true }));
                  }}
                />
                {/* Ranking Badge #1, #2, #3 matching webapp gradient */}
                <LinearGradient
                  colors={['#EF4444', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rankingBadge}
                >
                  <Text style={styles.rankingBadgeText}>#{idx + 1}</Text>
                </LinearGradient>

                {/* Corner Status Badge on Image matching Webapp media-status-badge */}
                {!isStoreOpen ? (
                  <View style={styles.imageCornerBadgeClosed}>
                    <Text style={styles.imageCornerBadgeText}>CLOSED</Text>
                  </View>
                ) : !item.isAvailable ? (
                  <View style={styles.imageCornerBadgeSold}>
                    <Text style={styles.imageCornerBadgeText}>SOLD OUT</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.infoArea}>
                <Text style={styles.dishName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.storeName} numberOfLines={1}>
                  {storeNameWithMarket}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{item.price}</Text>

                  {!isStoreOpen ? (
                    <View style={styles.statusClosedBadge}>
                      <Text style={styles.statusClosedText}>CLOSED</Text>
                    </View>
                  ) : !item.isAvailable ? (
                    <View style={styles.statusUnavailableBadge}>
                      <Text style={styles.statusUnavailableText}>OUT OF STOCK</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      activeOpacity={0.75}
                      onPress={(e) => {
                        addToCart(
                          { _id: item.productId, name: item.name, price: item.price, image: item.image },
                          item.storeId,
                          item.storeName
                        );
                      }}
                    >
                      <Text style={styles.addBtnText}>ADD</Text>
                      <Feather name="plus" size={12} color={THEME.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: 12,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardUnavailable: {
    opacity: 0.88,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  rankingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 100,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  rankingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  imageCornerBadgeClosed: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 100,
    zIndex: 10,
  },
  imageCornerBadgeSold: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 100,
    zIndex: 10,
  },
  imageCornerBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoArea: {
    padding: 10,
    paddingTop: 8,
  },
  dishName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    gap: 3,
  },
  addBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  statusClosedBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusClosedText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  statusUnavailableBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusUnavailableText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
});

export default TrendingRow;
