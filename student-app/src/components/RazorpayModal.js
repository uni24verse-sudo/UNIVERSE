import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

const RazorpayModal = ({
  visible,
  options,
  onSuccess,
  onFailure,
  onClose,
}) => {
  if (!visible || !options) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            background-color: #0F172A;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #FFFFFF;
          }
          .loader {
            text-align: center;
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border-left-color: #EF4123;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p style="font-size: 15px; font-weight: 600;">Opening Secure Payment...</p>
        </div>

        <script>
          const rzpOptions = ${JSON.stringify(options)};
          
          rzpOptions.handler = function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SUCCESS',
              data: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }
            }));
          };

          rzpOptions.modal = {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DISMISSED'
              }));
            }
          };

          const rzp = new Razorpay(rzpOptions);
          rzp.on('payment.failed', function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FAILED',
              error: response.error
            }));
          });

          setTimeout(() => {
            rzp.open();
          }, 300);
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'SUCCESS') {
        onSuccess(parsed.data);
      } else if (parsed.type === 'FAILED') {
        onFailure(parsed.error);
      } else if (parsed.type === 'DISMISSED') {
        onClose();
      }
    } catch (e) {
      console.warn('Error parsing razorpay webview message', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UPI & Online Payment</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default RazorpayModal;
