import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';

const HeaderNav = ({ onOpenLocation, onOpenSearch, activeOrdersCount = 0, navigation }) => {
  const { currentLocation } = useLocation();

  const campusTitle = currentLocation?.name || 'Select Hub';

  return (
    <View style={styles.headerContainer}>
      {/* Brand Logo Symbol */}
      <TouchableOpacity
        onPress={() => navigation?.navigate('Home')}
        activeOpacity={0.8}
        style={styles.logoWrapper}
      >
        <Image
          source={require('../../assets/logo-symbol.png')}
          style={styles.logoSymbol}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Location Pill */}
      <TouchableOpacity
        style={styles.locationPill}
        onPress={onOpenLocation}
        activeOpacity={0.7}
      >
        <View style={styles.pinCircle}>
          <Ionicons name="location-sharp" size={10} color="#FFFFFF" />
        </View>
        <Text style={styles.locationText} numberOfLines={1}>
          {campusTitle}
        </Text>
        <Feather name="chevron-down" size={13} color={THEME.colors.textSecondary} />
      </TouchableOpacity>

      {/* Integrated Search Input Pill */}
      <TouchableOpacity
        style={styles.searchPill}
        onPress={onOpenSearch || (() => navigation?.navigate('Search'))}
        activeOpacity={0.75}
      >
        <Feather name="search" size={14} color="#94A3B8" />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          Search "burger", "st...
        </Text>
      </TouchableOpacity>

      {/* Profile / Account Circle Button */}
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => navigation?.navigate('RecentOrders')}
        activeOpacity={0.7}
      >
        <Feather name="user" size={17} color={THEME.colors.textPrimary} />
        {activeOrdersCount > 0 && <View style={styles.activeOrderDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
    zIndex: 10,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    width: 32,
    height: 32,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 130,
    gap: 5,
  },
  pinCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchPlaceholder: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    flexShrink: 1,
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeOrderDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default HeaderNav;
