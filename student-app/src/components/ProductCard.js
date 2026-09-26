import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import DietaryBadge from './DietaryBadge';
import QuantitySelector from './QuantitySelector';
import apiClient from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getDishImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
  const cleanPath = img.startsWith('/') ? img : `/${img}`;
  const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || 'https://food.universeorder.co.in';
  return `${baseUrl}${cleanPath}`;
};

const ProductCard = ({
  product,
  quantity = 0,
  onIncrement,
  onDecrement,
  onVariantPress,
  onShare,
  storeClosed = false,
  viewMode = 'list',
  activeOffers = [],
}) => {
  const [imageError, setImageError] = useState(false);
  const hasVariants = product.variants && product.variants.length > 0;
  const minPrice = hasVariants ? Math.min(...product.variants.map(v => v.price)) : product.price;
  const isUnavailable = product.isAvailable === false;
  const imageUrl = getDishImageUrl(product.image);

  const productCategory = (product.category || '').toLowerCase().trim();
  const productId = String(product._id || product.id || '');

  const applicableOffer = React.useMemo(() => {
    if (!Array.isArray(activeOffers) || activeOffers.length === 0) return null;
    for (const offer of activeOffers) {
      if (!offer || offer.isActive === false) continue;
      const targetCats = Array.isArray(offer.targetCategories) ? offer.targetCategories.map(c => c.toLowerCase().trim()) : [];
      const targetProductIds = Array.isArray(offer.targetProductIds) ? offer.targetProductIds.map(p => String(p).trim()) : [];

      if (offer.discountType === 'FLAT_PRICE_CATEGORY' && targetCats.includes(productCategory)) {
        const flatPrice = Number(offer.discountValue);
        if (minPrice > flatPrice) {
          return {
            type: 'FLAT_PRICE',
            discountedPrice: flatPrice,
            badge: offer.badgeText || `AT ₹${flatPrice}`
          };
        }
      } else if (offer.discountType === 'FLAT_PRICE_ITEMS' && targetProductIds.includes(productId)) {
        const flatPrice = Number(offer.discountValue);
        if (minPrice > flatPrice) {
          return {
            type: 'FLAT_PRICE',
            discountedPrice: flatPrice,
            badge: offer.badgeText || `AT ₹${flatPrice}`
          };
        }
      } else if (offer.discountType === 'PERCENTAGE_CATEGORY' && targetCats.includes(productCategory)) {
        const pct = Number(offer.discountValue);
        const discounted = Math.round(minPrice * (1 - pct / 100));
        return {
          type: 'PERCENTAGE',
          discountedPrice: discounted,
          badge: offer.badgeText || `${pct}% OFF`
        };
      }
    }
    return null;
  }, [activeOffers, productCategory, productId, minPrice]);

  const handleAdd = () => {
    if (storeClosed || isUnavailable) return;
    if (hasVariants && onVariantPress) {
      onVariantPress(product);
    } else if (onIncrement) {
      onIncrement();
    }
  };

  // ----------------------------------------------------
  // 1. GRID VIEW (Modern 2-Column Compact Card)
  // ----------------------------------------------------
  if (viewMode === 'grid') {
    return (
      <View style={[styles.gridCard, (isUnavailable || storeClosed) && styles.disabledCard]}>
        <View style={styles.gridImageWrapper}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.gridImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.gridPlaceholderImage}>
              <Text style={styles.placeholderEmoji}>🍲</Text>
            </View>
          )}

          {/* Dietary Badge */}
          <View style={styles.gridDietaryBadge}>
            <DietaryBadge type={product.dietaryPreference || 'veg'} size={13} />
          </View>

          {/* Corner Status Badge matching Webapp media-status-badge */}
          {isUnavailable ? (
            <View style={[styles.mediaStatusBadge, styles.mediaStatusSold]}>
              <Text style={styles.mediaStatusText}>SOLD OUT</Text>
            </View>
          ) : storeClosed ? (
            <View style={[styles.mediaStatusBadge, styles.mediaStatusClosed]}>
              <Text style={styles.mediaStatusText}>CLOSED</Text>
            </View>
          ) : null}

          {/* Quantity Selector Floating on Image Bottom - only if open and available */}
          {!storeClosed && !isUnavailable && (
            <View style={styles.gridSelectorWrapper}>
              <QuantitySelector
                quantity={quantity}
                onIncrement={handleAdd}
                onDecrement={onDecrement}
                customizable={hasVariants}
              />
            </View>
          )}
        </View>

        {/* Info Content */}
        <View style={styles.gridContent}>
          <View style={styles.gridMetaRow}>
            <Text style={styles.gridCategoryText} numberOfLines={1}>
              {product.isCombo ? 'COMBO' : (product.category || 'Specialty')}
            </Text>
            {onShare && (
              <TouchableOpacity
                onPress={() => onShare(product)}
                style={styles.shareDishBtnSmall}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={11} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.gridName} numberOfLines={1}>
            {product.name}
          </Text>

          {applicableOffer ? (
            <View style={styles.gridPriceRow}>
              <Text style={styles.gridDealPrice}>₹{applicableOffer.discountedPrice}</Text>
              <Text style={styles.gridOriginalPrice}>₹{minPrice}</Text>
              <View style={styles.dealBadge}>
                <Text style={styles.dealBadgeText}>{applicableOffer.badge}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.gridPrice}>
              {hasVariants ? `From ₹${minPrice}` : `₹${product.price}`}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ----------------------------------------------------
  // 2. LIST VIEW (Classic Full-Width Row)
  // ----------------------------------------------------
  return (
    <View style={[styles.card, (isUnavailable || storeClosed) && styles.disabledCard]}>
      {/* Dish Information (Left) */}
      <View style={styles.infoContainer}>
        <View style={styles.badgeRow}>
          <View style={styles.badgeLeftGroup}>
            <DietaryBadge type={product.dietaryPreference || 'veg'} size={15} />
            {hasVariants && (
              <View style={styles.customTag}>
                <Text style={styles.customTagText}>Customizable</Text>
              </View>
            )}
            {product.isCombo && (
              <View style={styles.comboTag}>
                <Text style={styles.comboTagText}>Combo Deal</Text>
              </View>
            )}
          </View>

          {/* Dish Share Button */}
          {onShare && (
            <TouchableOpacity
              onPress={() => onShare(product)}
              style={styles.shareDishBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={13} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        
        {applicableOffer ? (
          <View style={styles.listPriceRow}>
            <Text style={styles.dealPrice}>₹{applicableOffer.discountedPrice}</Text>
            <Text style={styles.originalPrice}>₹{minPrice}</Text>
            <View style={styles.dealBadge}>
              <Text style={styles.dealBadgeText}>{applicableOffer.badge}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.price}>
            {hasVariants ? `From ₹${minPrice}` : `₹${product.price}`}
          </Text>
        )}

        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {isUnavailable ? (
          <Text style={styles.outOfStockText}>Currently Out of Stock</Text>
        ) : storeClosed ? (
          <Text style={styles.closedSubText}>Stall Currently Closed</Text>
        ) : null}
      </View>

      {/* Dish Image + Add Action (Right) */}
      <View style={styles.actionContainer}>
        <View style={styles.imageFrame}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderEmoji}>🍲</Text>
            </View>
          )}

          {/* Corner Status Badge matching Webapp media-status-badge */}
          {isUnavailable ? (
            <View style={[styles.mediaStatusBadge, styles.mediaStatusSold]}>
              <Text style={styles.mediaStatusText}>SOLD OUT</Text>
            </View>
          ) : storeClosed ? (
            <View style={[styles.mediaStatusBadge, styles.mediaStatusClosed]}>
              <Text style={styles.mediaStatusText}>CLOSED</Text>
            </View>
          ) : null}
        </View>

        {/* Action Button: ONLY rendered when stall is open and dish is in stock */}
        {!storeClosed && !isUnavailable && (
          <View style={styles.selectorWrapper}>
            <QuantitySelector
              quantity={quantity}
              onIncrement={handleAdd}
              onDecrement={onDecrement}
              customizable={hasVariants}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  disabledCard: {
    opacity: 0.65,
  },
  infoContainer: {
    flex: 1,
    paddingRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shareDishBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  customTag: {
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customTagText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  comboTag: {
    backgroundColor: THEME.colors.secondarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comboTagText: {
    color: THEME.colors.secondary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 21,
  },
  price: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.error,
    marginTop: 4,
  },
  closedSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  actionContainer: {
    width: 104,
    alignItems: 'center',
  },
  imageFrame: {
    width: 104,
    height: 96,
    borderRadius: THEME.borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  mediaStatusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaStatusSold: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
  },
  mediaStatusClosed: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  mediaStatusText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  selectorWrapper: {
    marginTop: -16,
    alignSelf: 'center',
  },

  /* 2-Column Grid Card Styles matching Webapp */
  gridCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  gridImageWrapper: {
    width: '100%',
    height: 125,
    position: 'relative',
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDietaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  gridSelectorWrapper: {
    position: 'absolute',
    bottom: -14,
    left: '50%',
    transform: [{ translateX: -48 }],
    zIndex: 12,
  },
  gridContent: {
    padding: 10,
    paddingTop: 16,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  gridCategoryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  shareDishBtnSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  gridName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  gridDealPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  gridOriginalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  dealPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  dealBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  dealBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
  },
});

export default ProductCard;
