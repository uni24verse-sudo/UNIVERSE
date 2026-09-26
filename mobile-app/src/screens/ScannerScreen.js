import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Image, 
  Vibration,
  Animated,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [torch, setTorch] = useState(false);
  const isFocused = useIsFocused();

  // Animated laser scan bar
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setScanned(false);
    setProcessing(false);
    const timer = setTimeout(() => setIsCameraReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: SCAN_BOX_SIZE - 6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [laserAnim]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.permissionContainer]}>
        <View style={styles.permissionCard}>
          <Image source={require('../../assets/logo-symbol.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>We need your permission to use the camera for scanning handover QR codes.</Text>
          <TouchableOpacity onPress={requestPermission} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6B00', '#EF4123']} style={styles.grantBtn} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              <Text style={styles.grantBtnText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.cancelBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const payload = JSON.parse(data);
      const extractedToken = payload.handoverToken || payload.token;
      
      if (!payload.orderId || !extractedToken) {
        throw new Error('Invalid QR Code Format');
      }

      const res = await apiClient.put('/orders/verify-handover', {
        orderId: payload.orderId,
        handoverToken: extractedToken,
        token: extractedToken
      });

      // Vibrate for success
      Vibration.vibrate([0, 100, 50, 100]);
      
      // Show sleek success overlay, then instantly go back
      setShowSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 700);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification Failed';
      Alert.alert('Scan Failed', msg, [
        { text: 'Try Again', onPress: () => { setScanned(false); setProcessing(false); } },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && isCameraReady ? (
        <View style={StyleSheet.absoluteFill}>
          {/* Full Screen Live Camera Feed */}
          <CameraView 
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />

          {/* Mask Overlay: Darkened surrounds with transparent center window */}
          <View style={[StyleSheet.absoluteFill, styles.overlayWrapper, { pointerEvents: 'box-none' }]}>
            {/* Top Dark Mask */}
            <View style={styles.maskDark} />

            {/* Middle Row with Center Cutout */}
            <View style={styles.middleRow}>
              <View style={styles.maskDark} />
              
              {/* Center Scanner Window */}
              <View style={[styles.reticleBox, { width: SCAN_BOX_SIZE, height: SCAN_BOX_SIZE }]}>
                {/* 4 Neon Orange Glowing Corners */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated Laser Scanning Line */}
                {!scanned && (
                  <Animated.View 
                    style={[
                      styles.laserLine, 
                      { width: SCAN_BOX_SIZE - 20, transform: [{ translateY: laserAnim }] }
                    ]} 
                  />
                )}
              </View>

              <View style={styles.maskDark} />
            </View>

            {/* Bottom Dark Mask with Instructions */}
            <View style={[styles.maskDark, styles.bottomMask]}>
              <View style={styles.hintBadge}>
                <Ionicons name="qr-code-outline" size={18} color="#FF6B00" style={{ marginRight: 8 }} />
                <Text style={styles.hintBadgeText}>Align student QR code in frame</Text>
              </View>
              <Text style={styles.subHintText}>Order will verify & complete instantly upon scan</Text>
            </View>
          </View>

          {/* Top Bar Controls (Safe Area protected) */}
          <SafeAreaView edges={['top']} style={[styles.safeHeader, { pointerEvents: 'box-none' }]}>
            <View style={styles.topControlBar}>
              <TouchableOpacity 
                onPress={() => setTorch(t => !t)} 
                style={[styles.controlIconBtn, torch && styles.controlIconBtnActive]}
                activeOpacity={0.8}
              >
                <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color={torch ? "#FBBF24" : "white"} />
              </TouchableOpacity>

              <View style={styles.headerTitlePill}>
                <Text style={styles.headerTitleText}>Handover Scanner</Text>
              </View>

              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.controlIconBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Processing Spinner Overlay */}
          {processing && !showSuccess && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#EF4123" />
              <Text style={styles.processingText}>Verifying Handover...</Text>
            </View>
          )}

          {/* Verification Success Overlay */}
          {showSuccess && (
            <View style={styles.processingOverlay}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={60} color="white" />
              </View>
              <Text style={[styles.processingText, { color: 'white', fontSize: 24, marginTop: 16 }]}>Verified & Completed!</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4123" />
          <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Opening Camera...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },

  /* Overlay Mask */
  overlayWrapper: {
    zIndex: 10,
  },
  maskDark: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  reticleBox: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  /* Glowing Corner Brackets */
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#EF4123',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },

  /* Animated Laser Scan Line */
  laserLine: {
    position: 'absolute',
    top: 0,
    height: 2.5,
    backgroundColor: '#FF6B00',
    borderRadius: 2,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  /* Bottom Mask Hints */
  bottomMask: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 24,
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  hintBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subHintText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },

  /* Safe Top Control Bar */
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 10,
  },
  controlIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlIconBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderColor: '#FBBF24',
  },
  headerTitlePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* Overlays */
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  processingText: {
    color: '#10B981',
    marginTop: 14,
    fontWeight: '800',
    fontSize: 18,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },

  /* Permissions */
  permissionContainer: {
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#1E293B',
    padding: 28,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  grantBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 18,
    borderRadius: 14,
  },
});
