import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
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

  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product]);

  if (!product) return null;

  const handleConfirm = () => {
    if (storeClosed || isUnavailable) return;
    if (selectedVariant) {
      onAddToCart(product, selectedVariant);
    }
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

          <Text style={styles.subhead}>Customization Options</Text>

          {/* Variant Selection List */}
          <FlatList
            data={product.variants || []}
            keyExtractor={(item, index) => item.name + index}
            renderItem={({ item }) => {
              const isSelected = selectedVariant?.name === item.name;
              return (
                <TouchableOpacity
                  style={[styles.variantCard, isSelected && styles.selectedVariantCard]}
                  onPress={() => setSelectedVariant(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.radioRow}>
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
                    />
                    <Text style={[styles.variantName, isSelected && styles.selectedVariantName]}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.variantPrice}>₹{item.price}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContainer}
          />

          {/* Bottom Action Bar */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerTotalLabel}>Total Price</Text>
              <Text style={styles.footerPrice}>
                ₹{selectedVariant ? selectedVariant.price : product.price}
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
    maxHeight: '75%',
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
  subhead: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingVertical: 6,
  },
  variantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 10,
  },
  selectedVariantCard: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySoft,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  variantName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  selectedVariantName: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  variantPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
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
