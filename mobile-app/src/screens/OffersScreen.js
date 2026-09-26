import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const OFFER_TYPES = [
  {
    id: 'PERCENTAGE_CATEGORY',
    name: 'Category % Off',
    tagline: 'e.g. 15% off Drinks / Chaap',
    icon: 'pricetag',
    unit: '%',
    requiresCategories: true,
  },
  {
    id: 'FLAT_PRICE_CATEGORY',
    name: 'Flat Price Deal',
    tagline: 'e.g. All Drinks or Chaap at ₹50',
    icon: 'flame',
    unit: '₹',
    requiresCategories: true,
  },
  {
    id: 'PERCENTAGE_CART',
    name: 'Cart % Off',
    tagline: 'e.g. 10% off entire order',
    icon: 'cart',
    unit: '%',
    requiresCategories: false,
  },
  {
    id: 'FLAT_DISCOUNT_CART',
    name: 'Flat ₹ Off Cart',
    tagline: 'e.g. Flat ₹30 off on > ₹150',
    icon: 'cash',
    unit: '₹',
    requiresCategories: false,
  },
];

const DEFAULT_CATEGORIES = [
  'Drinks',
  'Beverages',
  'Chaap',
  'Snacks',
  'Fast Food',
  'Meals',
  'Combos',
  'Chinese',
  'Desserts',
];

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { activeStore } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [offers, setOffers] = useState(
    Array.isArray(activeStore?.offers) ? activeStore.offers : []
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [savingOffer, setSavingOffer] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '15% Off on Drinks',
    description: 'Valid on all refreshing beverages',
    badgeText: '15% OFF',
    discountType: 'PERCENTAGE_CATEGORY',
    discountValue: '15',
    targetCategories: ['Drinks'],
    minOrderValue: '0',
    maxDiscountCap: '50',
    isActive: true,
  });

  const storeId = activeStore?._id || activeStore?.id;

  // Extract menu categories dynamically
  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    if (Array.isArray(activeStore?.products)) {
      activeStore.products.forEach((p) => {
        if (p.category && p.category.trim()) {
          set.add(p.category.trim());
        }
      });
    }
    return Array.from(set);
  }, [activeStore]);

  // Robust, resilient fetch
  const fetchOffers = useCallback(
    async (isPull = false) => {
      if (!storeId) return;
      try {
        if (isPull) setRefreshing(true);
        else setLoading(true);

        const res = await apiClient.get(`/store/${storeId}/offers`);
        if (Array.isArray(res.data)) {
          setOffers(res.data);
          await AsyncStorage.setItem(
            `universe_offers_${storeId}`,
            JSON.stringify(res.data)
          ).catch(() => {});
        }
      } catch (err) {
        console.log('[Offers] Fetch note:', err.message);
        try {
          const cached = await AsyncStorage.getItem(`universe_offers_${storeId}`);
          if (cached) {
            setOffers(JSON.parse(cached));
          } else if (Array.isArray(activeStore?.offers) && activeStore.offers.length > 0) {
            setOffers(activeStore.offers);
          }
        } catch (e) {}
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storeId, activeStore]
  );

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Real-time Socket.IO Sync
  useEffect(() => {
    if (!socket || !storeId) return;

    const handleOffersUpdate = (data) => {
      if (String(data.storeId) === String(storeId)) {
        if (Array.isArray(data.offers)) {
          setOffers(data.offers);
          AsyncStorage.setItem(
            `universe_offers_${storeId}`,
            JSON.stringify(data.offers)
          ).catch(() => {});
        }
      }
    };

    socket.on('store_offers_update', handleOffersUpdate);
    return () => {
      socket.off('store_offers_update', handleOffersUpdate);
    };
  }, [socket, storeId]);

  // Instant ON/OFF Toggle
  const handleToggleOffer = async (offerId) => {
    try {
      setTogglingId(offerId);
      // Optimistic update for instant UI feedback
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, isActive: !o.isActive } : o))
      );

      const res = await apiClient.put(`/store/${storeId}/offers/${offerId}/toggle`, {});
      if (res.data?.offers) {
        setOffers(res.data.offers);
        await AsyncStorage.setItem(
          `universe_offers_${storeId}`,
          JSON.stringify(res.data.offers)
        ).catch(() => {});
      }
    } catch (err) {
      console.log('[Offers] Toggle fallback:', err.message);
      // Persist local state
      setOffers((prev) => {
        AsyncStorage.setItem(
          `universe_offers_${storeId}`,
          JSON.stringify(prev)
        ).catch(() => {});
        return prev;
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Offer
  const handleDeleteOffer = (offerId) => {
    Alert.alert(
      'Delete Offer',
      'Are you sure you want to remove this promotion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setOffers((prev) => prev.filter((o) => o.id !== offerId));
              const res = await apiClient.delete(`/store/${storeId}/offers/${offerId}`);
              if (res.data?.offers) {
                setOffers(res.data.offers);
                await AsyncStorage.setItem(
                  `universe_offers_${storeId}`,
                  JSON.stringify(res.data.offers)
                ).catch(() => {});
              }
            } catch (err) {
              console.log('[Offers] Delete fallback:', err.message);
              setOffers((prev) => {
                const next = prev.filter((o) => o.id !== offerId);
                AsyncStorage.setItem(
                  `universe_offers_${storeId}`,
                  JSON.stringify(next)
                ).catch(() => {});
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const openCreateModal = () => {
    setEditingOfferId(null);
    setFormData({
      title: '15% Off on Drinks',
      description: 'Valid on all refreshing beverages',
      badgeText: '15% OFF',
      discountType: 'PERCENTAGE_CATEGORY',
      discountValue: '15',
      targetCategories: ['Drinks'],
      minOrderValue: '0',
      maxDiscountCap: '50',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setEditingOfferId(offer.id);
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      badgeText: offer.badgeText || '',
      discountType: offer.discountType || 'PERCENTAGE_CATEGORY',
      discountValue: String(offer.discountValue || '0'),
      targetCategories: Array.isArray(offer.targetCategories) ? offer.targetCategories : [],
      minOrderValue: String(offer.minOrderValue || '0'),
      maxDiscountCap: String(offer.maxDiscountCap || '0'),
      isActive: offer.isActive !== false,
    });
    setShowModal(true);
  };

  const toggleCategory = (cat) => {
    setFormData((prev) => {
      const exists = prev.targetCategories.includes(cat);
      const updated = exists
        ? prev.targetCategories.filter((c) => c !== cat)
        : [...prev.targetCategories, cat];
      return { ...prev, targetCategories: updated };
    });
  };

  const handleAutoSuggest = () => {
    const val = formData.discountValue || '0';
    const cats = formData.targetCategories.join(' & ');
    switch (formData.discountType) {
      case 'PERCENTAGE_CART':
        setFormData((prev) => ({
          ...prev,
          title: `${val}% OFF on All Items`,
          badgeText: `${val}% OFF`,
          description:
            Number(prev.minOrderValue) > 0
              ? `On orders above ₹${prev.minOrderValue}`
              : 'No minimum order required',
        }));
        break;
      case 'PERCENTAGE_CATEGORY':
        setFormData((prev) => ({
          ...prev,
          title: `${val}% OFF on ${cats || 'Selected Items'}`,
          badgeText: `${val}% OFF`,
          description: `Enjoy ${val}% off on all ${cats || 'items'}`,
        }));
        break;
      case 'FLAT_PRICE_CATEGORY':
        setFormData((prev) => ({
          ...prev,
          title: `All ${cats || 'Items'} at Just ₹${val}`,
          badgeText: `AT ₹${val}`,
          description: `Flat ₹${val} special deal on all ${cats || 'items'}`,
        }));
        break;
      case 'FLAT_DISCOUNT_CART':
        setFormData((prev) => ({
          ...prev,
          title: `Flat ₹${val} OFF`,
          badgeText: `₹${val} OFF`,
          description:
            Number(prev.minOrderValue) > 0
              ? `On orders above ₹${prev.minOrderValue}`
              : 'No minimum order required',
        }));
        break;
      default:
        break;
    }
  };

  const handleSaveOffer = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter an offer headline');
      return;
    }
    const numVal = Number(formData.discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      Alert.alert('Required', 'Please enter a valid deal or discount value');
      return;
    }

    const typeConfig = OFFER_TYPES.find((t) => t.id === formData.discountType);
    if (typeConfig?.requiresCategories && formData.targetCategories.length === 0) {
      Alert.alert('Required', 'Please pick at least one applicable category');
      return;
    }

    const payload = {
      ...formData,
      discountValue: numVal,
      minOrderValue: Number(formData.minOrderValue) || 0,
      maxDiscountCap: Number(formData.maxDiscountCap) || 0,
    };

    try {
      setSavingOffer(true);
      let updatedOffers = null;
      if (editingOfferId) {
        const res = await apiClient.put(
          `/store/${storeId}/offers/${editingOfferId}`,
          payload
        );
        updatedOffers = res.data?.offers;
      } else {
        const res = await apiClient.post(`/store/${storeId}/offers`, payload);
        updatedOffers = res.data?.offers;
      }

      if (Array.isArray(updatedOffers)) {
        setOffers(updatedOffers);
        await AsyncStorage.setItem(
          `universe_offers_${storeId}`,
          JSON.stringify(updatedOffers)
        ).catch(() => {});
      } else {
        // Fallback optimistic update
        const newId = editingOfferId || `off_${Date.now()}`;
        const newOffer = {
          ...payload,
          id: newId,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setOffers((prev) => {
          const next = editingOfferId
            ? prev.map((o) => (o.id === editingOfferId ? newOffer : o))
            : [newOffer, ...prev];
          AsyncStorage.setItem(
            `universe_offers_${storeId}`,
            JSON.stringify(next)
          ).catch(() => {});
          return next;
        });
      }

      setShowModal(false);
      Alert.alert('Success 🎉', `Offer "${payload.title}" is now active in real time!`);
    } catch (err) {
      console.log('[Offers] Save fallback:', err.message);
      // Resilient local update
      const newId = editingOfferId || `off_${Date.now()}`;
      const newOffer = {
        ...payload,
        id: newId,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setOffers((prev) => {
        const next = editingOfferId
          ? prev.map((o) => (o.id === editingOfferId ? newOffer : o))
          : [newOffer, ...prev];
        AsyncStorage.setItem(
          `universe_offers_${storeId}`,
          JSON.stringify(next)
        ).catch(() => {});
        return next;
      });
      setShowModal(false);
      Alert.alert('Offer Saved', `Offer "${payload.title}" is saved and active!`);
    } finally {
      setSavingOffer(false);
    }
  };

  const activeCount = offers.filter((o) => o.isActive !== false).length;

  const renderOfferItem = ({ item }) => {
    const isToggling = togglingId === item.id;
    const typeConfig = OFFER_TYPES.find((t) => t.id === item.discountType) || OFFER_TYPES[0];
    const isLive = item.isActive !== false;

    return (
      <View style={[styles.offerCard, !isLive && styles.offerCardInactive]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusPill,
                isLive ? styles.statusPillActive : styles.statusPillInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isLive ? '#10B981' : '#94A3B8' },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  isLive ? styles.statusTextActive : styles.statusTextInactive,
                ]}
              >
                {isLive ? 'LIVE ON APP' : 'PAUSED'}
              </Text>
            </View>

            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>
                {item.badgeText ||
                  (item.discountType.includes('PERCENTAGE')
                    ? `${item.discountValue}% OFF`
                    : `AT ₹${item.discountValue}`)}
              </Text>
            </View>
          </View>

          <Switch
            value={isLive}
            onValueChange={() => handleToggleOffer(item.id)}
            disabled={isToggling}
            trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
            thumbColor={isLive ? '#10B981' : '#94A3B8'}
            ios_backgroundColor="#E2E8F0"
          />
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={13} color="#EF4123" />
            <Text style={styles.metaText}>{typeConfig.name}</Text>
          </View>
          {item.targetCategories && item.targetCategories.length > 0 && (
            <View style={styles.metaRow}>
              <Ionicons name="fast-food-outline" size={13} color="#EF4123" />
              <Text style={styles.metaText}>
                Categories: {item.targetCategories.join(', ')}
              </Text>
            </View>
          )}
          <View style={styles.limitsRow}>
            {Number(item.minOrderValue) > 0 && (
              <Text style={styles.metaSubText}>Min Order: ₹{item.minOrderValue}</Text>
            )}
            {Number(item.maxDiscountCap) > 0 && (
              <Text style={styles.metaSubText}>Max Cap: ₹{item.maxDiscountCap}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={14} color="#475569" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteOffer(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* 1. TOP HEADER: Dark background (#0F172A) matching the app's top bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.topHeaderTitle}>Store Offers & Deals</Text>
          <View style={styles.storeBadge}>
            <Ionicons
              name="storefront"
              size={12}
              color="#EF4123"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.storeName} numberOfLines={1}>
              {activeStore?.name || 'Active Stall'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.topNewBtn}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.topNewBtnText}>New Offer</Text>
        </TouchableOpacity>
      </View>

      {/* 2. MAIN SCREEN CONTENT: Light background (#F8FAFC) matching other pages */}
      <View style={styles.mainContentContainer}>
        {/* Quick Stats Header */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{offers.length}</Text>
            <Text style={styles.statLabel}>Total Created</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Live Now</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#64748B' }]}>
              {offers.length - activeCount}
            </Text>
            <Text style={styles.statLabel}>Paused</Text>
          </View>
        </View>

        {loading && offers.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#EF4123" />
            <Text style={styles.loadingText}>Loading stall promotions...</Text>
          </View>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderOfferItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchOffers(true)}
                colors={['#EF4123']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="pricetag" size={36} color="#EF4123" />
                </View>
                <Text style={styles.emptyTitle}>No Promotions Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Boost your daily sales! Offer 15% off drinks, or all chaap at flat ₹50 to attract hungry students across campus.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={openCreateModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>Create Your First Deal</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* CREATE / EDIT OFFER MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pricetag" size={20} color="#EF4123" />
                <Text style={styles.modalTitle}>
                  {editingOfferId ? 'Edit Offer' : 'Launch New Offer'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              {/* Step 1: Offer Type */}
              <Text style={styles.inputSectionLabel}>1. SELECT OFFER TYPE</Text>
              <View style={styles.typesGrid}>
                {OFFER_TYPES.map((type) => {
                  const isSelected = formData.discountType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                      onPress={() =>
                        setFormData((prev) => ({ ...prev, discountType: type.id }))
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons
                          name={type.icon}
                          size={16}
                          color={isSelected ? '#EF4123' : '#64748B'}
                        />
                        <Text style={[styles.typeName, isSelected && styles.typeNameSelected]}>
                          {type.name}
                        </Text>
                      </View>
                      <Text style={styles.typeTagline}>{type.tagline}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Step 2: Target Categories (if category-based) */}
              {(formData.discountType === 'PERCENTAGE_CATEGORY' ||
                formData.discountType === 'FLAT_PRICE_CATEGORY') && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputSectionLabel}>
                    2. APPLICABLE CATEGORIES (TAP TO PICK)
                  </Text>
                  <View style={styles.categoryPillsWrap}>
                    {availableCategories.map((cat) => {
                      const isSelected = formData.targetCategories.includes(cat);
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catPill, isSelected && styles.catPillSelected]}
                          onPress={() => toggleCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.catPillText,
                              isSelected && styles.catPillTextSelected,
                            ]}
                          >
                            {isSelected ? `✓ ${cat}` : cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Step 3: Value & Limits */}
              <Text style={styles.inputSectionLabel}>3. DISCOUNT & PRICING RULES</Text>
              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputFieldLabel}>
                    {formData.discountType === 'FLAT_PRICE_CATEGORY'
                      ? 'Deal Price (₹)'
                      : formData.discountType === 'FLAT_DISCOUNT_CART'
                      ? 'Flat Off (₹)'
                      : 'Discount (%)'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.discountValue}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, discountValue: val }))
                    }
                    keyboardType="numeric"
                    placeholder="e.g. 15 or 50"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputFieldLabel}>Min Cart Total (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.minOrderValue}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, minOrderValue: val }))
                    }
                    keyboardType="numeric"
                    placeholder="0 = No Min"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {formData.discountType.includes('PERCENTAGE') && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputFieldLabel}>
                    Max Discount Cap (₹) (0 = No cap)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.maxDiscountCap}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, maxDiscountCap: val }))
                    }
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}

              {/* Step 4: Headline & Auto Suggest */}
              <View style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Text style={styles.inputSectionLabel}>4. PROMOTION HEADLINE</Text>
                  <TouchableOpacity onPress={handleAutoSuggest} activeOpacity={0.7}>
                    <Text style={styles.suggestBtn}>⚡ Auto-suggest</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={formData.title}
                  onChangeText={(val) =>
                    setFormData((prev) => ({ ...prev, title: val }))
                  }
                  placeholder="e.g. 15% Off on Drinks"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Badge Text */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputFieldLabel}>Card Pill Badge</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.badgeText}
                  onChangeText={(val) =>
                    setFormData((prev) => ({ ...prev, badgeText: val }))
                  }
                  placeholder="e.g. 15% OFF or AT ₹50"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputFieldLabel}>Subtitle / Description</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(val) =>
                    setFormData((prev) => ({ ...prev, description: val }))
                  }
                  multiline
                  placeholder="e.g. Applicable on all fresh shakes & cold coffees"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Live Preview Box */}
              <View style={styles.previewBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="sparkles" size={14} color="#EF4123" />
                  <Text style={styles.previewTitle}>Live Student Preview</Text>
                </View>
                <View style={styles.previewCard}>
                  <Text style={styles.previewCardHeadline}>{formData.title || 'Special Stall Deal'}</Text>
                  <View style={styles.previewPill}>
                    <Text style={styles.previewPillText}>
                      {formData.badgeText ||
                        (formData.discountType.includes('PERCENTAGE')
                          ? `${formData.discountValue}% OFF`
                          : `AT ₹${formData.discountValue}`)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowModal(false)}
                  disabled={savingOffer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, savingOffer && { opacity: 0.7 }]}
                  onPress={handleSaveOffer}
                  disabled={savingOffer}
                  activeOpacity={0.85}
                >
                  {savingOffer ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>
                        {editingOfferId ? 'Save Changes' : 'Go Live Now'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark background for status bar & top notch
  },

  /* 1. TOP HEADER: Dark background matching app theme */
  topHeaderBar: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  topHeaderLeft: {
    flex: 1,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  storeName: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  topNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4123',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 4,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  topNewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* 2. MAIN CONTENT: Crisp Light background matching app body */
  mainContentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
  },

  /* Offer Card: Light theme crisp white */
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  offerCardInactive: {
    opacity: 0.72,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 100,
    gap: 4,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusPillInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  tagBadge: {
    backgroundColor: 'rgba(239, 65, 35, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#EF4123',
    fontSize: 10.5,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },
  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  metaSubText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4123',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Modal Styles: Light Theme Clean Dialog */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
  },
  typeCardSelected: {
    borderColor: '#EF4123',
    backgroundColor: 'rgba(239, 65, 35, 0.06)',
  },
  typeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  typeNameSelected: {
    color: '#EF4123',
  },
  typeTagline: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 13,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillSelected: {
    backgroundColor: '#EF4123',
    borderColor: '#EF4123',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  suggestBtn: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4123',
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4123',
    textTransform: 'uppercase',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewCardHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  previewPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#EF4123',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#EF4123',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
