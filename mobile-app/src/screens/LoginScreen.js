import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getBaseUrl, setServerUrl } from '../api/client';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentServer, setCurrentServer] = useState(getBaseUrl());
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [customIp, setCustomIp] = useState('10.36.97.59');
  const { login } = useContext(AuthContext);

  const handleSelectServer = async (type) => {
    let newUrl = 'https://food.universeorder.co.in/api';
    if (type === 'uat') {
      newUrl = 'https://uat.food.universeorder.co.in/api';
    } else if (type === 'local') {
      newUrl = `http://${customIp.trim()}:5000/api`;
    }
    await setServerUrl(newUrl);
    setCurrentServer(newUrl);
    setShowServerPicker(false);
  };

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter email and password');
      return;
    }

    setIsLoggingIn(true);
    const result = await login(email.trim(), password);
    setIsLoggingIn(false);

    if (!result.success) {
      setErrorMessage(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>UNIVERSE</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>VENDOR PARTNER</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Fast, synchronized kitchen operations</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@universe.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.8}
            style={{ marginTop: 12 }}
          >
            <LinearGradient
              colors={['#FF6B00', '#EF4123']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Server Switcher Pill for Easy Testing on Real Phone */}
          <View style={styles.serverContainer}>
            <TouchableOpacity 
              onPress={() => setShowServerPicker(!showServerPicker)}
              style={styles.serverPill}
              activeOpacity={0.7}
            >
              <View style={[styles.serverDot, { backgroundColor: currentServer.includes('uat.food') ? '#F59E0B' : (currentServer.includes('universeorder.co.in') ? '#10B981' : '#3B82F6') }]} />
              <Text style={styles.serverText}>
                {currentServer.includes('uat.food') ? 'UAT Staging' : (currentServer.includes('universeorder.co.in') ? 'Production (Live)' : 'Local Dev Server')}
              </Text>
              <Ionicons name={showServerPicker ? "chevron-up" : "settings-outline"} size={13} color="#94A3B8" />
            </TouchableOpacity>

            {showServerPicker && (
              <View style={styles.serverMenu}>
                <Text style={styles.serverMenuLabel}>Select Backend Server:</Text>
                
                <TouchableOpacity 
                  style={[styles.serverOption, currentServer === 'https://food.universeorder.co.in/api' && styles.serverOptionActive]}
                  onPress={() => handleSelectServer('cloud')}
                >
                  <Text style={[styles.serverOptionTitle, currentServer === 'https://food.universeorder.co.in/api' && styles.serverOptionTitleActive]}>
                    🌐 Live Production
                  </Text>
                  <Text style={styles.serverOptionSub}>food.universeorder.co.in</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.serverOption, currentServer.includes('uat.food') && styles.serverOptionActive]}
                  onPress={() => handleSelectServer('uat')}
                >
                  <Text style={[styles.serverOptionTitle, currentServer.includes('uat.food') && styles.serverOptionTitleActive]}>
                    🧪 UAT Testing
                  </Text>
                  <Text style={styles.serverOptionSub}>uat.food.universeorder.co.in</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.serverOption, (!currentServer.includes('universeorder.co.in')) && styles.serverOptionActive]}
                  onPress={() => handleSelectServer('local')}
                >
                  <Text style={[styles.serverOptionTitle, (!currentServer.includes('universeorder.co.in')) && styles.serverOptionTitleActive]}>
                    💻 Local Laptop
                  </Text>
                  <Text style={styles.serverOptionSub}>http://{customIp}:5000</Text>
                </TouchableOpacity>

                <View style={styles.ipInputRow}>
                  <Text style={styles.ipLabel}>IP:</Text>
                  <TextInput 
                    style={styles.ipInput}
                    value={customIp}
                    onChangeText={setCustomIp}
                    placeholder="10.36.97.59"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    style={styles.saveIpBtn}
                    onPress={() => handleSelectServer('local')}
                  >
                    <Text style={styles.saveIpText}>Use</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Light background
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 36,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  gradientButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  serverContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  serverDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  serverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  serverMenu: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverMenuLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  serverOption: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverOptionActive: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
  },
  serverOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  serverOptionTitleActive: {
    color: '#EA580C',
  },
  serverOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  ipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ipLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  ipInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#0F172A',
  },
  saveIpBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveIpText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
