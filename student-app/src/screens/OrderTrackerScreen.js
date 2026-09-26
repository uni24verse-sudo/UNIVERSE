import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  StatusBar,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useSocket } from '../context/SocketContext';
import { useSound } from '../context/SoundContext';
import apiClient from '../api/client';
import { shareOrder } from '../utils/shareHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_STEPS = [
  { key: 'Pending', label: 'Pending', desc: 'Vendor is reviewing your order' },
  { key: 'Confirmed', label: 'Confirmed', desc: 'Order confirmed! Waiting for kitchen to start' },
  { key: 'Cooking', label: 'Cooking', desc: 'Your food is sizzling hot in the kitchen!' },
  { key: 'Ready', label: 'Ready', desc: 'Order is ready for collection!' },
  { key: 'Completed', label: 'Completed', desc: 'Order handed over successfully' },
];

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    return deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0;
  });

  useEffect(() => {
    if (!deadline) return;
    setTimeLeft(Math.max(0, new Date(deadline).getTime() - Date.now()));

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(deadline).getTime() - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline && timeLeft <= 0) return null;
  if (deadline && timeLeft <= 0) {
    return (
      <View style={[styles.timerBadge, styles.urgentTimerBadge]}>
        <Feather name="clock" size={16} color="#EF4444" />
        <Text style={[styles.timerText, { color: '#EF4444' }]}>Timer Expired...</Text>
      </View>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = minutes === 0 && seconds < 60;

  return (
    <View style={[styles.timerBadge, isUrgent && styles.urgentTimerBadge]}>
      <Feather name="clock" size={16} color={isUrgent ? '#EF4444' : '#4F46E5'} />
      <Text style={[styles.timerText, isUrgent && { color: '#EF4444' }]}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>
    </View>
  );
};

const OrderTrackerScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route.params || {};
  const { socket, connected } = useSocket();
  const { playReadySound, playCompletedSound, playChime } = useSound();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundCard, setShowRefundCard] = useState(true);

  // Direct UPI Refund states
  const [customUpi, setCustomUpi] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  const previousStatusRef = useRef(null);

  const fetchOrder = useCallback(async (retryCount = 0) => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/orders/${id}`);
      setOrder(res.data);
      if (res.data?.status) {
        previousStatusRef.current = res.data.status;
      }
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404 && retryCount < 5) {
        console.log(`[OrderTracker] Order not found yet, retrying... (${retryCount + 1}/5)`);
        setTimeout(() => fetchOrder(retryCount + 1), 1000);
      } else {
        console.warn('Failed to fetch order:', err.message);
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !connected || !id) return;

    socket.emit('join_order_room', id.toString());
    if (order?._id) socket.emit('join_order_room', order._id.toString());
    if (order?.orderNumber) socket.emit('join_order_room', order.orderNumber.toString());

    const handleOrderUpdate = (updatedOrder) => {
      const incomingId = updatedOrder._id || updatedOrder.id || updatedOrder.orderId;
      if (String(incomingId) === String(id) || (order && String(incomingId) === String(order._id))) {
        setOrder(prev => {
          const newStatus = updatedOrder.status || prev?.status;
          if (newStatus && previousStatusRef.current !== newStatus) {
            if (newStatus === 'Confirmed') playChime?.();
            if (newStatus === 'Ready') playReadySound?.();
            if (newStatus === 'Completed') playCompletedSound?.();
            previousStatusRef.current = newStatus;
          }
          const hasRefunded = updatedOrder.refundStatus === 'Refunded' || updatedOrder.refundStatus === 'Processed';
          const wasRefunded = prev?.refundStatus === 'Refunded' || prev?.refundStatus === 'Processed';
          if (hasRefunded && !wasRefunded) {
            playCompletedSound?.();
            setShowRefundCard(true);
          }
          return { ...prev, ...updatedOrder };
        });

        if (updatedOrder.refundStatus === 'Refunded' || updatedOrder.refundStatus === 'Processed' || updatedOrder.refundUtr) {
          setShowRefundCard(true);
        }
      }
    };

    const handleRefundCompleted = (data) => {
      playCompletedSound?.();
      setOrder(prev => ({
        ...prev,
        ...(data.order || {}),
        refundStatus: 'Refunded',
        refundUtr: data.utr || data.refund?.utr || prev?.refundUtr || '',
        status: 'Cancelled',
      }));
      setShowRefundCard(true);
    };

    socket.on('order_status_update', handleOrderUpdate);
    socket.on('refund_completed', handleRefundCompleted);
    socket.on('refund_settled', handleRefundCompleted);

    return () => {
      socket.off('order_status_update', handleOrderUpdate);
      socket.off('refund_completed', handleRefundCompleted);
      socket.off('refund_settled', handleRefundCompleted);
    };
  }, [socket, connected, id, order?._id, order?.orderNumber]);

  const handleCopyOtp = async (code) => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
    Alert.alert('Code Copied', `Pickup code ${code} copied to clipboard.`);
  };

  const handleCopyUtr = async (utr) => {
    if (!utr) return;
    await Clipboard.setStringAsync(utr);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
    Alert.alert('UTR Copied', `Bank reference ${utr} copied to clipboard.`);
  };

  const handleWhatsAppSupport = () => {
    const orderNum = order?.orderNumber || (order?._id || id).slice(-6);
    const storeName = order?.storeId?.name || order?.store?.name || 'Counter';
    const status = currentStatus || 'Pending';
    const total = order?.totalAmount || 0;
    const itemsList = (order?.items || [])
      .map(i => `• ${i.quantity || 1}x ${i.name || i.title || 'Item'} (₹${(i.price || 0) * (i.quantity || 1)})`)
      .join('\n');

    let text = `Hi UniVerse Support, I need help with my Order #${orderNum}.\n\n` +
      `📋 *Order Details:*\n` +
      `• *Store / Stall:* ${storeName}\n` +
      `• *Status:* ${status}\n` +
      `• *Total Paid:* ₹${total}\n`;

    if (itemsList) {
      text += `\n🛒 *Items:*\n${itemsList}\n`;
    }

    text += `\nPlease assist me with this order.`;

    const cleanNumber = '918295886832';
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`);
  };

  const handleWhatsAppStall = () => {
    const phone = order?.storeId?.phone || order?.store?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const orderNum = order.orderNumber || (order._id || id).slice(-6);
      const text = `Hi, I placed Order #${orderNum} on UniVerse. Checking on pickup status.`;
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`);
    } else {
      // Route to UniVerse Support directly if stall number not provided
      handleWhatsAppSupport();
    }
  };

  // Direct UPI Refund Request
  const handleRequestRefund = async (upiToUse) => {
    const targetUpi = (upiToUse || customUpi || '').trim();
    if (!targetUpi) {
      setRefundError('Please enter a valid UPI ID (e.g. name@oksbi)');
      return;
    }
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(targetUpi)) {
      setRefundError('Invalid UPI format. Must contain @ (e.g. 9876543210@paytm)');
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError('');
    try {
      const res = await apiClient.post(`/orders/${id}/request-upi-refund`, {
        upiId: targetUpi,
      });
      if (res.data?.success) {
        setOrder(prev => ({
          ...prev,
          customerUpiId: targetUpi,
          refundStatus: 'Requested',
        }));
        setShowCustomInput(false);
        Alert.alert('Refund Requested', `Refund of ₹${order?.totalAmount} requested to ${targetUpi}. Credited in 2–5 minutes.`);
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || 'Failed to submit refund request. Please try again.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.pulseCircleLoader}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
        <Text style={styles.loadingText}>Securing your order... Please wait</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color={THEME.colors.error} />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorSubtitle}>We couldn't find the order you're looking for.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backHomeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
  const originalPayerUpi = order.payerUpiId || null;
  const activeRefundUpi = order.customerUpiId || originalPayerUpi || '';
  const isRefunded = order.refundStatus === 'Refunded' || order.refundStatus === 'Processed';
  const isRequested = order.refundStatus === 'Requested';

  const currentStatus = order.status || 'Pending';
  const isCancelled = currentStatus === 'Cancelled';
  const isPaymentPending = currentStatus === 'Payment Pending';
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  const handoverToken = order.handoverToken || (order._id || order.id || id).slice(-4).toUpperCase();
  const orderNumber = order.orderNumber || (order._id || order.id || id).slice(-6).toUpperCase();

  // QR Code URL generating a scannable standard QR code for vendor scanner
  const qrPayload = JSON.stringify({
    orderId: order._id || order.id || order.orderNumber,
    handoverToken: handoverToken,
  });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(qrPayload)}`;

  const getStatusDesc = () => {
    if (isPaymentPending) return 'Your payment is being processed';
    if (isCancelled) return 'This order has been cancelled by the vendor';
    const found = STATUS_STEPS[currentStepIndex >= 0 ? currentStepIndex : 0];
    return found ? found.desc : 'Order status updated';
  };

  const getStatusColor = () => {
    switch (currentStatus) {
      case 'Pending': return '#F59E0B';
      case 'Confirmed': return '#3B82F6';
      case 'Cooking': return '#8B5CF6';
      case 'Ready': return '#EC4899';
      case 'Completed': return '#10B981';
      case 'Cancelled': return '#EF4444';
      default: return THEME.colors.primary;
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Top Navbar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.headerBtn}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Track Order</Text>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            onPress={() => shareOrder(order)}
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            <Feather name="share-2" size={17} color={THEME.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => fetchOrder()}
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={17} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Centered Glass Card */}
        <View style={styles.glassCard}>
          {/* Order Number Pill */}
          <View style={styles.orderNumberPill}>
            <Text style={styles.orderNumberText}>Order #{orderNumber}</Text>
          </View>

          {/* Live Status Animation Circle */}
          <View style={styles.pulseContainer}>
            <View style={[styles.pulseCircle, { borderColor: getStatusColor() }]}>
              {currentStatus === 'Completed' ? (
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              ) : isCancelled ? (
                <Feather name="x" size={48} color="#EF4444" />
              ) : isPaymentPending ? (
                <Feather name="clock" size={48} color="#F59E0B" />
              ) : currentStatus === 'Cooking' ? (
                <MaterialCommunityIcons name="chef-hat" size={48} color="#8B5CF6" />
              ) : currentStatus === 'Confirmed' ? (
                <Ionicons name="receipt-outline" size={48} color="#3B82F6" />
              ) : currentStatus === 'Ready' ? (
                <Feather name="package" size={48} color="#EC4899" />
              ) : (
                <Feather name="clock" size={48} color="#F59E0B" />
              )}
            </View>
          </View>

          {/* Status Heading */}
          <Text style={styles.statusTitle}>
            {isPaymentPending ? 'Processing Payment...' : currentStatus}
          </Text>

          {/* Status Description */}
          <Text style={styles.statusSubtitle}>{getStatusDesc()}</Text>

          {/* Pre-Order Scheduled Badge */}
          {order.isPreOrder && order.scheduledTime && (
            <View style={styles.preOrderBadge}>
              <Ionicons name="time-outline" size={15} color="#D97706" />
              <Text style={styles.preOrderBadgeText}>
                ⏰ Pre-Order Pickup at <Text style={{ fontWeight: '900' }}>{order.scheduledTime}</Text>
              </Text>
            </View>
          )}

          {/* Auto-cancel countdown for Pending orders */}
          {currentStatus === 'Pending' && (
            <View style={styles.countdownWrapper}>
              <Text style={styles.countdownPrompt}>Auto-cancels if not accepted soon</Text>
              <CountdownTimer
                deadline={
                  order.acceptDeadline ||
                  (order.createdAt
                    ? new Date(new Date(order.createdAt).getTime() + (order.isPreOrder ? 15 : 5) * 60 * 1000).toISOString()
                    : null)
                }
              />
            </View>
          )}

          {/* Handover QR Code Section - Visible ONLY when order is Ready for pickup */}
          {currentStatus === 'Ready' && (
            <View style={styles.handoverCard}>
              <View style={[styles.handoverAccentBar, { backgroundColor: THEME.colors.primary }]} />

              <Text style={styles.handoverTitle}>Show this to Vendor</Text>
              <Text style={styles.handoverSubtitle}>
                The vendor will scan this QR to verify your handover.
              </Text>

              {/* Scannable Real QR Code Container */}
              <View style={styles.qrWrapper}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Handover Completed Confirmation - Clean card without QR code */}
          {currentStatus === 'Completed' && (
            <View style={styles.handoverCompletedCard}>
              <View style={styles.handoverCompletedIcon}>
                <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.handoverCompletedTitle}>Handover Successful!</Text>
                <Text style={styles.handoverCompletedSubtitle}>
                  Your order has been verified and handed over. Enjoy your meal!
                </Text>
              </View>
            </View>
          )}

          {/* Horizontal 4-Step Stepper Timeline matching webapp */}
          {!isPaymentPending && !isCancelled && (
            <View style={styles.timelineWrapper}>
              <View style={styles.timelineTrackBackground} />
              <View
                style={[
                  styles.timelineTrackActive,
                  {
                    width:
                      currentStepIndex <= 0
                        ? '0%'
                        : `${Math.min(80, (currentStepIndex / 4) * 80)}%`,
                  },
                ]}
              />

              <View style={styles.timelineStepsRow}>
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isActive = idx === currentStepIndex;

                  return (
                    <View key={step.key} style={styles.stepNodeCol}>
                      <View
                        style={[
                          styles.stepNodeCircle,
                          (isCompleted || isActive) && styles.stepNodeCircleActive,
                          isActive && styles.stepNodeCirclePulse,
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                        ) : idx === 0 ? (
                          <Feather name="clock" size={14} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                        ) : idx === 1 ? (
                          <Ionicons name="receipt-outline" size={14} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                        ) : idx === 2 ? (
                          <MaterialCommunityIcons name="chef-hat" size={16} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                        ) : idx === 3 ? (
                          <Feather name="package" size={14} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                        ) : (
                          <Ionicons name="checkmark-circle-outline" size={16} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.stepNodeLabel,
                          isActive && styles.stepNodeLabelActive,
                          isCompleted && styles.stepNodeLabelCompleted,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Payment Status Pill Card */}
          <View
            style={[
              styles.paymentStatusCard,
              order.paymentStatus === 'Confirmed' ? styles.paymentConfirmedCard : styles.paymentPendingCard,
            ]}
          >
            <Text
              style={[
                styles.paymentStatusTitle,
                { color: order.paymentStatus === 'Confirmed' ? '#10B981' : '#F59E0B' },
              ]}
            >
              {order.paymentStatus === 'Confirmed' ? '✅ Payment Confirmed' : '⏳ Payment Processing'}
            </Text>
            <Text style={styles.paymentStatusDesc}>
              {order.paymentStatus === 'Confirmed'
                ? `₹${order.totalAmount} paid via Razorpay`
                : 'Your payment is being verified...'}
            </Text>
          </View>

          {/* Order Summary Itemized Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeaderRow}>
              <Feather name="file-text" size={18} color={THEME.colors.primary} />
              <Text style={styles.summaryHeaderTitle}>Order Summary</Text>
            </View>

            <View style={styles.summaryMetaRow}>
              <Text style={styles.metaLabel}>Store</Text>
              <Text style={styles.metaValue}>{order.store?.name || order.storeName || 'Campus Kitchen'}</Text>
            </View>

            <View style={styles.summaryMetaRow}>
              <Text style={styles.metaLabel}>Order Type</Text>
              <Text style={styles.metaValue}>{order.orderType || 'Take Away'}</Text>
            </View>

            <View style={styles.itemsListContainer}>
              {(order.items || []).map((item, idx) => (
                <View key={idx} style={[styles.itemItemRow, idx === order.items.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemTitleText}>
                      {item.quantity}x {item.name}{' '}
                      {item.variant ? (
                        <Text style={styles.itemVariantText}>({item.variant})</Text>
                      ) : null}
                      {item.isCombo ? (
                        <Text style={styles.comboBadgeText}> COMBO</Text>
                      ) : null}
                    </Text>

                    {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                      <View style={styles.comboSubList}>
                        {item.comboItems.map((ci, cidx) => (
                          <Text key={cidx} style={styles.comboSubItemText}>• {ci.quantity} {ci.name}</Text>
                        ))}
                      </View>
                    )}

                    {item.freeItems && item.freeItems.length > 0 && (
                      <View style={styles.comboSubList}>
                        {item.freeItems.map((fi, fidx) => (
                          <Text key={fidx} style={styles.freeItemText}>+ Free {fi.quantity} {fi.name}</Text>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={styles.itemPriceText}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total Paid</Text>
              <Text style={styles.summaryTotalValue}>₹{order.totalAmount}</Text>
            </View>
          </View>

          {/* Direct Action: Need Support via WhatsApp */}
          <View style={styles.stallContactRow}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppSupport} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsappBtnText}>Need Support</Text>
            </TouchableOpacity>
          </View>

          {/* Return to Home CTA */}
          <TouchableOpacity
            style={styles.returnHomeBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Feather name="home" size={18} color="#FFFFFF" />
            <Text style={styles.returnHomeText}>Return to Home</Text>
          </TouchableOpacity>
        </View>

        {/* ⚡ DIRECT UPI REFUND MODULE (For Cancelled Orders) */}
        {isCancelled && showRefundCard && (
          <View style={[styles.refundCardModule, isRefunded ? styles.refundSettledBorder : isRequested ? styles.refundRequestedBorder : styles.refundPendingBorder]}>
            <TouchableOpacity
              style={styles.refundDismissBtn}
              onPress={() => setShowRefundCard(false)}
            >
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>

            {isRefunded ? (
              /* State 1: Refund Settled */
              <View>
                <View style={styles.refundHeaderRow}>
                  <View style={[styles.refundIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refundHeaderTitle}>Refund Credited Successfully! 🎉</Text>
                    <Text style={styles.refundHeaderSub}>Transferred directly into your bank account via UPI</Text>
                  </View>
                </View>

                <View style={styles.refundDetailsCard}>
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Amount Credited:</Text>
                    <Text style={[styles.refundDetailValue, { color: '#059669', fontSize: 18, fontWeight: '900' }]}>₹{order.totalAmount}</Text>
                  </View>
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Transferred to UPI:</Text>
                    <Text style={styles.refundDetailValue}>{activeRefundUpi || 'Your Bank UPI'}</Text>
                  </View>
                  {order.refundUtr ? (
                    <View style={[styles.refundDetailRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                      <Text style={styles.refundDetailLabel}>Bank Ref / UTR:</Text>
                      <TouchableOpacity
                        style={styles.utrCopyBtn}
                        onPress={() => handleCopyUtr(order.refundUtr)}
                      >
                        {copiedUtr ? (
                          <Feather name="check" size={12} color="#059669" />
                        ) : (
                          <Feather name="copy" size={12} color="#64748B" />
                        )}
                        <Text style={styles.utrText}>{order.refundUtr}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.refundFooterNote}>
                  Please check your UPI app (GPay / PhonePe / Paytm). The funds have been deposited directly into your bank account. ❤️
                </Text>
              </View>
            ) : isRequested ? (
              /* State 2: Refund in Progress */
              <View>
                <View style={styles.refundHeaderRow}>
                  <View style={[styles.refundIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Feather name="zap" size={22} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refundHeaderTitle}>Refund in Progress ⚡</Text>
                    <Text style={styles.refundHeaderSub}>Admin team is transferring your money directly via UPI</Text>
                  </View>
                </View>

                <View style={styles.refundDetailsCard}>
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Refund Amount:</Text>
                    <Text style={[styles.refundDetailValue, { color: '#D97706', fontSize: 18, fontWeight: '900' }]}>₹{order.totalAmount}</Text>
                  </View>
                  <View style={styles.refundDetailRow}>
                    <Text style={styles.refundDetailLabel}>Destination UPI:</Text>
                    <Text style={styles.refundDetailValue}>{activeRefundUpi}</Text>
                  </View>
                </View>

                <View style={styles.refundProgressFooter}>
                  <Text style={styles.refundEstimateText}>⏱️ Usually credited in 2–5 minutes</Text>
                  <TouchableOpacity onPress={() => setShowCustomInput(true)}>
                    <Text style={styles.changeUpiText}>Change UPI ID</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* State 3: Enter UPI for direct refund */
              <View>
                <View style={styles.refundHeaderRow}>
                  <View style={[styles.refundIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Feather name="zap" size={22} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refundHeaderTitle}>Instant Direct Refund</Text>
                    <Text style={styles.refundHeaderSub}>Order cancelled • ₹{order.totalAmount} will be refunded directly</Text>
                  </View>
                </View>

                {originalPayerUpi && !showCustomInput ? (
                  <View style={styles.refundDetailsCard}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', marginBottom: 6 }}>
                      ⚡ Verified Payment UPI Account:
                    </Text>
                    <View style={styles.originalUpiBox}>
                      <Text style={styles.originalUpiText}>{originalPayerUpi}</Text>
                      <TouchableOpacity onPress={() => { setCustomUpi(originalPayerUpi); setShowCustomInput(true); }}>
                        <Text style={styles.changeUpiText}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.submitRefundBtn}
                      onPress={() => handleRequestRefund(originalPayerUpi)}
                      disabled={isSubmittingRefund}
                    >
                      <Text style={styles.submitRefundBtnText}>
                        {isSubmittingRefund ? 'Submitting...' : `Get ₹${order.totalAmount} Refund on this UPI →`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.enterUpiPrompt}>
                      Enter your UPI ID to receive ₹<Text style={{ color: '#059669', fontWeight: '900' }}>{order.totalAmount}</Text> directly:
                    </Text>

                    <TextInput
                      style={styles.upiInput}
                      placeholder="e.g. 9876543210@paytm or name@oksbi"
                      placeholderTextColor="#94A3B8"
                      value={customUpi}
                      onChangeText={setCustomUpi}
                      autoCapitalize="none"
                    />

                    {rawPhone.length === 10 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.quickChipsLabel}>Quick Auto-fill with your mobile:</Text>
                        <View style={styles.chipsRow}>
                          {['paytm', 'ybl', 'oksbi', 'ibl'].map(bank => (
                            <TouchableOpacity
                              key={bank}
                              style={styles.bankChip}
                              onPress={() => setCustomUpi(`${rawPhone}@${bank}`)}
                            >
                              <Text style={styles.bankChipText}>+{bank}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.submitRefundBtn, (!customUpi.trim() || isSubmittingRefund) && { opacity: 0.6 }]}
                      onPress={() => handleRequestRefund()}
                      disabled={!customUpi.trim() || isSubmittingRefund}
                    >
                      <Text style={styles.submitRefundBtnText}>
                        {isSubmittingRefund ? 'Sending...' : `Get ₹${order.totalAmount} Refund on this UPI →`}
                      </Text>
                    </TouchableOpacity>

                    {originalPayerUpi ? (
                      <TouchableOpacity
                        style={{ marginTop: 8, alignItems: 'center' }}
                        onPress={() => setShowCustomInput(false)}
                      >
                        <Text style={styles.changeUpiText}>← Back to original UPI ({originalPayerUpi})</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {refundError ? (
                  <View style={styles.refundErrorBox}>
                    <Feather name="alert-circle" size={14} color="#DC2626" />
                    <Text style={styles.refundErrorText}>{refundError}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Direct Phone Assistance Footer */}
            <View style={styles.helpFooterRow}>
              <Text style={styles.helpFooterLabel}>Need urgent help?</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => Linking.openURL('tel:7985397373')}>
                  <Text style={[styles.helpPhoneLink, { color: '#059669' }]}>📞 7985397373</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('tel:8295886832')}>
                  <Text style={[styles.helpPhoneLink, { color: '#2563EB' }]}>📞 8295886832</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  pulseCircleLoader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backHomeBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 100,
    ...THEME.shadows.primary,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumberPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 18,
  },
  orderNumberText: {
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 16,
  },
  pulseContainer: {
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  preOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    gap: 6,
    marginBottom: 14,
  },
  preOrderBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  countdownWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownPrompt: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  urgentTimerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  handoverCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginVertical: 14,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  handoverCompletedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 14,
    marginVertical: 14,
    gap: 12,
  },
  handoverCompletedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handoverCompletedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  handoverCompletedSubtitle: {
    fontSize: 12.5,
    color: '#047857',
    lineHeight: 17,
  },
  handoverCardCompleted: {
    borderColor: '#10B981',
  },
  handoverAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  handoverTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 6,
    marginBottom: 4,
  },
  handoverSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 170,
    height: 170,
    borderRadius: 10,
  },
  qrImageVerified: {
    opacity: 0.35,
  },
  verifiedStamp: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    transform: [{ rotate: '-15deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  verifiedStampText: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '950',
    letterSpacing: 2,
  },
  otpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  otpValue: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1.5,
  },
  timelineWrapper: {
    width: '100%',
    marginVertical: 18,
    position: 'relative',
  },
  timelineTrackBackground: {
    position: 'absolute',
    top: 17,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  timelineTrackActive: {
    position: 'absolute',
    top: 17,
    left: '10%',
    height: 3,
    backgroundColor: THEME.colors.primary,
    zIndex: 2,
  },
  timelineStepsRow: {
    flexDirection: 'row',
    width: '100%',
    zIndex: 3,
  },
  stepNodeCol: {
    alignItems: 'center',
    width: '20%',
  },
  stepNodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNodeCircleActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  stepNodeCirclePulse: {
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  stepNodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepNodeLabelActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '900',
  },
  stepNodeLabelCompleted: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  paymentStatusCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    marginVertical: 8,
  },
  paymentConfirmedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  paymentPendingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  paymentStatusTitle: {
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 3,
  },
  paymentStatusDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemsListContainer: {
    marginVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  itemItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemVariantText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  comboBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EF4444',
  },
  comboSubList: {
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  },
  comboSubItemText: {
    fontSize: 11,
    color: '#64748B',
  },
  freeItemText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginTop: 6,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  stallContactRow: {
    width: '100%',
    marginVertical: 8,
  },
  whatsappBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    ...THEME.shadows.card,
  },
  whatsappBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  returnHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginTop: 10,
    ...THEME.shadows.card,
  },
  returnHomeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  /* Refund Module */
  refundCardModule: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginTop: 14,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  refundSettledBorder: {
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  refundRequestedBorder: {
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  refundPendingBorder: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  refundDismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  refundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  refundIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  refundHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refundDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  refundDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  refundDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  refundDetailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  utrCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  utrText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  refundFooterNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  refundProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  refundEstimateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  changeUpiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  enterUpiPrompt: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  originalUpiBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  originalUpiText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  upiInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  quickChipsLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bankChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  bankChipText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  submitRefundBtn: {
    height: 46,
    backgroundColor: '#059669',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitRefundBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refundErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  refundErrorText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  helpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  helpFooterLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  helpPhoneLink: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default OrderTrackerScreen;
