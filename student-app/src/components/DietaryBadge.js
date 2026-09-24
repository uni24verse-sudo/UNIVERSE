import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

const DietaryBadge = ({ type = 'veg', size = 16 }) => {
  const isVeg = type === 'veg';
  const isEgg = type === 'egg';
  const color = isVeg ? THEME.colors.veg : (isEgg ? THEME.colors.egg : THEME.colors.nonVeg);

  return (
    <View style={[styles.border, { width: size, height: size, borderColor: color }]}>
      {isVeg || isEgg ? (
        <View style={[styles.circle, { width: size * 0.45, height: size * 0.45, backgroundColor: color }]} />
      ) : (
        <View style={[styles.triangle, { 
          borderLeftWidth: size * 0.25, 
          borderRightWidth: size * 0.25, 
          borderBottomWidth: size * 0.45, 
          borderBottomColor: color 
        }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  border: {
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  circle: {
    borderRadius: 999,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  }
});

export default DietaryBadge;
