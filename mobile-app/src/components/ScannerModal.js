import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScannerModal({ visible, onClose, onHandoverSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setProcessing(false);
      const timer = setTimeout(() => setIsCameraReady(true), 400);
      return () => clearTimeout(timer);
    } else {
      setIsCameraReady(false);
    }
  }, [visible]);

  if (!visible) return null;
  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade">
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
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
        handoverToken: extractedToken
      });

      Alert.alert('Success!', res.data.message || 'Order successfully handed over.');
      if (onHandoverSuccess) onHandoverSuccess(payload.orderId);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification Failed';
      Alert.alert('Scan Failed', msg, [
        { text: 'Try Again', onPress: () => { setScanned(false); setProcessing(false); } },
        { text: 'Cancel', style: 'cancel', onPress: onClose }
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.container}>
        {isCameraReady ? (
          <>
            <CameraView 
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
            {/* The Overlay MUST be a SIBLING of CameraView, positioned absolutely */}
            <View style={[StyleSheet.absoluteFillObject, styles.overlayContainer]}>
              
              {/* Semi-Transparent Top Header */}
              <View style={styles.topSection}>
                <SafeAreaView edges={['top']}>
                  <View style={styles.header}>
                    <View style={styles.headerLeft}>
                      <Image source={require('../../assets/logo-symbol.png')} style={styles.headerLogo} resizeMode="contain" />
                      <View>
                        <Text style={styles.headerTitle}>Verification</Text>
                        <Text style={styles.headerSub}>Scan customer receipt</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>

              {/* Middle Viewfinder */}
              <View style={styles.centerSection}>
                <View style={styles.scannerFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {processing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#10B981" />
                      <Text style={styles.processingText}>Verifying...</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Semi-Transparent Bottom Footer */}
              <View style={styles.bottomSection}>
                <SafeAreaView edges={['bottom']}>
                  <Text style={styles.footerText}>Position the QR code entirely within the frame</Text>
                </SafeAreaView>
              </View>

            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Initializing Camera...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 30,
    alignItems: 'center',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#38BDF8',
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  processingText: {
    color: '#10B981',
    marginTop: 12,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#E2E8F0',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  }
});
