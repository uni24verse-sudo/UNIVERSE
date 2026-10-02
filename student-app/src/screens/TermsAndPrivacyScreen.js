import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

const TermsAndPrivacyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('terms'); // 'terms' | 'privacy'

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'terms' && styles.activeTabBtn]}
          onPress={() => setTab('terms')}
        >
          <Text style={[styles.tabText, tab === 'terms' && styles.activeTabText]}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'privacy' && styles.activeTabBtn]}
          onPress={() => setTab('privacy')}
        >
          <Text style={[styles.tabText, tab === 'privacy' && styles.activeTabText]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'terms' ? (
          <View style={styles.card}>
            <Text style={styles.title}>UniVerse Student Dining Terms</Text>
            <Text style={styles.paragraph}>
              Welcome to UniVerse. By placing an order through the UniVerse mobile application, you agree to the following terms and conditions:
            </Text>

            <Text style={styles.heading}>1. Order Placement, Takeaway & Delivery</Text>
            <Text style={styles.paragraph}>
              All orders placed via the platform are intended for campus dining counter takeaway, dine-in, or doorstep delivery. For takeaway orders, please arrive at the stall counter within 15 minutes of the order reaching "Ready for Pickup" status. For delivery orders, please be available at the specified drop location to receive your order.
            </Text>

            <Text style={styles.heading}>2. Handover Verification & PIN</Text>
            <Text style={styles.paragraph}>
              Every order generates a unique 4-digit handover OTP / Delivery PIN and pickup verification QR code. You must show this code or share your 4-digit PIN with the stall counter or delivery rider upon handover to verify and complete the order.
            </Text>

            <Text style={styles.heading}>3. Cancellations & Refunds</Text>
            <Text style={styles.paragraph}>
              Orders can be cancelled before the kitchen marks them as "Cooking / Preparing" or "Dispatched". Once preparation begins, ingredients are allocated and orders cannot be cancelled. In case of failed deliveries or merchant unavailability, refunds are processed back to the original payment source via Razorpay within 3–7 business days.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Student Privacy Policy</Text>
            <Text style={styles.paragraph}>
              UniVerse respects student privacy. We only collect the necessary information to process campus food orders, coordinate counter pick-ups, and fulfill delivery orders. This policy applies to the UniVerse Food mobile application on Google Play Store.
            </Text>

            <Text style={styles.heading}>1. Information Collected</Text>
            <Text style={styles.paragraph}>
              We collect your name, 10-digit mobile number, email address, campus hub, and delivery address strictly for processing orders, coordinating deliveries, and sending status updates. No mandatory login account is required — your details are stored locally on your device for reordering convenience.
            </Text>

            <Text style={styles.heading}>2. Precise Location (GPS) Usage</Text>
            <Text style={styles.paragraph}>
              When you use the "Auto-detect GPS" feature for delivery orders, the app requests foreground location permission. This location is used solely to identify your delivery drop-off point and provide accurate turn-by-turn routing to the delivery rider. Background location is NEVER accessed or recorded.
            </Text>

            <Text style={styles.heading}>3. On-Device Storage</Text>
            <Text style={styles.paragraph}>
              The app stores your cart, recent order history, customer details (name, phone, email), and saved addresses locally on your device. This data remains on your device and is only transmitted when submitting an active order.
            </Text>

            <Text style={styles.heading}>4. Payment Information & Security</Text>
            <Text style={styles.paragraph}>
              All payment transactions are encrypted and processed through Razorpay (RBI-authorized payment aggregator). UniVerse does not store card numbers, UPI PINs, or netbanking credentials. Only payment status and transaction references are retained for order fulfillment and dispute resolution.
            </Text>

            <Text style={styles.heading}>5. Push Notifications</Text>
            <Text style={styles.paragraph}>
              The app may request permission to send push notifications for order status updates (e.g., when your food is ready or dispatched). You can disable notifications at any time through your device settings.
            </Text>

            <Text style={styles.heading}>6. Data Sharing & Privacy Protocol</Text>
            <Text style={styles.paragraph}>
              UniVerse enforces strict data isolation. Kitchen vendors only receive essential order data (items, order number, and order type) for food preparation. For delivery orders, riders only receive the drop address and phone number for delivery coordination.
            </Text>

            <Text style={styles.heading}>7. Data Deletion & User Rights</Text>
            <Text style={styles.paragraph}>
              You may clear all locally stored data at any time from your device settings or by uninstalling the app. To request permanent deletion of your transaction logs and server records, email us at uni24verse@gmail.com with your mobile number.
            </Text>

            <Text style={styles.heading}>Grievance Officer</Text>
            <Text style={styles.paragraph}>
              Company: Universe{'\n'}
              Address: Lovely Professional University, Phagwara, Punjab, India{'\n'}
              Email: uni24verse@gmail.com{'\n'}
              Phone: 7985397373 / 8295886832{'\n'}
              Hours: Mon - Fri (9:00 - 18:00)
            </Text>

            <Text style={[styles.paragraph, { marginTop: 14, fontStyle: 'italic' }]}>
              For the full privacy policy, visit https://food.universeorder.co.in/privacy
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  activeTabBtn: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    ...THEME.shadows.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  }
});

export default TermsAndPrivacyScreen;
