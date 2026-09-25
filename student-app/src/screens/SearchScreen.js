import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';
import apiClient from '../api/client';

const POPULAR_TAGS = [
  'Burger',
  'Pizza',
  'Biryani',
  'Rolls',
  'Cold Coffee',
  'Pasta',
  'Sandwich',
  'Maggi',
  'Chaap',
  'Momos',
];

const SearchScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation } = useLocation();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ stores: [], dishes: [] });
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Stalls' | 'Dishes'
  const [loading, setLoading] = useState(false);

  const locationId = currentLocation?._id || currentLocation?.id;

  // Debounced Search calling backend /api/store/global/search?q={query}&locationId={id}
  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setSearchResults({ stores: [], dishes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/store/global/search', {
          params: { q: cleanQuery, locationId },
        });

        setSearchResults({
          stores: Array.isArray(res.data?.stores) ? res.data.stores : [],
          dishes: Array.isArray(res.data?.dishes) ? res.data.dishes : [],
        });
      } catch (err) {
        console.warn('Search query failed:', err.message);
        setSearchResults({ stores: [], dishes: [] });
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, locationId]);

  // Flattened list of matched dish items with stall info
  const flattenedDishes = useMemo(() => {
    const list = [];
    (searchResults.dishes || []).forEach((group) => {
      const storeId = group._id || group.id;
      const storeName = group.name || 'Campus Stall';
      const market = group.market || '';

      (group.matchedProducts || []).forEach((prod) => {
        list.push({
          _id: prod._id || prod.id,
          id: prod._id || prod.id,
          name: prod.name,
          price: prod.price,
          storeId,
          storeName,
          market,
        });
      });
    });
    return list;
  }, [searchResults.dishes]);

  const totalResultsCount = searchResults.stores.length + flattenedDishes.length;

  const handleStorePress = (storeId) => {
    navigation.navigate('StoreMenu', { id: storeId });
  };

  const handleDishPress = (storeId, dishName) => {
    navigation.navigate('StoreMenu', { id: storeId, dishName });
  };

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
    const base = apiClient.defaults.baseURL?.replace('/api', '') || 'https://food.universeorder.co.in';
    return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Top Header & Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Feather name="search" size={17} color={THEME.colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder='Search dishes, stalls, or cravings...'
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={styles.textInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Popular Suggestions when query is empty */}
      {!query.trim() && (
        <ScrollView style={styles.suggestionsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flame" size={16} color="#EF4123" />
              <Text style={styles.sectionTitle}>Popular Campus Searches</Text>
            </View>

            <View style={styles.tagsGrid}>
              {POPULAR_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => setQuery(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <Feather name="arrow-up-right" size={11} color="#EF4123" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Help Card */}
          <View style={styles.helpCard}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#EF4123" />
            <Text style={styles.helpTitle}>Hungry for something specific?</Text>
            <Text style={styles.helpSubtitle}>
              Type any dish or stall name. You will see instant live results from all live stalls in your campus.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Searching across live campus menus...</Text>
        </View>
      )}

      {/* Search Results Display */}
      {!loading && query.trim().length > 0 && (
        <View style={{ flex: 1 }}>
          {/* Result Filter Tabs: All, Stalls, Dishes */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'All' && styles.activeTabButton]}
              onPress={() => setActiveTab('All')}
            >
              <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>
                All ({totalResultsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'Dishes' && styles.activeTabButton]}
              onPress={() => setActiveTab('Dishes')}
            >
              <Text style={[styles.tabText, activeTab === 'Dishes' && styles.activeTabText]}>
                Dishes ({flattenedDishes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'Stalls' && styles.activeTabButton]}
              onPress={() => setActiveTab('Stalls')}
            >
              <Text style={[styles.tabText, activeTab === 'Stalls' && styles.activeTabText]}>
                Stalls ({searchResults.stores.length})
              </Text>
            </TouchableOpacity>
          </View>

          {totalResultsCount === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="chef-hat" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No results for "{query}"</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for broader keywords like "burger", "coffee", "rice", or "pizza".
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Section 1: Matching Stalls */}
              {(activeTab === 'All' || activeTab === 'Stalls') && searchResults.stores.length > 0 && (
                <View style={styles.resultGroup}>
                  <Text style={styles.groupHeaderTitle}>CAMPUS STALLS</Text>
                  {searchResults.stores.map((store) => (
                    <TouchableOpacity
                      key={store._id || store.id}
                      style={styles.storeCard}
                      onPress={() => handleStorePress(store._id || store.id)}
                      activeOpacity={0.88}
                    >
                      <Image
                        source={{ uri: getImageUrl(store.image) }}
                        style={styles.storeThumb}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.storeCardName}>{store.name}</Text>
                        <Text style={styles.storeCardSub}>
                          {store.category || 'Campus Food'} {store.market ? `• ${store.market}` : ''}
                        </Text>
                      </View>

                      {store.isOpen !== false ? (
                        <View style={styles.openPill}>
                          <Text style={styles.openPillText}>OPEN</Text>
                        </View>
                      ) : (
                        <View style={styles.closedPill}>
                          <Text style={styles.closedPillText}>CLOSED</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Section 2: Matching Dishes */}
              {(activeTab === 'All' || activeTab === 'Dishes') && flattenedDishes.length > 0 && (
                <View style={styles.resultGroup}>
                  <Text style={styles.groupHeaderTitle}>MATCHING DISHES</Text>
                  {flattenedDishes.map((dish, idx) => (
                    <TouchableOpacity
                      key={`${dish.id || dish._id}-${idx}`}
                      style={styles.dishCard}
                      onPress={() => handleDishPress(dish.storeId, dish.name)}
                      activeOpacity={0.88}
                    >
                      <View style={styles.dishIconBox}>
                        <Ionicons name="fast-food-outline" size={20} color={THEME.colors.primary} />
                      </View>

                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.dishName}>{dish.name}</Text>
                        <Text style={styles.dishStoreText}>
                          🏪 {dish.storeName} {dish.market ? `• ${dish.market.replace(' Market', '')}` : ''}
                        </Text>
                      </View>

                      <View style={styles.dishRightSide}>
                        <Text style={styles.dishPrice}>₹{dish.price}</Text>
                        <View style={styles.orderPill}>
                          <Text style={styles.orderPillText}>Order</Text>
                          <Feather name="arrow-right" size={11} color="#FFFFFF" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    padding: 0,
  },
  suggestionsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  helpCard: {
    backgroundColor: 'rgba(239, 65, 35, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.15)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  centerLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  activeTabButton: {
    backgroundColor: '#EF4123',
    borderColor: '#EF4123',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultsScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  resultGroup: {
    marginBottom: 20,
  },
  groupHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  storeThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  storeCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  storeCardSub: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  openPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  openPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#059669',
  },
  closedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#64748B',
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  dishIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dishName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  dishStoreText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dishRightSide: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  orderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4123',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 100,
  },
  orderPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SearchScreen;
