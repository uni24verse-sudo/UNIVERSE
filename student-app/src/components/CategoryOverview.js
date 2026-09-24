import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { THEME } from '../constants/theme';
import apiClient from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_WIDTH = (SCREEN_WIDTH - 48) / 3;

const CategoryOverview = ({ categories = [], store, onCategorySelect, activeCategory = 'All' }) => {
  if (!categories || categories.length <= 1) return null;

  const validCategories = categories.filter(c => c !== 'All');

  const getCategoryImage = (name) => {
    // 1. Check explicit store categoryImages from SuperAdmin
    const explicit = store?.categoryImages?.find(c => c.categoryName === name)?.image;
    if (explicit) return explicit;

    // 2. Check first product in that category with an image
    const productWithImage = store?.products?.find(
      p => (p.category || 'Specialty').trim().toLowerCase() === name.trim().toLowerCase() && p.image
    );
    if (productWithImage?.image) return productWithImage.image;

    // 3. Fallback generic food image
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
  };

  const formatImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
    const base = apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
    return `${base}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {validCategories.map((cat) => {
          const isActive = activeCategory === cat;
          const imageUrl = formatImageUrl(getCategoryImage(cat));

          return (
            <TouchableOpacity
              key={cat}
              style={[styles.tile, isActive && styles.tileActive]}
              onPress={() => onCategorySelect(cat)}
              activeOpacity={0.82}
            >
              <View style={[styles.circleWrapper, isActive && styles.circleWrapperActive]}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.circleImage}
                  resizeMode="cover"
                />
              </View>
              <Text
                style={[styles.catName, isActive && styles.catNameActive]}
                numberOfLines={2}
              >
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  tile: {
    width: '33.333%',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  tileActive: {
    transform: [{ scale: 1.05 }],
  },
  circleWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 6,
  },
  circleWrapperActive: {
    borderColor: THEME.colors.primary,
    borderWidth: 3,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  catName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 14,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  catNameActive: {
    color: THEME.colors.primary,
    fontWeight: '900',
  },
});

export default React.memo(CategoryOverview);
