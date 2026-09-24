import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';

const LocationModal = ({ visible, onClose }) => {
  const { locations, currentLocation, selectLocation } = useLocation();
  const [activeType, setActiveType] = useState('College');
  const [search, setSearch] = useState('');

  const filteredLocations = (locations || []).filter(loc => {
    const matchesType = (loc.type || 'College') === activeType;
    if (!matchesType) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (loc.name || '').toLowerCase();
    const city = (loc.city || '').toLowerCase();
    return name.includes(q) || city.includes(q);
  });

  const handleSelect = (loc) => {
    selectLocation(loc);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Grab handle */}
          <View style={styles.dragHandle} />

          {/* Header matching LocationPortal.jsx */}
          <View style={styles.header}>
            <View style={styles.headerTitleArea}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={12} color={THEME.colors.primary} />
                <Text style={styles.badgeText}>NEW HUB EXPERIENCE</Text>
              </View>
              <Text style={styles.title}>Where are you?</Text>
              <Text style={styles.subtitle}>Select your location to discover stores near you.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={18} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Type Toggle matching Webapp */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeType === 'College' && styles.toggleBtnActive]}
              onPress={() => {
                setActiveType('College');
                setSearch('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="school"
                size={16}
                color={activeType === 'College' ? THEME.colors.primary : THEME.colors.textSecondary}
              />
              <Text style={[styles.toggleText, activeType === 'College' && styles.toggleTextActive]}>
                Universities
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeType === 'External' && styles.toggleBtnActive]}
              onPress={() => {
                setActiveType('External');
                setSearch('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business"
                size={16}
                color={activeType === 'External' ? THEME.colors.primary : THEME.colors.textSecondary}
              />
              <Text style={[styles.toggleText, activeType === 'External' && styles.toggleTextActive]}>
                External Areas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={THEME.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeType === 'College' ? 'universities' : 'areas'}...`}
              placeholderTextColor={THEME.colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x-circle" size={15} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Locations List */}
          <FlatList
            data={filteredLocations}
            keyExtractor={(item) => item._id || item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = (currentLocation?._id || currentLocation?.id) === (item._id || item.id);
              const isCollege = (item.type || 'College') === 'College';

              return (
                <TouchableOpacity
                  style={[styles.locationCard, isSelected && styles.locationCardSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pinCircle, isSelected && styles.pinCircleSelected]}>
                    <Ionicons
                      name={isCollege ? "school" : "location"}
                      size={18}
                      color={isSelected ? '#FFFFFF' : THEME.colors.primary}
                    />
                  </View>

                  <View style={styles.locationDetails}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.locationName, isSelected && styles.locationNameSelected]}>
                        {item.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.activeChip}>
                          <Text style={styles.activeChipText}>Active</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.locationCity}>
                      {item.city ? `${item.city}` : (isCollege ? 'Campus Dining Hub' : 'City Commercial Hub')}
                    </Text>
                  </View>

                  <Feather
                    name={isSelected ? 'check-circle' : 'chevron-right'}
                    size={18}
                    color={isSelected ? THEME.colors.primary : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={activeType === 'College' ? "school-outline" : "location-outline"}
                  size={38}
                  color="#CBD5E1"
                />
                <Text style={styles.emptyText}>
                  No {activeType === 'College' ? 'universities' : 'areas'} found matching "{search}"
                </Text>
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          <Text style={styles.footerNote}>
            By continuing, you agree to our Terms of Service.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    minHeight: 460,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitleArea: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 7,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  toggleTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: THEME.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  locationCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(239, 65, 35, 0.03)',
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCircleSelected: {
    backgroundColor: THEME.colors.primary,
  },
  locationDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  locationNameSelected: {
    color: THEME.colors.primary,
  },
  activeChip: {
    backgroundColor: 'rgba(239, 65, 35, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  locationCity: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  clearSearchBtn: {
    marginTop: 6,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: THEME.colors.textSecondary,
    paddingTop: 8,
  },
});

export default LocationModal;
