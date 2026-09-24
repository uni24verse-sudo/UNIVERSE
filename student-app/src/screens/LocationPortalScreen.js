import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';

const LocationPortalScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { locations, loading, selectLocation } = useLocation();
  const [activeType, setActiveType] = useState('College');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = (locations || []).filter(loc =>
    (loc.type || 'College') === activeType &&
    (loc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
    !loc.isHidden
  );

  const handleSelect = async (loc) => {
    await selectLocation(loc);
    navigation.replace('Home');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.sparkleBadge}>
          <Feather name="zap" size={13} color={THEME.colors.primary} />
          <Text style={styles.sparkleText}>CAMPUS DINING EXPERIENCE</Text>
        </View>

        <Text style={styles.mainTitle}>Select Your Campus</Text>
        <Text style={styles.subtitle}>
          Choose your university or residential campus to discover exclusive stall menus & pre-order perks.
        </Text>

        {/* Campus Type Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeType === 'College' && styles.activeToggleBtn]}
            onPress={() => setActiveType('College')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="school-outline"
              size={16}
              color={activeType === 'College' ? '#FFFFFF' : THEME.colors.textSecondary}
            />
            <Text style={[styles.toggleText, activeType === 'College' && styles.activeToggleText]}>
              Universities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeType === 'External' && styles.activeToggleBtn]}
            onPress={() => setActiveType('External')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business-outline"
              size={16}
              color={activeType === 'External' ? '#FFFFFF' : THEME.colors.textSecondary}
            />
            <Text style={[styles.toggleText, activeType === 'External' && styles.activeToggleText]}>
              City Hubs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            placeholder="Search campus or location..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Location Cards List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Fetching available campuses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>No locations found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another university or hub.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.locationCard}
              onPress={() => handleSelect(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconBox}>
                <Ionicons name="school" size={24} color={THEME.colors.primary} />
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.locationCity}>
                  {item.city ? `${item.city} • ` : ''}{item.type || 'College Campus'}
                </Text>

                {item.markets ? (
                  <View style={styles.marketsBadge}>
                    <Text style={styles.marketsText} numberOfLines={1}>
                      {item.markets.split(',').length} Market Zones Active
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.arrowBox}>
                <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  sparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primarySoft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  sparkleText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    gap: 6,
  },
  activeToggleBtn: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.card,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  activeToggleText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  marketsBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketsText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  arrowBox: {
    paddingLeft: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  }
});

export default LocationPortalScreen;
