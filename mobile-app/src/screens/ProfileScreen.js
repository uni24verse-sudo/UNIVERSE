import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statsTab, setStatsTab] = useState('today'); // 'today' | 'total'
  const [storeName, setStoreName] = useState('');

  // Role check: employees must not see financial/revenue figures
  const isEmployee = user?.role === 'employee';

  const fetchData = useCallback(async (isPull = false) => {
    if (!user) return;
    try {
      if (isPull) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const storeId = user?.storeId || user?.id;

      // 1. Fetch store info
      try {
        const storeRes = await apiClient.get('/store/my-stores');
        if (storeRes.data && storeRes.data.length > 0) {
          setStoreName(storeRes.data[0].name || '');
        }
      } catch (e) {
        console.log('Store fetch error:', e.message);
      }

      // 2. Fetch orders for stats if vendor / cart owner
      if (!isEmployee && storeId) {
        try {
          const ordersRes = await apiClient.get(`/orders/${storeId}/vendor-orders`);
          setOrders(ordersRes.data || []);
        } catch (e) {
          console.log('Orders fetch error:', e.message);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isEmployee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute Today & Total Stall Statistics
  const stallStats = useMemo(() => {
    const todayStr = new Date().toDateString();

    let todayCompletedCount = 0;
    let todayGross = 0;
    let totalCompletedCount = 0;
    let totalGross = 0;
    let todayCancelledCount = 0;
    let totalCancelledCount = 0;

    orders.forEach((o) => {
      const isCompleted = o.status === 'Completed';
      const isCancelled = o.status === 'Cancelled';
      const orderDateStr = o.createdAt ? new Date(o.createdAt).toDateString() : '';
      const isToday = orderDateStr === todayStr;
      const amt = Number(o.totalAmount) || 0;

      if (isCompleted) {
        totalCompletedCount += 1;
        totalGross += amt;
        if (isToday) {
          todayCompletedCount += 1;
          todayGross += amt;
        }
      } else if (isCancelled) {
        totalCancelledCount += 1;
        if (isToday) {
          todayCancelledCount += 1;
        }
      }
    });

    // Standard 5% deduction (3% UniVerse Platform + 2% Payment Gateway) -> 95% Net Payout
    const todayNet = Math.round(todayGross * 0.95);
    const totalNet = Math.round(totalGross * 0.95);
    const todayAov = todayCompletedCount > 0 ? Math.round(todayGross / todayCompletedCount) : 0;
    const totalAov = totalCompletedCount > 0 ? Math.round(totalGross / totalCompletedCount) : 0;

    return {
      today: {
        completedCount: todayCompletedCount,
        gross: todayGross,
        net: todayNet,
        aov: todayAov,
        cancelledCount: todayCancelledCount,
      },
      total: {
        completedCount: totalCompletedCount,
        gross: totalGross,
        net: totalNet,
        aov: totalAov,
        cancelledCount: totalCancelledCount,
      },
    };
  }, [orders]);

  if (!user) return null;

  const isToday = statsTab === 'today';
  const currentData = isToday ? stallStats.today : stallStats.total;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchData(true)} 
            colors={['#3B82F6']} 
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Stall Profile</Text>
            <Text style={styles.subtitle}>Account & Performance Center</Text>
          </View>
          <View style={[styles.roleBadge, isEmployee ? styles.employeeBadge : styles.vendorBadge]}>
            <Ionicons 
              name={isEmployee ? 'shield' : 'storefront'} 
              size={13} 
              color={isEmployee ? '#7E22CE' : '#2563EB'} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.roleBadgeText, isEmployee ? styles.employeeBadgeText : styles.vendorBadgeText]}>
              {isEmployee ? 'STAFF' : 'CART OWNER'}
            </Text>
          </View>
        </View>

        {/* User & Stall Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="person-circle-outline" size={20} color="#64748B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Account Name</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardRow}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </View>

          {storeName ? (
            <>
              <View style={styles.cardDivider} />
              <View style={styles.cardRow}>
                <Ionicons name="storefront-outline" size={20} color="#64748B" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.label}>Assigned Stall</Text>
                  <Text style={styles.value}>{storeName}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* =================================================== */}
        {/* STALL PERFORMANCE DASHBOARD (VENDOR ONLY) */}
        {/* =================================================== */}
        {!isEmployee ? (
          <View style={styles.statsCard}>
            {/* Dashboard Header with Mode Switcher */}
            <View style={styles.statsHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bar-chart" size={18} color="#3B82F6" />
                  <Text style={styles.statsTitle}>Stall Performance</Text>
                </View>
                <Text style={styles.statsSub}>
                  {isToday ? "Today's settlement & revenue" : 'All-time lifetime performance'}
                </Text>
              </View>

              {/* Pill Toggle: Today vs Total */}
              <View style={styles.togglePill}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, isToday && styles.toggleBtnActive]}
                  onPress={() => setStatsTab('today')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleText, isToday && styles.toggleTextActive]}>
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, !isToday && styles.toggleBtnActive]}
                  onPress={() => setStatsTab('total')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleText, !isToday && styles.toggleTextActive]}>
                    Total
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading && orders.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={{ marginTop: 8, color: '#64748B', fontSize: 12 }}>Loading analytics...</Text>
              </View>
            ) : (
              <View style={styles.metricsWrapper}>
                {/* Primary Row: Gross Sales & Net Payout */}
                <View style={styles.primaryRow}>
                  {/* Gross Sales */}
                  <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                    <Text style={styles.metricLabel}>
                      {isToday ? "Today's Gross" : 'Total Gross'}
                    </Text>
                    <Text style={styles.metricValue}>
                      ₹{currentData.gross.toLocaleString()}
                    </Text>
                    <View style={styles.comparisonChip}>
                      <Text style={styles.comparisonText}>
                        {isToday 
                          ? `Lifetime: ₹${stallStats.total.gross.toLocaleString()}` 
                          : `Today: ₹${stallStats.today.gross.toLocaleString()}`}
                      </Text>
                    </View>
                  </View>

                  {/* Net Payout (95%) */}
                  <View style={[styles.metricCard, { borderLeftColor: '#10B981', backgroundColor: '#F0FDF4' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.metricLabel, { color: '#047857' }]}>
                        {isToday ? 'Est. Net Payout' : 'Total Net Payout'}
                      </Text>
                      <View style={styles.deductionTag}>
                        <Text style={styles.deductionTagText}>-5%</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: '#047857' }]}>
                      ₹{currentData.net.toLocaleString()}
                    </Text>
                    <Text style={styles.metricHint}>
                      After 3% UniVerse + 2% PG
                    </Text>
                  </View>
                </View>

                {/* Secondary Row: Fulfilled, AOV, Cancelled */}
                <View style={styles.secondaryRow}>
                  <View style={styles.miniCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.miniLabel}>Fulfilled</Text>
                    </View>
                    <Text style={styles.miniValue}>{currentData.completedCount}</Text>
                    <Text style={styles.miniSub}>
                      {isToday ? `Total: ${stallStats.total.completedCount}` : `Today: ${stallStats.today.completedCount}`}
                    </Text>
                  </View>

                  <View style={styles.miniCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Ionicons name="pricetag" size={14} color="#6366F1" />
                      <Text style={styles.miniLabel}>Avg Order</Text>
                    </View>
                    <Text style={styles.miniValue}>₹{currentData.aov}</Text>
                    <Text style={styles.miniSub}>Per ticket</Text>
                  </View>

                  <View style={styles.miniCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                      <Text style={styles.miniLabel}>Cancelled</Text>
                    </View>
                    <Text style={[styles.miniValue, { color: currentData.cancelledCount > 0 ? '#EF4444' : '#64748B' }]}>
                      {currentData.cancelledCount}
                    </Text>
                    <Text style={styles.miniSub}>Orders</Text>
                  </View>
                </View>

                {/* Fixed Settlement Notice */}
                <View style={styles.noticeBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.noticeText}>
                    Daily settlements process automatically at T+1 with a fixed 5% deduction (3% UniVerse + 2% PG).
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* Employee Restricted Privacy Card */
          <View style={styles.employeeCard}>
            <Ionicons name="shield-checkmark" size={24} color="#7E22CE" style={{ marginBottom: 8 }} />
            <Text style={styles.employeeCardTitle}>Kitchen Operations Account</Text>
            <Text style={styles.employeeCardText}>
              You are logged in with employee permissions. Financial statistics and revenue summaries are restricted to the Cart Owner.
            </Text>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout of Stall</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>UNIVERSE Vendor OS • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  vendorBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  vendorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  employeeBadge: {
    backgroundColor: '#FAF5FF',
  },
  employeeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },

  /* Stats Card Styles */
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statsSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  metricsWrapper: {
    gap: 12,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  metricHint: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  comparisonChip: {
    marginTop: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  comparisonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  deductionTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  deductionTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  miniSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  /* Employee Card */
  employeeCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  employeeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 6,
  },
  employeeCardText: {
    fontSize: 12,
    color: '#6B21A8',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Logout */
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
  },
  footerText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
