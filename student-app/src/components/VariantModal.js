import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import DietaryBadge from './DietaryBadge';

const VariantModal = ({
  visible,
  product,
  onClose,
  onAddToCart,
  storeClosed = false,
  isUnavailable = false,
}) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
    setSelectedAddOns([]);
  }, [product, visible]);

  if (!product) return null;

  const hasVariants = product.variants && product.variants.length > 0;
  const hasAddOns = product.addOns && product.addOns.length > 0;

  // Dynamic add-on price based on currently selected variant size
  const getAddOnPrice = (addon) => {
    if (addon.variantPrices && selectedVariant?.name && addon.variantPrices[selectedVariant.name] !== undefined) {
      return Number(addon.variantPrices[selectedVariant.name]) || 0;
    }
    return Number(addon.price) || 0;
  };

  const toggleAddOn = (addon) => {
    const isAlreadySelected = selectedAddOns.some(a => a.name === addon.name);
    if (isAlreadySelected) {
      setSelectedAddOns(prev => prev.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddOns(prev => [...prev, { name: addon.name, rawAddon: addon }]);
    }
  };

  const addOnsTotal = useMemo(() => {
    return selectedAddOns.reduce((sum, item) => {
      const livePrice = getAddOnPrice(item.rawAddon);
      return sum + livePrice;
    }, 0);
  }, [selectedAddOns, selectedVariant]);

  const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price || 0);
  const totalLivePrice = basePrice + addOnsTotal;

  const handleConfirm = () => {
    if (storeClosed || isUnavailable) return;
    const finalAddOnsPayload = selectedAddOns.map(item => ({
      name: item.name,
      price: getAddOnPrice(item.rawAddon)
    }));

    onAddToCart(product, selectedVariant, finalAddOnsPayload);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <DietaryBadge type={product.dietaryPreference || 'veg'} size={18} />
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Size Selection */}
            {hasVariants && (
              <View style={styles.section}>
                <Text style={styles.subhead}>CHOOSE SIZE</Text>
                {product.variants.map((item, index) => {
                  const isSelected = selectedVariant?.name === item.name;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                      onPress={() => setSelectedVariant(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioRow}>
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
                        />
                        <Text style={[styles.optionName, isSelected && styles.selectedOptionName]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={[styles.optionPrice, isSelected && styles.selectedOptionPrice]}>₹{item.price}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 2. Dynamic Add-ons Matrix */}
            {hasAddOns && (
              <View style={styles.section}>
                <Text style={styles.subhead}>
                  ADD-ONS & EXTRAS {selectedVariant ? `(${selectedVariant.name})` : ''}
                </Text>
                {product.addOns.map((addon, index) => {
                  const isSelected = selectedAddOns.some(a => a.name === addon.name);
                  const livePrice = getAddOnPrice(addon);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.optionCard, isSelected && styles.selectedAddOnCard]}
                      onPress={() => toggleAddOn(addon)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioRow}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={20}
                          color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
                        />
                        <Text style={[styles.optionName, isSelected && styles.selectedAddOnName]}>
                          {addon.name}
                        </Text>
                      </View>
                      <Text style={[styles.optionPrice, isSelected && styles.selectedAddOnPrice]}>+₹{livePrice}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerTotalLabel}>Total Price</Text>
              <Text style={styles.footerPrice}>
                ₹{totalLivePrice}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                (storeClosed || isUnavailable) && styles.disabledAddBtn
              ]}
              onPress={handleConfirm}
              disabled={storeClosed || isUnavailable}
              activeOpacity={0.85}
            >
              <Text style={[styles.addBtnText, (storeClosed || isUnavailable) && styles.disabledAddBtnText]}>
                {storeClosed ? '🔒 STORE CLOSED' : isUnavailable ? 'SOLD OUT' : 'Add Item'}
              </Text>
              {!storeClosed && !isUnavailable && (
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
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
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '80%',
    ...THEME.shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  section: {
    marginBottom: 16,
  },
  subhead: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  selectedOptionCard: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySoft,
  },
  selectedAddOnCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  selectedOptionName: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  selectedAddOnName: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  selectedOptionPrice: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  selectedAddOnPrice: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
  },
  footerTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.md,
    ...THEME.shadows.primary,
  },
  disabledAddBtn: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledAddBtnText: {
    color: '#F1F5F9',
  },
});

export default VariantModal;
