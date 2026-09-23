import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Image, Vibration } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [torch, setTorch] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    setScanned(false);
    setProcessing(false);
    const timer = setTimeout(() => setIsCameraReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.permissionContainer]}>
        <View style={styles.permissionCard}>
          <Image source={require('../../assets/logo-symbol.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>We need your permission to use the camera for scanning handover QR codes.</Text>
          <TouchableOpacity onPress={requestPermission}>
            <LinearGradient colors={['#FF6B00', '#EF4123']} style={styles.grantBtn} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              <Text style={styles.grantBtnText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
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
        <>
          <CameraView 
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />

          {/* Illuminated Target Viewfinder */}
          <View style={styles.viewfinderContainer} pointerEvents="none">
            <View style={styles.reticleBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.reticleHint}>Align student QR code within frame</Text>
            </View>
          </View>

          {/* Top Bar Controls */}
          <View style={styles.topControlBar}>
            <TouchableOpacity onPress={() => setTorch(t => !t)} style={styles.controlIconBtn}>
              <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color={torch ? "#FBBF24" : "white"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.controlCloseBtn}>
              <Ionicons name="close" size={20} color="white" />
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {processing && !showSuccess && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#EF4123" />
              <Text style={styles.processingText}>Verifying Handover...</Text>
            </View>
          )}
          {showSuccess && (
            <View style={styles.processingOverlay}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={60} color="white" />
              </View>
              <Text style={[styles.processingText, { color: 'white', fontSize: 24, marginTop: 16 }]}>Verified!</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  grantBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  grantBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  logo: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 12,
  },
  topControlBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
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
  controlCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  closeBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  viewfinderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleBox: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#EF4123',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  reticleHint: {
    position: 'absolute',
    bottom: -36,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#10B981',
    marginTop: 12,
    fontWeight: 'bold',
    fontSize: 18,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  }
});
