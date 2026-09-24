import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { THEME } from '../constants/theme';
import { useLocation } from '../context/LocationContext';

const SplashScreen = ({ navigation }) => {
  const { currentLocation, loading } = useLocation();

  // 1. Entrance Pop-Out Animations
  const logoScale = useRef(new Animated.Value(0.1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  // 3D Text Entrance
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(35)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;

  // Tagline Entrance
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(15)).current;

  // 2. Ambient Continuous 3D Floating Motion Loop (Live effect)
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isNative = Platform.OS !== 'web';

    // A. Explosive Spring Pop-Out Sequence ("Live logo coming out")
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: isNative,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 55,
          useNativeDriver: isNative,
        }),
        Animated.spring(logoRotate, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: isNative,
        }),
      ]),

      // B. 3D Text & Tagline Emergence
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: isNative,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 5,
          tension: 45,
          useNativeDriver: isNative,
        }),
        Animated.spring(textScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: isNative,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 260,
          delay: 60,
          useNativeDriver: isNative,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 45,
          delay: 60,
          useNativeDriver: isNative,
        }),
      ]),
    ]).start(() => {
      // C. Continuous 3D Floating Motion Loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: isNative,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: isNative,
          }),
        ])
      ).start();
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (currentLocation) {
        navigation.replace('Home');
      } else {
        navigation.replace('LocationPortal');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [loading, currentLocation, navigation]);

  // Dynamic 3D Interpolations
  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '0deg'],
  });

  const logoFloatingY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });

  const logoBreathingScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const shadowScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.1],
  });

  const shadowOpacity = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.08],
  });

  const textFloatingY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -3],
  });

  const textTilt = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1.2deg', '1.2deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Ambient Light Mode Background Glow Spheres */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View style={styles.centerStage}>
        {/* Live Logo Badge - 3D Emergence & Floating */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, logoBreathingScale) },
                { translateY: logoFloatingY },
                { rotate: logoRotation },
              ],
            },
          ]}
        >
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/logo-symbol.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Dynamic 3D Ground Shadow under floating logo */}
        <Animated.View
          style={[
            styles.groundShadow,
            {
              transform: [{ scale: shadowScale }],
              opacity: shadowOpacity,
            },
          ]}
        />

        {/* 3D Animated & Moving UniVerse Brand Title */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [
                { translateY: Animated.add(textTranslateY, textFloatingY) },
                { scale: textScale },
                { rotate: textTilt },
              ],
            },
          ]}
        >
          <Text style={styles.brandTitle}>UniVerse</Text>
          <View style={styles.brandTitleUnderline} />
        </Animated.View>

        {/* 3D Moving Tagline */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.tagline}>DIGITAL CAMPUS DINING</Text>
        </Animated.View>
      </View>

      {/* Powered by Footer in Light Theme */}
      <Animated.View style={[styles.footerContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.footerText}>SMART CAMPUS FOOD COURT SYSTEM</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(239, 65, 35, 0.05)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(252, 175, 23, 0.06)',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08), 0 6px 16px rgba(239, 65, 35, 0.12)',
      },
      default: {
        shadowColor: '#EF4123',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: 68,
    height: 68,
  },
  groundShadow: {
    width: 72,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F172A',
    marginTop: 8,
    marginBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '0 2px 0 #E2E8F0, 0 4px 0 #CBD5E1, 0 8px 16px rgba(15, 23, 42, 0.1), 0 12px 24px rgba(239, 65, 35, 0.16)',
      },
      default: {
        textShadowColor: 'rgba(239, 65, 35, 0.22)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
      },
    }),
  },
  brandTitleUnderline: {
    width: 42,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
    marginTop: 6,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 12.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 2.8,
    textAlign: 'center',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});

export default SplashScreen;
