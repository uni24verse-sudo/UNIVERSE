import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MarqueePromo = ({
  text = "🔥 FLAT 20% OFF ON ALL ORDERS ABOVE ₹199 | USE CODE: UNIVERSE20 ⚡️ FAST PICKUP • ORDER 15 MIN EARLY. EAT FRESH.",
  topInset = 0,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [250, -450],
  });

  return (
    <LinearGradient
      colors={['#EF4123', '#FF5722']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: topInset, height: 28 + topInset }]}
    >
      <View style={styles.clipper}>
        <Animated.View style={[styles.textRow, { transform: [{ translateX }] }]}>
          <Text style={styles.promoText}>{text}</Text>
          <Text style={[styles.promoText, { marginLeft: 50 }]}>{text}</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 20,
  },
  clipper: {
    flex: 1,
    justifyContent: 'center',
    height: 28,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 1200,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default MarqueePromo;
