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
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.grantBtn}>
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
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          {processing && !showSuccess && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.processingText}>Verifying...</Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    color: '#94A3B8',
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
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
