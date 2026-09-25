import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import apiClient from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIME_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

const SETTLEMENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

export default function AnalyticsScreen() {
  const { user, stores, activeStore, switchActiveStore } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const isFocused = useIsFocused();
  const [mainTab, setMainTab] = useState('insights'); // 'insights' | 'settlements'
  const [orders, setOrders] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState('today');
  const [settlementFilter, setSettlementFilter] = useState('all');
  const [showPrevBreakup, setShowPrevBreakup] = useState(false);
  const [expandedSettlementIds, setExpandedSettlementIds] = useState({});
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders'

  const isEmployee = user?.role === 'employee' || user?.role === 'staff';
  const currentStoreId = activeStore?._id || activeStore?.id || user?.storeId || user?.id;

  // ---------------------------------------------------------
  // Fetch Analytics & Finance Data (Scoped to active stall)
  // ---------------------------------------------------------
  const fetchAllData = useCallback(async (isPull = false) => {
    if (!user || !currentStoreId) return;
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      // 1. Set store name
      setStoreName(activeStore?.name || '');

      // 2. Fetch vendor orders for performance & insights
      try {
        const res = await apiClient.get(`/orders/${currentStoreId}/vendor-orders`);
        setOrders(res.data || []);
      } catch (e) {
        console.log('Orders fetch error:', e.message);
      }

      // 3. Fetch finance / settlements data (vendor only)
      if (!isEmployee) {
        try {
          setLoadingFinance(true);
          const finRes = await apiClient.get(`/finance/my-settlements/${currentStoreId}`);
          setFinanceData(finRes.data);
        } catch (e) {
          console.log('Finance fetch error:', e.message);
        } finally {
          setLoadingFinance(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics & settlements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentStoreId, activeStore, isEmployee]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Refetch latest analytics whenever tab is focused
  useEffect(() => {
    if (isFocused && currentStoreId) {
      fetchAllData();
    }
  }, [isFocused, currentStoreId, fetchAllData]);

  // Real-time socket listeners for instant order & revenue analytics updates
  useEffect(() => {
    if (!socket || !currentStoreId) return;

    const handleNewOrder = (newOrder) => {
      if (String(newOrder.storeId) === String(currentStoreId)) {
        setOrders((prev) => {
          if (prev.some((o) => (o._id || o.id) === (newOrder._id || newOrder.id))) return prev;
          return [newOrder, ...prev];
        });
        if (!isEmployee) {
          apiClient
            .get(`/finance/my-settlements/${currentStoreId}`)
            .then((res) => setFinanceData(res.data))
            .catch(() => {});
        }
      }
    };

    const handleStatusUpdate = (updatedOrder) => {
      if (String(updatedOrder.storeId) === String(currentStoreId)) {
        setOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === (updatedOrder._id || updatedOrder.id) ? { ...o, ...updatedOrder } : o
          )
        );
        if (!isEmployee && ['Completed', 'Delivered', 'Cancelled'].includes(updatedOrder.status)) {
          apiClient
            .get(`/finance/my-settlements/${currentStoreId}`)
            .then((res) => setFinanceData(res.data))
            .catch(() => {});
        }
      }
    };

    const handleCancelled = (cancelledOrder) => {
      if (String(cancelledOrder.storeId) === String(currentStoreId)) {
        setOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === (cancelledOrder._id || cancelledOrder.id) ? { ...o, ...cancelledOrder } : o
          )
        );
        if (!isEmployee) {
          apiClient
            .get(`/finance/my-settlements/${currentStoreId}`)
            .then((res) => setFinanceData(res.data))
            .catch(() => {});
        }
      }
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('order_cancelled', handleCancelled);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_cancelled', handleCancelled);
    };
  }, [socket, currentStoreId, isEmployee]);

  // Toggle individual settlement card breakup
  const toggleSettlementBreakup = (id) => {
    setExpandedSettlementIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter orders by selected time range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (selectedRange === 'today') {
        return orderDate >= todayStart;
      } else if (selectedRange === 'yesterday') {
        return orderDate >= yesterdayStart && orderDate < todayStart;
      } else if (selectedRange === 'week') {
        return orderDate >= weekStart;
      } else if (selectedRange === 'month') {
        return orderDate >= monthStart;
      }
      return true; // 'all'
    });
  }, [orders, selectedRange]);

  // Calculate Key Performance Indicators
  const stats = useMemo(() => {
    let completedCount = 0;
    let cancelledCount = 0;
    let grossRevenue = 0;
    const itemMap = {};

    // Operating Timeline (8:00 AM to 11:00 PM in 2-hour blocks) with meal context tags
    const operatingSlots = [
      { start: 8, label: '8 AM', tag: 'Breakfast', bucketKey: '08:00' },
      { start: 10, label: '10 AM', tag: 'Brunch', bucketKey: '10:00' },
      { start: 12, label: '12 PM', tag: 'Lunch', bucketKey: '12:00' },
      { start: 14, label: '2 PM', tag: 'Afternoon', bucketKey: '14:00' },
      { start: 16, label: '4 PM', tag: 'Snacks', bucketKey: '16:00' },
      { start: 18, label: '6 PM', tag: 'Evening', bucketKey: '18:00' },
      { start: 20, label: '8 PM', tag: 'Dinner', bucketKey: '20:00' },
      { start: 22, label: '10 PM', tag: 'Late Night', bucketKey: '22:00' },
    ];

    const hourlyMap = {};
    operatingSlots.forEach((s) => {
      hourlyMap[s.bucketKey] = { label: s.label, orders: 0, revenue: 0 };
    });

    filteredOrders.forEach((o) => {
      const isCompleted = o.status === 'Completed';
      const isCancelled = o.status === 'Cancelled';
      const amt = Number(o.totalAmount) || 0;

      if (isCompleted) {
        completedCount += 1;
        grossRevenue += amt;

        const orderDate = new Date(o.createdAt);
        const hour = orderDate.getHours();

        // Operating hourly bucket aggregation
        const bucketHour = Math.floor(hour / 2) * 2;
        const bucketKey = `${bucketHour.toString().padStart(2, '0')}:00`;
        if (hourlyMap[bucketKey]) {
          hourlyMap[bucketKey].orders += 1;
          hourlyMap[bucketKey].revenue += amt;
        } else if (hour < 8) {
          hourlyMap['08:00'].orders += 1;
          hourlyMap['08:00'].revenue += amt;
        } else if (hour >= 22) {
          hourlyMap['22:00'].orders += 1;
          hourlyMap['22:00'].revenue += amt;
        }

        // Top items aggregation
        if (Array.isArray(o.items)) {
          o.items.forEach((item) => {
            const name = (item.name || 'Custom Item').trim();
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            if (!itemMap[name]) {
              itemMap[name] = { name, quantity: 0, revenue: 0 };
            }
            itemMap[name].quantity += qty;
            itemMap[name].revenue += qty * price;
          });
        }
      } else if (isCancelled) {
        cancelledCount += 1;
      }
    });

    const totalOrders = completedCount + cancelledCount;
    const fulfillmentRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;
    const netPayout = Math.round(grossRevenue * 0.95); // 5% total deduction (3% platform + 2% PG)
    const platformFee = Math.round(grossRevenue * 0.03);
    const pgFee = Math.round(grossRevenue * 0.02);
    const aov = completedCount > 0 ? Math.round(grossRevenue / completedCount) : 0;

    // Top 5 selling items sorted by quantity
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Hourly chart data (active operating slots)
    const chartBars = operatingSlots.map((s) => ({
      key: s.bucketKey,
      label: s.label,
      tag: s.tag,
      orders: hourlyMap[s.bucketKey].orders,
      revenue: hourlyMap[s.bucketKey].revenue,
    }));

    const maxChartOrders = Math.max(...chartBars.map((b) => b.orders), 0);
    const maxChartRevenue = Math.max(...chartBars.map((b) => b.revenue), 0);

    // Identify the peak rush slot
    let peakSlot = null;
    let maxMetric = 0;
    chartBars.forEach((bar) => {
      const val = isEmployee ? bar.orders : bar.revenue;
      if (val > maxMetric) {
        maxMetric = val;
        peakSlot = bar;
      }
    });

    return {
      completedCount,
      cancelledCount,
      totalOrders,
      fulfillmentRate,
      grossRevenue,
      netPayout,
      platformFee,
      pgFee,
      aov,
      topItems,
      chartBars,
      maxChartOrders,
      maxChartRevenue,
      peakSlot,
    };
  }, [filteredOrders, isEmployee]);

  // Filtered settlements list
  const filteredSettlements = useMemo(() => {
    if (!financeData || !Array.isArray(financeData.settlements)) return [];
    if (settlementFilter === 'all') return financeData.settlements;
    return financeData.settlements.filter(
      (s) => (s.status || '').toLowerCase() === settlementFilter.toLowerCase()
    );
  }, [financeData, settlementFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* =================================================== */}
      {/* HEADER SECTION                                      */}
      {/* =================================================== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Analytics & Payouts</Text>
          <View style={styles.storeBadge}>
            <Ionicons name="storefront" size={13} color="#EF4123" style={{ marginRight: 5 }} />
            <Text style={styles.storeName}>{storeName || 'UniVerse Kitchen'}</Text>
          </View>
        </View>

        {/* Top Segmented Sub-Tab Switcher */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, mainTab === 'insights' && styles.segmentBtnActive]}
            onPress={() => setMainTab('insights')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bar-chart"
              size={14}
              color={mainTab === 'insights' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, mainTab === 'insights' && styles.segmentBtnTextActive]}>
              Insights & Sales
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mainTab === 'settlements' && styles.segmentBtnActive]}
            onPress={() => setMainTab('settlements')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="card"
              size={14}
              color={mainTab === 'settlements' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, mainTab === 'settlements' && styles.segmentBtnTextActive]}>
              Payout Settlements
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Range Pills (Only visible under Insights tab) */}
        {mainTab === 'insights' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeScroll}
          >
            {TIME_RANGES.map((range) => {
              const isSelected = selectedRange === range.key;
              return (
                <TouchableOpacity
                  key={range.key}
                  style={[styles.rangePill, isSelected && styles.rangePillActive]}
                  onPress={() => setSelectedRange(range.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.rangePillText, isSelected && styles.rangePillTextActive]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAllData(true)}
            colors={['#EF4123']}
          />
        }
      >
        {/* =================================================== */}
        {/* SUB-TAB 1: INSIGHTS & PERFORMANCE                   */}
        {/* =================================================== */}
        {mainTab === 'insights' && (
          <>
            {loading && orders.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EF4123" />
                <Text style={styles.loadingText}>Computing analytics & charts...</Text>
              </View>
            ) : (
              <>
                {/* FINANCIAL OVERVIEW CARD (OWNER ONLY) */}
                {!isEmployee ? (
                  <LinearGradient
                    colors={['#0F172A', '#1E293B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                  >
                    <View style={styles.heroTopRow}>
                      <View>
                        <Text style={styles.heroLabel}>ESTIMATED NET PAYOUT</Text>
                        <Text style={styles.heroAmount}>₹{stats.netPayout.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.deductionBadge}>
                        <Text style={styles.deductionBadgeText}>95% Net</Text>
                      </View>
                    </View>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroBreakdownRow}>
                      <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Gross Sales</Text>
                        <Text style={styles.heroMetricValue}>₹{stats.grossRevenue.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Avg Ticket (AOV)</Text>
                        <Text style={styles.heroMetricValue}>₹{stats.aov}</Text>
                      </View>
                      <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Platform + PG (5%)</Text>
                        <Text style={[styles.heroMetricValue, { color: '#F87171' }]}>
                          -₹{(stats.platformFee + stats.pgFee).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                ) : (
                  /* Employee Mode Notice */
                  <View style={styles.employeeNoticeCard}>
                    <Ionicons name="restaurant" size={24} color="#7E22CE" style={{ marginBottom: 6 }} />
                    <Text style={styles.employeeNoticeTitle}>Kitchen Operational Performance</Text>
                    <Text style={styles.employeeNoticeSub}>
                      Showing preparation volumes, rush hour trends, and top cooked items for kitchen staff.
                    </Text>
                  </View>
                )}

                {/* 3 KPI SUMMARY CARDS */}
                <View style={styles.kpiRow}>
                  {/* Fulfilled Orders */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiIconBox}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                    <Text style={styles.kpiValue}>{stats.completedCount}</Text>
                    <Text style={styles.kpiLabel}>
                      {isEmployee ? 'Dishes Cooked' : 'Fulfilled Orders'}
                    </Text>
                  </View>

                  {/* Fulfillment Rate */}
                  <View style={styles.kpiCard}>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="trending-up" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.kpiValue}>{stats.fulfillmentRate}%</Text>
                    <Text style={styles.kpiLabel}>Success Rate</Text>
                  </View>

                  {/* Cancelled */}
                  <View style={styles.kpiCard}>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </View>
                    <Text style={[styles.kpiValue, stats.cancelledCount > 0 && { color: '#EF4444' }]}>
                      {stats.cancelledCount}
                    </Text>
                    <Text style={styles.kpiLabel}>Cancelled</Text>
                  </View>
                </View>

                {/* SINGLE INTEGRATED HOURLY SALES & RUSH GRAPH */}
                <View style={styles.chartCard}>
                  {/* Card Header with Title and Metric Switcher */}
                  <View style={styles.chartHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.chartTitle}>
                        {isEmployee ? 'Hourly Kitchen Load' : 'Hourly Sales & Rush Windows'}
                      </Text>
                      <Text style={styles.chartSubtitle}>
                        Operating timeline (8:00 AM – 11:00 PM)
                      </Text>
                    </View>

                    {/* Metric Switcher Pill (Cart Owner) */}
                    {!isEmployee ? (
                      <View style={styles.metricSwitcher}>
                        <TouchableOpacity
                          style={[
                            styles.metricBtn,
                            chartMetric === 'revenue' && styles.metricBtnActive,
                          ]}
                          onPress={() => setChartMetric('revenue')}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.metricBtnText,
                              chartMetric === 'revenue' && styles.metricBtnTextActive,
                            ]}
                          >
                            ₹ Sales
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.metricBtn,
                            chartMetric === 'orders' && styles.metricBtnActive,
                          ]}
                          onPress={() => setChartMetric('orders')}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.metricBtnText,
                              chartMetric === 'orders' && styles.metricBtnTextActive,
                            ]}
                          >
                            Orders
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.chartIndicator}>
                        <View style={styles.indicatorDot} />
                        <Text style={styles.indicatorText}>Dishes Cooked</Text>
                      </View>
                    )}
                  </View>

                  {/* Peak Rush Info Callout inside the single graph card */}
                  {stats.peakSlot && (isEmployee ? stats.peakSlot.orders > 0 : stats.peakSlot.revenue > 0) ? (
                    <View style={styles.peakCalloutBanner}>
                      <View style={styles.peakCalloutLeft}>
                        <Ionicons name="flame" size={15} color="#EF4123" style={{ marginRight: 6 }} />
                        <Text style={styles.peakCalloutText}>
                          Busiest Rush:{' '}
                          <Text style={styles.peakCalloutBold}>
                            {stats.peakSlot.label} ({stats.peakSlot.tag})
                          </Text>
                        </Text>
                      </View>
                      <Text style={styles.peakCalloutMetric}>
                        {isEmployee
                          ? `${stats.peakSlot.orders} dishes`
                          : `₹${stats.peakSlot.revenue.toLocaleString()} • ${stats.peakSlot.orders} orders`}
                      </Text>
                    </View>
                  ) : null}

                  {/* Empty state when 0 orders in range */}
                  {((isEmployee || chartMetric === 'orders')
                    ? stats.maxChartOrders
                    : stats.maxChartRevenue) === 0 ? (
                    <View style={styles.emptyChartBox}>
                      <Ionicons name="time-outline" size={32} color="#CBD5E1" />
                      <Text style={styles.emptyChartTitle}>No Rush Hour Activity Yet</Text>
                      <Text style={styles.emptyChartSub}>
                        Hourly sales and peak rush will plot here automatically throughout the day (8:00 AM – 11:00 PM).
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.barChartScroll}
                    >
                      {stats.chartBars.map((bar, index) => {
                        const isOrders = isEmployee || chartMetric === 'orders';
                        const val = isOrders ? bar.orders : bar.revenue;
                        const maxVal = isOrders ? stats.maxChartOrders : stats.maxChartRevenue;
                        const heightPercent = maxVal > 0 ? Math.max(Math.round((val / maxVal) * 100), 4) : 4;
                        const isPeak = maxVal > 0 && val === maxVal && val > 0;

                        return (
                          <View key={bar.key || index} style={styles.barCol}>
                            {/* Value Label above Bar (never clipped or truncated) */}
                            <View style={styles.barValueContainer}>
                              {val > 0 ? (
                                <View style={[styles.barValuePill, isPeak && styles.barValuePillPeak]}>
                                  <Text style={[styles.barValueText, isPeak && styles.barPeakText]}>
                                    {isOrders
                                      ? val
                                      : val >= 1000
                                      ? `₹${(val / 1000).toFixed(1)}k`
                                      : `₹${val}`}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Bar Track */}
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  { height: `${heightPercent}%` },
                                  val === 0 && { height: 4, backgroundColor: '#E2E8F0' },
                                  isPeak && styles.barPeakFill,
                                ]}
                              />
                            </View>

                            {/* Time & Shift Labels */}
                            <Text style={[styles.barLabel, isPeak && styles.barPeakLabel]}>
                              {bar.label}
                            </Text>
                            <Text style={[styles.barSubTag, isPeak && styles.barPeakSubTag]}>
                              {bar.tag}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* TOP SELLING DISHES RANKING */}
                <View style={styles.rankingCard}>
                  <View style={styles.rankingHeader}>
                    <Ionicons name="trophy" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.rankingTitle}>
                      {isEmployee ? 'Top Cooked Dishes' : 'Top Selling Dishes'}
                    </Text>
                  </View>

                  {stats.topItems.length === 0 ? (
                    <View style={styles.emptyItemsBox}>
                      <Ionicons name="fast-food-outline" size={32} color="#CBD5E1" />
                      <Text style={styles.emptyItemsText}>No completed orders for this time range</Text>
                    </View>
                  ) : (
                    stats.topItems.map((item, idx) => {
                      const maxQty = stats.topItems[0]?.quantity || 1;
                      const barWidth = Math.max(Math.round((item.quantity / maxQty) * 100), 8);

                      return (
                        <View key={idx} style={styles.rankingItemRow}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>#{idx + 1}</Text>
                          </View>

                          <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <View style={styles.itemTopLine}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.itemQty}>{item.quantity} sold</Text>
                            </View>

                            <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, { width: `${barWidth}%` }]} />
                            </View>
                          </View>

                          {!isEmployee && (
                            <Text style={styles.itemRevenue}>
                              ₹{item.revenue.toLocaleString('en-IN')}
                            </Text>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                {/* SETTLEMENT POLICY NOTICE (OWNER ONLY) */}
                {!isEmployee && (
                  <View style={styles.settlementCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="card-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.settlementTitle}>Settlement Terms & Direct Payouts</Text>
                    </View>
                    <View style={styles.settlementRow}>
                      <Text style={styles.settlementLabel}>Payout Schedule</Text>
                      <Text style={styles.settlementValue}>Next Day (T+1) Automated</Text>
                    </View>
                    <View style={styles.settlementRow}>
                      <Text style={styles.settlementLabel}>UniVerse Platform Fee</Text>
                      <Text style={styles.settlementValue}>3.0%</Text>
                    </View>
                    <View style={styles.settlementRow}>
                      <Text style={styles.settlementLabel}>Payment Gateway Fee</Text>
                      <Text style={styles.settlementValue}>2.0%</Text>
                    </View>
                    <View style={[styles.settlementRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.settlementLabel, { fontWeight: '800', color: '#0F172A' }]}>
                        Total Net Vendor Settlement
                      </Text>
                      <Text style={[styles.settlementValue, { color: '#10B981', fontWeight: '900' }]}>
                        95.0%
                      </Text>
                    </View>

                    <View style={styles.settlementInfoBox}>
                      <Ionicons name="information-circle" size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.settlementInfoText}>
                        Settlements are calculated daily after midnight. Funds are transferred directly to your registered bank account via automated IMPS/NEFT batches.
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* =================================================== */}
        {/* SUB-TAB 2: FULL SETTLEMENTS & PAYOUTS LEDGER        */}
        {/* =================================================== */}
        {mainTab === 'settlements' && (
          <>
            {isEmployee ? (
              <View style={styles.employeeNoticeCard}>
                <Ionicons name="lock-closed" size={32} color="#7E22CE" style={{ marginBottom: 10 }} />
                <Text style={styles.employeeNoticeTitle}>Financial Access Restricted</Text>
                <Text style={styles.employeeNoticeSub}>
                  Payout records, bank transfers, and financial settlements are strictly accessible to the Cart Owner account only.
                </Text>
              </View>
            ) : loadingFinance && !financeData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EF4123" />
                <Text style={styles.loadingText}>Retrieving bank settlements & ledger...</Text>
              </View>
            ) : (
              <>
                {/* Active Settlement Schedule Banner */}
                <View style={styles.activeScheduleBanner}>
                  <View style={styles.schedulePulseDot} />
                  <Text style={styles.scheduleBannerText}>
                    Active settlement schedule: <Text style={{ fontWeight: '900', color: '#0F172A' }}>Next Day (T+1)</Text>
                  </Text>
                </View>

                {/* OVERVIEW CARDS (PREVIOUS, NEXT, LIVE UNSETTLED) */}
                <View style={styles.financeOverviewWrapper}>
                  {/* Card 1: Previous Settlement */}
                  <View style={styles.financeOverviewCard}>
                    <View style={styles.finCardHeader}>
                      <View style={[styles.finIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.finCardTitle}>Previous settlement</Text>
                        <Text style={styles.finCardSub}>
                          {financeData?.previousSettlement?.paidAt
                            ? `Deposited on ${new Date(financeData.previousSettlement.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'No previous settlements yet'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.finCardAmount}>
                      ₹{financeData?.previousSettlement ? Number(financeData.previousSettlement.netPayable).toFixed(2) : '0.00'}
                    </Text>

                    {financeData?.previousSettlement && (
                      <TouchableOpacity
                        style={styles.breakupToggleBtn}
                        onPress={() => setShowPrevBreakup(!showPrevBreakup)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.breakupToggleText}>
                          Amount breakup {showPrevBreakup ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {showPrevBreakup && financeData?.previousSettlement && (
                      <View style={styles.breakupBox}>
                        <View style={styles.breakupRow}>
                          <Text style={styles.breakupLabel}>Gross Sales:</Text>
                          <Text style={styles.breakupValue}>
                            ₹{Number(financeData.previousSettlement.totalRevenue || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.breakupRow}>
                          <Text style={styles.breakupLabel}>Gateway Fee (2%):</Text>
                          <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                            -₹{Number(financeData.previousSettlement.feesBreakdown?.gatewayFee || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.breakupRow}>
                          <Text style={styles.breakupLabel}>Platform Fee (3%):</Text>
                          <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                            -₹{Number(financeData.previousSettlement.feesBreakdown?.platformProfit || 0).toFixed(2)}
                          </Text>
                        </View>
                        {Number(financeData.previousSettlement.feesBreakdown?.cancellationPenalty || 0) > 0 && (
                          <View style={styles.breakupRow}>
                            <Text style={styles.breakupLabel}>Cancellation Penalty:</Text>
                            <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                              -₹{Number(financeData.previousSettlement.feesBreakdown.cancellationPenalty).toFixed(2)}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.breakupRow, styles.breakupTotalRow]}>
                          <Text style={styles.breakupTotalLabel}>Net Deposited:</Text>
                          <Text style={styles.breakupTotalValue}>
                            ₹{Number(financeData.previousSettlement.netPayable || 0).toFixed(2)}
                          </Text>
                        </View>
                        {financeData.previousSettlement.utrNumber ? (
                          <Text style={styles.utrText}>
                            UTR Reference: {financeData.previousSettlement.utrNumber}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* Card 2: Next Settlement */}
                  <View style={styles.financeOverviewCard}>
                    <View style={styles.finCardHeader}>
                      <View style={[styles.finIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                        <Ionicons name="time" size={18} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.finCardTitle}>Next settlement</Text>
                        <Text style={styles.finCardSub}>
                          {financeData?.nextSettlement?.periodEnd
                            ? `Pending for period ending ${new Date(financeData.nextSettlement.periodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
                            : 'Pending midnight batch'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.finCardAmount}>
                      ₹{financeData?.nextSettlement ? Number(financeData.nextSettlement.netPayable).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={styles.finCardHint}>
                      Automated deposit processed by next business day
                    </Text>
                  </View>

                  {/* Card 3: Live Unsettled Balance */}
                  <View style={[styles.financeOverviewCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
                    <View style={styles.finCardHeader}>
                      <View style={[styles.finIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                        <Ionicons name="cash" size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.finCardTitle}>Live unsettled balance</Text>
                        <Text style={styles.finCardSub}>Today's completed orders</Text>
                      </View>
                    </View>

                    <Text style={[styles.finCardAmount, { color: '#D97706' }]}>
                      ₹{Number(financeData?.liveUnsettledBalance || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.finCardHint}>
                      Gross: ₹{Number(financeData?.liveUnsettledRevenue || 0).toFixed(2)} (cleared after midnight)
                    </Text>
                  </View>
                </View>

                {/* SETTLEMENTS LEDGER SECTION */}
                <View style={styles.ledgerCard}>
                  <View style={styles.ledgerHeader}>
                    <Text style={styles.ledgerTitle}>Settlement Statements</Text>
                  </View>

                  {/* Status Filters */}
                  <View style={styles.filterRow}>
                    {SETTLEMENT_FILTERS.map((f) => {
                      const isSelected = settlementFilter === f.key;
                      return (
                        <TouchableOpacity
                          key={f.key}
                          style={[styles.filterChip, isSelected && styles.filterChipActive]}
                          onPress={() => setSettlementFilter(f.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Settlements List */}
                  {filteredSettlements.length === 0 ? (
                    <View style={styles.emptySettlementsBox}>
                      <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
                      <Text style={styles.emptySettlementsTitle}>No settlements found</Text>
                      <Text style={styles.emptySettlementsSub}>
                        {settlementFilter === 'all'
                          ? 'Settlement statements will appear here after orders are completed and cleared in the daily T+1 batch.'
                          : `No ${settlementFilter} settlements on record.`}
                      </Text>
                    </View>
                  ) : (
                    filteredSettlements.map((s) => {
                      const isExpanded = Boolean(expandedSettlementIds[s.id || s._id]);
                      const isCompleted = (s.status || '').toLowerCase() === 'completed';
                      const isPending = (s.status || '').toLowerCase() === 'pending';
                      const isFailed = (s.status || '').toLowerCase() === 'failed';

                      const periodStartStr = s.periodStart
                        ? new Date(s.periodStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                        : 'Start';
                      const periodEndStr = s.periodEnd
                        ? new Date(s.periodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'End';

                      return (
                        <View key={s.id || s._id} style={styles.settlementItemCard}>
                          <TouchableOpacity
                            style={styles.settlementItemTop}
                            onPress={() => toggleSettlementBreakup(s.id || s._id)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={styles.settlementIdText}>
                                  ID: {(s.id || s._id || '').substring(0, 10)}...
                                </Text>
                                {/* Status Chip */}
                                <View
                                  style={[
                                    styles.settlementStatusPill,
                                    isCompleted && styles.statusCompleted,
                                    isPending && styles.statusPending,
                                    isFailed && styles.statusFailed,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.settlementStatusText,
                                      isCompleted && styles.statusCompletedText,
                                      isPending && styles.statusPendingText,
                                      isFailed && styles.statusFailedText,
                                    ]}
                                  >
                                    {(s.status || 'Pending').toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.settlementPeriodText}>
                                {periodStartStr} → {periodEndStr}
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.settlementAmountText}>
                                ₹{Number(s.netPayable || 0).toFixed(2)}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                                <Text style={styles.viewDetailsText}>
                                  {isExpanded ? 'Hide' : 'Details'}
                                </Text>
                                <Ionicons
                                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={12}
                                  color="#2563EB"
                                />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Expanded Breakup */}
                          {isExpanded && (
                            <View style={styles.expandedBreakupBox}>
                              <View style={styles.breakupRow}>
                                <Text style={styles.breakupLabel}>Gross Sales:</Text>
                                <Text style={styles.breakupValue}>
                                  ₹{Number(s.totalRevenue || 0).toFixed(2)}
                                </Text>
                              </View>
                              <View style={styles.breakupRow}>
                                <Text style={styles.breakupLabel}>Payment Gateway (2%):</Text>
                                <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                                  -₹{Number(s.feesBreakdown?.gatewayFee || 0).toFixed(2)}
                                </Text>
                              </View>
                              <View style={styles.breakupRow}>
                                <Text style={styles.breakupLabel}>UniVerse Platform Fee (3%):</Text>
                                <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                                  -₹{Number(s.feesBreakdown?.platformProfit || 0).toFixed(2)}
                                </Text>
                              </View>
                              {Number(s.feesBreakdown?.cancellationPenalty || 0) > 0 && (
                                <View style={styles.breakupRow}>
                                  <Text style={styles.breakupLabel}>Cancellation Penalty:</Text>
                                  <Text style={[styles.breakupValue, { color: '#EF4444' }]}>
                                    -₹{Number(s.feesBreakdown.cancellationPenalty).toFixed(2)}
                                  </Text>
                                </View>
                              )}
                              <View style={[styles.breakupRow, styles.breakupTotalRow]}>
                                <Text style={styles.breakupTotalLabel}>Net Payout Amount:</Text>
                                <Text style={styles.breakupTotalValue}>
                                  ₹{Number(s.netPayable || 0).toFixed(2)}
                                </Text>
                              </View>
                              {s.utrNumber ? (
                                <View style={styles.utrBox}>
                                  <Ionicons name="finger-print" size={13} color="#475569" style={{ marginRight: 4 }} />
                                  <Text style={styles.utrText}>Bank UTR: {s.utrNumber}</Text>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  ownerBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  ownerBadgeText: {
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

  /* Segmented Sub-Tab Switcher */
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Time Range Pills */
  rangeScroll: {
    gap: 8,
  },
  rangePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rangePillActive: {
    backgroundColor: '#EF4123',
    borderColor: '#EF4123',
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  rangePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Hero Net Payout Card */
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  deductionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  deductionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#34D399',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 16,
  },
  heroBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroMetricCol: {
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 3,
  },
  heroMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Employee Notice */
  employeeNoticeCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    alignItems: 'center',
    textAlign: 'center',
  },
  employeeNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 4,
  },
  employeeNoticeSub: {
    fontSize: 12,
    color: '#6B21A8',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* KPI Summary Cards */
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },

  /* Peak Callout Banner inside Graph Card */
  peakCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  peakCalloutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  peakCalloutText: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '700',
  },
  peakCalloutBold: {
    fontWeight: '900',
    color: '#C2410C',
  },
  peakCalloutMetric: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
  },

  /* Metric Switcher */
  metricSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
  },
  metricBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  metricBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  metricBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  metricBtnTextActive: {
    color: '#EF4123',
    fontWeight: '800',
  },

  /* Empty Chart State */
  emptyChartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyChartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptyChartSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 260,
  },

  /* Hourly Bar Chart */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chartIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4123',
    marginRight: 5,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  barChartScroll: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    gap: 12,
    alignItems: 'flex-end',
  },
  barCol: {
    alignItems: 'center',
    width: 54,
  },
  barValueContainer: {
    height: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  barValuePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  barValuePillPeak: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  barValueText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  barPeakText: {
    color: '#059669',
    fontWeight: '900',
  },
  barTrack: {
    height: 110,
    width: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#EF4123',
    borderRadius: 8,
  },
  barPeakFill: {
    backgroundColor: '#10B981',
  },
  barLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  barPeakLabel: {
    color: '#0F172A',
    fontWeight: '900',
  },
  barSubTag: {
    fontSize: 7.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  barPeakSubTag: {
    color: '#059669',
    fontWeight: '800',
  },

  /* Top Selling Dishes Ranking */
  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rankingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  rankingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
  },
  itemTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: '70%',
  },
  itemQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 3,
  },
  itemRevenue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 55,
    textAlign: 'right',
  },
  emptyItemsBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 6,
  },

  /* Settlement Terms Note */
  settlementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settlementTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settlementLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  settlementValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  settlementInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  settlementInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
  },

  /* ========================================================= */
  /* SETTLEMENTS TAB SPECIFIC STYLES                           */
  /* ========================================================= */
  activeScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 14,
  },
  schedulePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  scheduleBannerText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  financeOverviewWrapper: {
    gap: 12,
    marginBottom: 16,
  },
  financeOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  finCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  finIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  finCardSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  finCardAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  finCardHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  breakupToggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 3,
  },
  breakupToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  breakupBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakupLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  breakupValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakupTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: '#CBD5E1',
  },
  breakupTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakupTotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
  },
  utrText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
  },

  /* Ledger Section */
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  ledgerHeader: {
    marginBottom: 12,
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptySettlementsBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySettlementsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptySettlementsSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  settlementItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  settlementItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  settlementPeriodText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  settlementAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  settlementStatusPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  settlementStatusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statusCompletedText: {
    color: '#10B981',
  },
  statusPendingText: {
    color: '#D97706',
  },
  statusFailedText: {
    color: '#EF4444',
  },
  expandedBreakupBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  utrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveSyncText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
});
