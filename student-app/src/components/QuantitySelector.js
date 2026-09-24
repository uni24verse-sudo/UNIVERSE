import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

const QuantitySelector = ({
  quantity = 0,
  onIncrement,
  onDecrement,
  disabled = false,
  customizable = false,
}) => {
  if (disabled) {
    return null;
  }

  if (quantity === 0) {
    return (
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.8}
        onPress={onIncrement}
      >
        <Text style={styles.addText}>ADD</Text>
        <Feather name="plus" size={14} color={THEME.colors.primary} />
        {customizable && (
          <View style={styles.customizableDot} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.stepperContainer}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onDecrement}
        activeOpacity={0.7}
      >
        <Feather name="minus" size={14} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.quantityText}>{quantity}</Text>

      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onIncrement}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 84,
    ...THEME.shadows.card,
  },
  addText: {
    color: THEME.colors.primary,
    fontWeight: '800',
    fontSize: 13,
    marginRight: 4,
    letterSpacing: 0.5,
  },
  customizableDot: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
  },
  stepperContainer: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 90,
    ...THEME.shadows.primary,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quantityText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  disabledContainer: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  disabledText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default QuantitySelector;
