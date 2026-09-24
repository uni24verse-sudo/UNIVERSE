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

            <Text style={styles.heading}>1. Order Placement & Takeaway</Text>
            <Text style={styles.paragraph}>
              All orders placed via the platform are intended for campus dining counter takeaway or on-spot consumption. Please arrive at the stall counter within 15 minutes of the order reaching "Ready for Pickup" status.
            </Text>

            <Text style={styles.heading}>2. Handover Verification</Text>
            <Text style={styles.paragraph}>
              Every order generates a unique 4-digit handover OTP and pickup verification QR code. You must show this code at the stall counter to claim your food.
            </Text>

            <Text style={styles.heading}>3. Cancellations & Refunds</Text>
            <Text style={styles.paragraph}>
              Orders can only be cancelled before the kitchen marks them as "Cooking / Preparing". Once preparation begins, ingredients are allocated and orders cannot be cancelled.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Student Privacy Policy</Text>
            <Text style={styles.paragraph}>
              UniVerse respects student privacy. We only collect the necessary information to process campus food orders and coordinate counter pick-ups.
            </Text>

            <Text style={styles.heading}>1. Information Collected</Text>
            <Text style={styles.paragraph}>
              We collect your name, 10-digit mobile number, campus location hub, and optional delivery/table location purely for identifying your food package.
            </Text>

            <Text style={styles.heading}>2. Payment Information</Text>
            <Text style={styles.paragraph}>
              All payment transactions are encrypted and processed through Razorpay (RBI-authorized payment aggregator). UniVerse does not store card numbers, UPI PINs, or netbanking credentials.
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
