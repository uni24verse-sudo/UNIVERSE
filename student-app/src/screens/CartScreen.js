import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { useLocation } from '../context/LocationContext';
import apiClient from '../api/client';
import RazorpayModal from '../components/RazorpayModal';
import DietaryBadge from '../components/DietaryBadge';

const QUICK_INSTRUCTIONS = [
  'Less Spicy 🌶️',
  'No Onion/Garlic 🧅',
  'Extra Spoons 🥄',
  'Pack Separately 🥡',
];

const CartScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    cart,
    storeId,
    storeName,
    subtotal,
    totalItems,
    hasOutOfStockItems,
    outOfStockItems,
    removeOutOfStockItems,
    isStoreClosed,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    appliedOffer,
    discountAmount,
    discountedSubtotal,
    eligibleOffers,
    ineligibleOffers,
    offers,
    selectedOfferId,
    setSelectedOfferId,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { socket, connected } = useSocket();
  const { currentLocation } = useLocation();

  const [pairings, setPairings] = useState([]);

  // Coupon search and dropdown state
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState(null);
  const [showOffersDropdown, setShowOffersDropdown] = useState(false);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      setCouponFeedback({ type: 'error', message: 'Please enter a coupon code' });
      return;
    }
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponFeedback({ type: 'success', message: res.message });
      setCouponInput('');
      setShowOffersDropdown(false);
    } else {
      setCouponFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponFeedback({ type: 'success', message: 'Coupon removed' });
    setTimeout(() => setCouponFeedback(null), 3000);
  };

  const [store, setStore] = useState(null);
  const [orderType, setOrderType] = useState('takeaway'); // 'takeaway', 'dine_in', 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryHouseNo, setDeliveryHouseNo] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [activeOrderPayload, setActiveOrderPayload] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKnownCustomer, setIsKnownCustomer] = useState(false);

  const scrollViewRef = useRef(null);
  const addressInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const [addressCardY, setAddressCardY] = useState(0);
  const [detailsCardY, setDetailsCardY] = useState(0);

  const [addressError, setAddressError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null);

  const CAMPUS_PRESETS = ['BH-1', 'BH-2', 'BH-3', 'GH-1', 'GH-2', 'Block 34', 'Block 38', 'Library'];

  const cleanFormatAddressParts = (parts) => {
    const seen = new Set();
    const filtered = [];
    for (const raw of parts) {
      if (!raw) continue;
      const item = String(raw).trim();
      if (!item) continue;
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        filtered.push(item);
      }
    }
    return filtered.join(', ');
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDetectingLocation(false);
        Alert.alert('Permission Denied', 'Please enable location permissions in your device settings to auto-detect your address.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      const { latitude, longitude } = position.coords;
      setDetectedCoords({ latitude, longitude });

      let resolvedAddress = '';

      // 1. First Priority: Native Device Reverse Geocoding (Google Play Services / iOS CoreLocation)
      try {
        const geoResults = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geoResults && geoResults.length > 0) {
          const g = geoResults[0];
          const parts = [
            g.name && g.name !== g.street && g.name !== g.city && g.name !== g.subregion && g.name !== g.district ? g.name : null,
            g.streetNumber ? `${g.streetNumber} ${g.street || ''}`.trim() : g.street,
            g.district || g.subregion || g.neighborhood,
            g.city || g.region,
            g.postalCode
          ];
          resolvedAddress = cleanFormatAddressParts(parts);
        }
      } catch (nativeErr) {
        console.log('[GPS Native Geocode] Falling back to online reverse geocoder:', nativeErr?.message);
      }

      // 2. Secondary Fallback: Detailed Online Reverse Geocoder
      if (!resolvedAddress || resolvedAddress.length < 5) {
        try {
          const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const bdcData = await bdcRes.json();
          if (bdcData) {
            const bdcParts = [
              bdcData.locality,
              bdcData.principalSubdivision,
              bdcData.city,
              bdcData.postcode
            ];
            resolvedAddress = cleanFormatAddressParts(bdcParts);
          }
        } catch (e) {}
      }

      // 3. Third Fallback: Nominatim OpenStreetMap with full granular components
      if (!resolvedAddress || resolvedAddress.length < 5) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'UniVerse-Campus-Delivery/2.0' } }
          );
          const data = await res.json();
          const a = data.address || {};
          const detailed = [
            a.amenity || a.building || a.shop || a.house_number,
            a.road || a.pedestrian || a.street,
            a.neighbourhood || a.suburb || a.residential,
            a.city || a.town || a.county,
            a.postcode
          ];
          resolvedAddress = cleanFormatAddressParts(detailed);
          if (!resolvedAddress && data.display_name) {
            resolvedAddress = cleanFormatAddressParts(data.display_name.split(',').slice(0, 4));
          }
        } catch (e) {}
      }

      if (resolvedAddress) {
        setDeliveryArea(resolvedAddress);
        setDeliveryAddress(resolvedAddress);
        AsyncStorage.setItem('universe_delivery_area', resolvedAddress).catch(() => {});
        AsyncStorage.setItem('universe_delivery_address', resolvedAddress).catch(() => {});
        setAddressError(false);
      } else {
        setDeliveryArea('Campus Location (Hostel Block / Academic Area)');
        setDeliveryAddress('Campus Location (Hostel Block / Academic Area)');
        setAddressError(false);
      }
    } catch (err) {
      Alert.alert('GPS Location', 'Could not detect your exact GPS coordinates. Please type your room number or hostel block manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('universe_delivery_house'),
      AsyncStorage.getItem('universe_delivery_area'),
      AsyncStorage.getItem('universe_delivery_landmark'),
      AsyncStorage.getItem('universe_delivery_address'),
    ]).then(([h, a, l, full]) => {
      if (h) setDeliveryHouseNo(h);
      if (a) setDeliveryArea(a);
      if (l) setDeliveryLandmark(l);
      if (full) setDeliveryAddress(full);
    }).catch(() => {});
  }, []);

  // External Hub Detection (Matches webapp Cart.jsx: store?.locationId?.type !== 'External')
  const isExternalHub =
    store?.locationId?.type === 'External' ||
    store?.location?.type === 'External' ||
    currentLocation?.type === 'External';

  useEffect(() => {
    if (isExternalHub) {
      setIsPreOrder(false);
    }
  }, [isExternalHub]);

  // Razorpay Modal state
  const [razorpayOptions, setRazorpayOptions] = useState(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [activeCreatedOrderId, setActiveCreatedOrderId] = useState(null);

  // Load saved student profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [savedPhone, savedName, savedEmail, savedSpot] = await Promise.all([
          AsyncStorage.getItem('universe_customer_phone'),
          AsyncStorage.getItem('universe_customer_name'),
          AsyncStorage.getItem('universe_customer_email'),
          AsyncStorage.getItem('universe_customer_spot'),
        ]);
        if (savedPhone) setCustomerPhone(savedPhone);
        if (savedName) setCustomerName(savedName);
        if (savedEmail) setCustomerEmail(savedEmail);
        if (savedSpot) setTableNumber(savedSpot);
        if (savedPhone && (savedName || savedEmail)) setIsKnownCustomer(true);
      } catch (e) {}
    };
    loadProfile();
  }, []);

  // Fetch store packaging charge and status
  useEffect(() => {
    if (!storeId) return;
    apiClient.get(`/store/${storeId}`)
      .then(res => setStore(res.data))
      .catch(console.warn);
  }, [storeId]);

  // Real-time synchronization for store status and stock availability
  useEffect(() => {
    if (!socket || !connected || !storeId) return;

    const handleStoreStatus = ({ storeId: updatedStoreId, isOpen }) => {
      if (String(updatedStoreId) === String(storeId)) {
        setStore(prev => prev ? { ...prev, isOpen } : prev);
      }
    };

    socket.on('store_status_update', handleStoreStatus);

    return () => {
      socket.off('store_status_update', handleStoreStatus);
    };
  }, [socket, connected, storeId]);

  // Fetch Smart Pairings Upsell matching webapp
  const fetchPairings = useCallback(async () => {
    if (!storeId || cart.length === 0) {
      setPairings([]);
      return;
    }
    try {
      const itemIds = cart.map(item => item._id || item.productId).filter(Boolean).join(',');
      const res = await apiClient.get(`/analytics/store/${storeId}/pairings?currentItemIds=${itemIds}`);
      setPairings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setPairings([]);
    }
  }, [storeId, cart]);

  useEffect(() => {
    fetchPairings();
  }, [fetchPairings]);

  // Fast customer pre-fill on 10-digit phone matching webapp
  useEffect(() => {
    const clean = customerPhone.replace(/\D/g, '');
    if (clean.length === 10) {
      apiClient.get(`/orders/customer/lookup?phone=${clean}`)
        .then(res => {
          if (res.data?.exists) {
            setIsKnownCustomer(true);
            if (!customerName && res.data.currentName) {
              setCustomerName(res.data.currentName);
            }
            if (!customerEmail && res.data.email) {
              setCustomerEmail(res.data.email);
            }
          } else {
            setIsKnownCustomer(false);
          }
        })
        .catch(() => setIsKnownCustomer(false));
    } else {
      setIsKnownCustomer(false);
    }
  }, [customerPhone]);

  // Generate robust dynamic 15-minute advance pre-order slots matching webapp
  const availableSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const minTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 min prep buffer
    const currentHour = now.getHours();

    // Campus active hours: 9 AM to 10 PM
    if (currentHour < 22) {
      const startHour = Math.max(9, currentHour);
      for (let h = startHour; h <= 22; h++) {
        for (let m = 0; m < 60; m += 15) {
          const slotDate = new Date();
          slotDate.setHours(h, m, 0, 0);

          if (slotDate >= minTime) {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayedHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            const mm = m.toString().padStart(2, '0');
            const label = `${displayedHour}:${mm} ${period}`;
            slots.push({
              value: label,
              label,
              period,
            });
          }
        }
      }
    }

    // Fallback/off-peak/late night: generate tomorrow's/next opening hours slots
    if (slots.length < 4) {
      const morningSlots = [
        { h: 10, m: 0 }, { h: 10, m: 15 }, { h: 10, m: 30 }, { h: 10, m: 45 },
        { h: 11, m: 0 }, { h: 11, m: 15 }, { h: 11, m: 30 }, { h: 11, m: 45 },
        { h: 12, m: 0 }, { h: 12, m: 15 }, { h: 12, m: 30 }, { h: 13, m: 0 },
        { h: 14, m: 0 }, { h: 15, m: 0 }, { h: 16, m: 0 }, { h: 17, m: 0 },
        { h: 18, m: 0 }, { h: 19, m: 0 }, { h: 20, m: 0 }, { h: 21, m: 0 },
      ];
      morningSlots.forEach(({ h, m }) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayedHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const mm = m.toString().padStart(2, '0');
        const label = `${displayedHour}:${mm} ${period}`;
        slots.push({
          value: label,
          label,
          period,
        });
      });
    }

    return slots;
  }, []);

  // Default selection when pre-order is turned on
  useEffect(() => {
    if (isPreOrder && (!selectedSlot || selectedSlot === 'ASAP') && availableSlots.length > 0) {
      setSelectedSlot(availableSlots[0].value);
    }
  }, [isPreOrder, selectedSlot, availableSlots]);

  const packagingCharge = (orderType === 'takeaway' || orderType === 'delivery') ? (store?.packagingCharge || 0) : 0;
  const rawDeliveryFee = Number(store?.deliveryFee) || 0;
  const freeThreshold = Number(store?.freeDeliveryThreshold) || 0;
  const isFreeDelivery = freeThreshold > 0 && subtotal >= freeThreshold;
  const deliveryFee = orderType === 'delivery' ? (isFreeDelivery ? 0 : rawDeliveryFee) : 0;
  const platformFee = orderType === 'delivery' ? 5 : 0;
  const offerDiscount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal - offerDiscount + packagingCharge + deliveryFee + platformFee);

  const handleInitiatePayment = async () => {
    if (cart.length === 0) return;
    if (hasOutOfStockItems) {
      Alert.alert('Items Sold Out', 'Item(s) in your cart just went out of stock! Please remove them to proceed.');
      return;
    }
    if (store?.isOpen === false || isStoreClosed) {
      Alert.alert('Stall Closed', 'This stall is currently closed and not accepting orders.');
      return;
    }
    if (orderType === 'delivery') {
      const hasAnyAddress = deliveryHouseNo.trim() || deliveryArea.trim() || deliveryAddress.trim();
      if (!hasAnyAddress) {
        setAddressError(true);
        scrollViewRef.current?.scrollTo({ y: Math.max(0, addressCardY - 20), animated: true });
        setTimeout(() => addressInputRef.current?.focus(), 250);
        Alert.alert('Delivery Address Required', 'Please enter your room number, house/hostel block.');
        return;
      }
      const minOrderVal = Number(store?.minDeliveryOrderValue) || 0;
      if (minOrderVal > 0 && subtotal < minOrderVal) {
        Alert.alert('Minimum Order Required', `This stall requires a minimum order of ₹${minOrderVal} for delivery.`);
        return;
      }
    }

    if (!customerName.trim()) {
      setNameError(true);
      scrollViewRef.current?.scrollTo({ y: Math.max(0, detailsCardY - 20), animated: true });
      setTimeout(() => nameInputRef.current?.focus(), 250);
      Alert.alert('Name Required', 'Please enter your name for order verification.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setPhoneError(true);
      scrollViewRef.current?.scrollTo({ y: Math.max(0, detailsCardY - 20), animated: true });
      setTimeout(() => phoneInputRef.current?.focus(), 250);
      Alert.alert('Mobile Number Required', 'Please enter a valid 10-digit mobile number for order pickup notifications.');
      return;
    }

    setLoading(true);
    try {
      const fullDeliveryAddress = [
        deliveryHouseNo.trim(),
        deliveryArea.trim(),
        deliveryLandmark.trim() ? `Near ${deliveryLandmark.trim()}` : ''
      ].filter(Boolean).join(', ') || deliveryAddress.trim();

      // Save details for next time
      const storageSaves = [
        AsyncStorage.setItem('universe_customer_phone', cleanPhone),
        AsyncStorage.setItem('universe_customer_name', customerName.trim()),
        AsyncStorage.setItem('universe_customer_email', customerEmail.trim()),
        AsyncStorage.setItem('universe_customer_spot', tableNumber.trim()),
      ];
      if (orderType === 'delivery') {
        if (deliveryHouseNo.trim()) storageSaves.push(AsyncStorage.setItem('universe_delivery_house', deliveryHouseNo.trim()));
        if (deliveryArea.trim()) storageSaves.push(AsyncStorage.setItem('universe_delivery_area', deliveryArea.trim()));
        if (deliveryLandmark.trim()) storageSaves.push(AsyncStorage.setItem('universe_delivery_landmark', deliveryLandmark.trim()));
        if (fullDeliveryAddress) storageSaves.push(AsyncStorage.setItem('universe_delivery_address', fullDeliveryAddress));
      }
      await Promise.all(storageSaves);

      const isPreOrderActive = !isExternalHub && Boolean(isPreOrder);
      const scheduledPickupTime = isPreOrderActive ? (selectedSlot || availableSlots[0]?.value) : null;

      // 1. Create order payload with complete pre-order connectivity and applied offers
      const orderPayload = {
        storeId,
        items: cart.map(it => ({
          productId: it._id || it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          variant: it.variant || null,
          isCombo: Boolean(it.isCombo),
          comboItems: it.comboItems || null,
          freeItems: it.freeItems || null,
        })),
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim(),
        tableNumber: orderType === 'dine_in' ? (tableNumber.trim() || 'Dine In') : (orderType === 'delivery' ? 'Delivery' : 'Takeaway'),
        orderType: orderType === 'delivery' ? 'Delivery' : (orderType === 'takeaway' ? 'Take Away' : 'Dine In'),
        deliveryAddress: orderType === 'delivery' ? fullDeliveryAddress : null,
        deliveryHouseNo: orderType === 'delivery' ? deliveryHouseNo.trim() : '',
        deliveryArea: orderType === 'delivery' ? deliveryArea.trim() : '',
        deliveryLandmark: orderType === 'delivery' ? deliveryLandmark.trim() : '',
        deliveryCoordinates: orderType === 'delivery' ? (detectedCoords ? { lat: detectedCoords.latitude, lng: detectedCoords.longitude } : { lat: 0, lng: 0 }) : null,
        deliveryFee,
        platformFee,
        packagingChargeApplied: packagingCharge > 0,
        isPreOrder: isPreOrderActive,
        scheduledTime: scheduledPickupTime || '',
        cookingInstructions: cookingInstructions.trim(),
        preOrderSlot: scheduledPickupTime || 'ASAP',
        packagingCharge,
        discountAmount: offerDiscount,
        appliedOffer: appliedOffer || null,
        selectedOfferId: appliedOffer?.id || null,
        totalAmount: grandTotal,
        paymentMethod: 'Razorpay',
        isQRScan: false,
      };

      setActiveOrderPayload(orderPayload);

      const paymentRes = await apiClient.post('/payments/razorpay/create-order', {
        amount: grandTotal,
        storeId,
        orderDetails: orderPayload,
      });

      const { razorpayOrderId, keyId, amount, currency, orderId } = paymentRes.data;
      setActiveCreatedOrderId(orderId);

      // 2. Open Razorpay Checkout modal
      setRazorpayOptions({
        key: keyId,
        amount: amount,
        currency: currency || 'INR',
        name: storeName || 'UniVerse Campus Dining',
        description: `Order #${(orderId || '').slice(-6)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: customerName.trim(),
          contact: cleanPhone,
          email: customerEmail.trim() || undefined,
        },
        theme: {
          color: THEME.colors.primary,
        },
      });

      setShowRazorpayModal(true);
    } catch (err) {
      console.error('Order creation failed:', err);
      Alert.alert('Checkout Error', err.response?.data?.message || 'Could not initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    setShowRazorpayModal(false);
    setLoading(true);
    try {
      // Connect verified payment and create order with full pre-order data
      const verifyRes = await apiClient.post('/payments/razorpay/verify', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        orderData: activeOrderPayload,
      });

      const finalOrderId = verifyRes.data?.order?._id || verifyRes.data?.order?.id || activeCreatedOrderId;
      
      // Save in recent orders list with pre-order details
      const savedRecent = JSON.parse(await AsyncStorage.getItem('universe_recent_orders') || '[]');
      const newRecent = [{
        id: finalOrderId,
        orderNumber: verifyRes.data?.order?.orderNumber || (finalOrderId || '').slice(-6).toUpperCase(),
        storeName: storeName || 'Campus Stall',
        isPreOrder: Boolean(isPreOrder),
        scheduledTime: isPreOrder ? selectedSlot : null,
        createdAt: new Date(),
      }, ...savedRecent].slice(0, 15);
      await AsyncStorage.setItem('universe_recent_orders', JSON.stringify(newRecent));

      clearCart();
      navigation.replace('OrderTracker', { id: finalOrderId });
    } catch (err) {
      console.error('Payment verification failed:', err);
      Alert.alert('Verification Alert', 'Payment processed. Redirecting to live tracking...');
      if (activeCreatedOrderId) {
        clearCart();
        navigation.replace('OrderTracker', { id: activeCreatedOrderId });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailure = (error) => {
    setShowRazorpayModal(false);
    Alert.alert('Payment Incomplete', error?.description || 'Payment was not completed. Your cart items are preserved.');
  };

  if (cart.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <View style={styles.emptyIconCircle}>
          <Feather name="shopping-bag" size={44} color={THEME.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Explore delicious dishes from campus stalls and tuck shops.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.browseButtonText}>Browse Campus Stalls</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Feather name="arrow-left" size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Review Order</Text>
          {store && (
            <Text style={{ fontSize: 11, color: THEME.colors.textSecondary, fontWeight: '600' }} numberOfLines={1}>
              from {store.name}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
          <Text style={styles.clearCartText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Store Info Banner */}
          <View style={styles.card}>
            <View style={styles.storeHeaderRow}>
              <View style={styles.storeIconCircle}>
                <Ionicons name="restaurant" size={18} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{storeName || 'Campus Stall'}</Text>
                <Text style={styles.storeLocation}>{currentLocation?.name || 'Campus Hub'}</Text>
              </View>
            </View>
          </View>

          {/* Order Preference Section */}
          <View style={styles.orderPreferenceSection}>
            <View style={styles.preferenceHeaderRow}>
              <Text style={styles.preferenceSectionTitle}>ORDER PREFERENCE</Text>
              {orderType === 'delivery' && Boolean(store?.estimatedDeliveryTime) && (
                <View style={styles.deliveryTimeBadge}>
                  <Feather name="clock" size={11} color="#EA580C" />
                  <Text style={styles.deliveryTimeBadgeText}>{store.estimatedDeliveryTime} mins</Text>
                </View>
              )}
            </View>

            <View style={styles.orderTypeCard}>
              <TouchableOpacity
                style={[styles.typeOption, orderType === 'takeaway' && styles.typeOptionActive]}
                onPress={() => setOrderType('takeaway')}
                activeOpacity={0.8}
              >
                <Feather
                  name="shopping-bag"
                  size={15}
                  color={orderType === 'takeaway' ? THEME.colors.primary : '#64748B'}
                />
                <Text style={[styles.typeText, orderType === 'takeaway' && styles.typeTextActive]}>
                  Takeaway
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, orderType === 'dine_in' && styles.typeOptionActive]}
                onPress={() => setOrderType('dine_in')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={15}
                  color={orderType === 'dine_in' ? THEME.colors.primary : '#64748B'}
                />
                <Text style={[styles.typeText, orderType === 'dine_in' && styles.typeTextActive]}>
                  Dine In
                </Text>
              </TouchableOpacity>

              {Boolean(store?.hasDeliveryService) && (
                <TouchableOpacity
                  style={[styles.typeOption, orderType === 'delivery' && styles.typeOptionActive]}
                  onPress={() => setOrderType('delivery')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={17}
                    color={orderType === 'delivery' ? THEME.colors.primary : '#64748B'}
                  />
                  <Text style={[styles.typeText, orderType === 'delivery' && styles.typeTextActive]}>
                    Delivery
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.preferenceSubRow}>
              <Text style={styles.preferenceSubText}>
                {orderType === 'takeaway' && 'Pack order to collect directly at stall counter'}
                {orderType === 'dine_in' && 'Dine in and enjoy your meal at the stall'}
                {orderType === 'delivery' && `Delivered directly to your hostel block or location by ${store?.name || 'stall'} staff`}
              </Text>
            </View>
          </View>

          {/* Delivery Address Field */}
          {orderType === 'delivery' && (
            <View
              onLayout={(e) => setAddressCardY(e.nativeEvent.layout.y)}
              style={[
                styles.addressCard,
                addressError && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2' }
              ]}
            >
              <View style={styles.addressHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location-outline" size={17} color={addressError ? '#EF4444' : THEME.colors.primary} />
                  <Text style={[styles.addressCardTitle, addressError && { color: '#B91C1C' }]}>
                    Delivery Drop-off Address
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                  style={styles.autoDetectBtn}
                  activeOpacity={0.75}
                >
                  {detectingLocation ? (
                    <ActivityIndicator size="small" color={THEME.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate-outline" size={13} color={THEME.colors.primary} />
                      <Text style={styles.autoDetectBtnText}>Auto-detect GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {detectedCoords && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
                    GPS Pin Locked ({detectedCoords.latitude.toFixed(4)}, {detectedCoords.longitude.toFixed(4)})
                  </Text>
                </View>
              )}

              {/* Main Address Input (Filled automatically by GPS or typed manually) */}
              <View style={{ marginBottom: 8 }}>
                <TextInput
                  ref={addressInputRef}
                  style={[
                    styles.addressInputField,
                    addressError && !deliveryAddress.trim() && !deliveryHouseNo.trim() && { borderColor: '#EF4444', backgroundColor: '#FFFFFF' }
                  ]}
                  placeholder="e.g. 10A/59 Vrindavan Yojna or Hostel BH-1, Room 304"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  value={deliveryAddress}
                  onChangeText={(val) => {
                    setDeliveryAddress(val);
                    if (addressError) setAddressError(false);
                  }}
                />
              </View>

              {/* Optional Landmark / Floor helper */}
              <View style={{ marginBottom: 4 }}>
                <TextInput
                  style={[
                    styles.addressInputField,
                    { height: 38, paddingVertical: 6, fontSize: 12, backgroundColor: '#F8FAFC' }
                  ]}
                  placeholder="Nearby Landmark / Flat / Gate (Optional)"
                  placeholderTextColor="#94A3B8"
                  value={deliveryLandmark}
                  onChangeText={(val) => setDeliveryLandmark(val)}
                />
              </View>

              {addressError ? (
                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 4 }}>
                  * Please tap Auto-detect GPS or type your delivery address.
                </Text>
              ) : null}

              <View style={styles.addressFooterRow}>
                <Feather name="info" size={12} color="#64748B" style={{ marginTop: 2 }} />
                <Text style={styles.addressFooterText}>
                  GPS pin & address will guide the rider directly to you.
                </Text>
              </View>

              <View style={styles.addressFooterRow}>
                <Feather name="info" size={12} color="#64748B" style={{ marginTop: 2 }} />
                <Text style={styles.addressFooterText}>
                  Exact GPS coordinates & landmark will guide the rider directly to your door.
                </Text>
              </View>
            </View>
          )}

          {/* Free Delivery Threshold Progress Nudge (Compels students to add more items) */}
          {orderType === 'delivery' && Boolean(freeThreshold > 0 && rawDeliveryFee > 0) && (
            <View style={[styles.freeDeliveryCard, isFreeDelivery ? styles.freeDeliveryCardUnlocked : styles.freeDeliveryCardProgress]}>
              <View style={styles.freeDeliveryTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[styles.freeDeliveryIconBox, isFreeDelivery && { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Ionicons
                      name={isFreeDelivery ? "checkmark-circle" : "bicycle-outline"}
                      size={18}
                      color={isFreeDelivery ? "#10B981" : "#EA580C"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.freeDeliveryTitle, isFreeDelivery && { color: '#047857' }]}>
                      {isFreeDelivery
                        ? 'FREE DELIVERY UNLOCKED'
                        : `Add ₹${Math.ceil(freeThreshold - subtotal)} more for Free Delivery`
                      }
                    </Text>
                    <Text style={[styles.freeDeliverySub, isFreeDelivery && { color: '#065F46' }]}>
                      {isFreeDelivery
                        ? `You saved ₹${rawDeliveryFee} delivery fee on this order`
                        : `Orders above ₹${freeThreshold} get free delivery from ${store?.name || 'this stall'}`
                      }
                    </Text>
                  </View>
                </View>

                {!isFreeDelivery && (
                  <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    activeOpacity={0.7}
                    style={styles.addMoreBtn}
                  >
                    <Text style={styles.addMoreBtnText}>+ Add items</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isFreeDelivery && (
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(8, (subtotal / freeThreshold) * 100))}%` }
                    ]}
                  />
                </View>
              )}
            </View>
          )}

          {/* Minimum Delivery Order Value Notice */}
          {orderType === 'delivery' && Boolean(store?.minDeliveryOrderValue > 0 && subtotal < store.minDeliveryOrderValue) && (
            <View style={styles.minOrderNoticeCard}>
              <Feather name="alert-circle" size={15} color="#D97706" />
              <Text style={styles.minOrderNoticeText}>
                Minimum order for delivery is ₹{store.minDeliveryOrderValue}. Add ₹{(store.minDeliveryOrderValue - subtotal).toFixed(0)} more to place a delivery order.
              </Text>
            </View>
          )}

          {/* Dine In Table Number (Only for stalls configured with Table Service / Seating) */}
          {orderType === 'dine_in' && Boolean(store?.hasTableService) && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Table Number or Seating Spot</Text>
              <TextInput
                style={styles.singleInputField}
                placeholder="e.g. Table 4 or Counter Area"
                placeholderTextColor="#94A3B8"
                value={tableNumber}
                onChangeText={setTableNumber}
              />
            </View>
          )}

          {/* Advance Pre-Order & Pickup Time Slot Selector (Only for Counter Pickup & Takeaway) */}
          {orderType !== 'delivery' && !isExternalHub && (
            <View style={styles.card}>
              <View style={styles.slotHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Pickup Preference</Text>
                  <Text style={styles.slotSubtitle}>
                    {isPreOrder ? 'Schedule meal ahead for counter pickup' : 'Immediate preparation right away'}
                  </Text>
                </View>

                {/* Toggle Switch matching webapp */}
                <TouchableOpacity
                  style={[styles.preOrderToggle, isPreOrder && styles.preOrderToggleActive]}
                  onPress={() => {
                    const next = !isPreOrder;
                    setIsPreOrder(next);
                    if (next && (!selectedSlot || selectedSlot === 'ASAP')) {
                      setSelectedSlot(availableSlots[0]?.value || '10:00 AM');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.preOrderToggleThumb, isPreOrder && styles.preOrderToggleThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Segmented Mode Tabs: ASAP vs Schedule */}
              <View style={styles.modeTabsRow}>
                <TouchableOpacity
                  style={[styles.modeTab, !isPreOrder && styles.modeTabActive]}
                  onPress={() => setIsPreOrder(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="zap" size={14} color={!isPreOrder ? THEME.colors.primary : '#64748B'} />
                  <Text style={[styles.modeTabText, !isPreOrder && styles.modeTabTextActive]}>
                    Order Now (ASAP)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, isPreOrder && styles.modeTabActive]}
                  onPress={() => {
                    setIsPreOrder(true);
                    if (!selectedSlot || selectedSlot === 'ASAP') {
                      setSelectedSlot(availableSlots[0]?.value || '10:00 AM');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="clock" size={14} color={isPreOrder ? THEME.colors.primary : '#64748B'} />
                  <Text style={[styles.modeTabText, isPreOrder && styles.modeTabTextActive]}>
                    Schedule for Later
                  </Text>
                </TouchableOpacity>
              </View>

              {isPreOrder ? (
                <View style={styles.slotsWrapper}>
                  <View style={styles.slotSelectionNotice}>
                    <Ionicons name="time-outline" size={15} color={THEME.colors.primary} />
                    <Text style={styles.slotNoticeText}>
                      Selected Pickup: <Text style={styles.slotNoticeBold}>{selectedSlot || availableSlots[0]?.value}</Text>
                    </Text>
                  </View>

                  <Text style={styles.slotsPrompt}>Choose pickup time slot (15-min intervals):</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slotsScroll}
                  >
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.value;
                      return (
                        <TouchableOpacity
                          key={slot.value}
                          style={[styles.slotPill, isSelected && styles.slotPillActive]}
                          onPress={() => setSelectedSlot(slot.value)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.slotPillText, isSelected && styles.slotPillTextActive]}>
                            {slot.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.kitchenPrepNote}>
                    ✦ Kitchen will begin fresh preparation 15 minutes before your pickup time.
                  </Text>
                </View>
              ) : (
                <View style={styles.immediatePrepBadge}>
                  <Feather name="check-circle" size={14} color="#10B981" />
                  <Text style={styles.immediatePrepText}>
                    Stall counter will acknowledge and start cooking immediately.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cart Items List */}
          <View style={styles.card}>
            {/* Out-of-Stock Real-time Alert Banner matching webapp */}
            {hasOutOfStockItems && (
              <View style={styles.outOfStockBanner}>
                <View style={styles.outOfStockHeaderRow}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.outOfStockTitle}>Item(s) in your cart just went out of stock!</Text>
                    <Text style={styles.outOfStockSubtitle}>
                      The vendor marked dish(es) as sold out. Please remove them to proceed.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={removeOutOfStockItems} style={styles.removeOutOfStockBtn}>
                  <Text style={styles.removeOutOfStockBtnText}>Remove Sold Out Items</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.cardHeading}>Items in Cart ({totalItems})</Text>

            {cart.map((item, index) => {
              const targetId = item.cartItemId || item._id;
              const isItemSoldOut = item.isAvailable === false;

              return (
                <View key={targetId || index} style={[styles.cartItemRow, isItemSoldOut && { opacity: 0.75 }]}>
                  <View style={styles.itemInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <DietaryBadge type={item.dietaryPreference || 'veg'} size={12} />
                      <Text style={[styles.itemName, isItemSoldOut && styles.itemNameSoldOut]}>
                        {item.name}
                      </Text>
                      {item.isCombo ? (
                        <View style={styles.comboBadge}>
                          <Text style={styles.comboBadgeText}>COMBO</Text>
                        </View>
                      ) : null}
                      {isItemSoldOut ? (
                        <View style={styles.soldOutBadge}>
                          <Text style={styles.soldOutBadgeText}>⚠️ SOLD OUT</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.variant && (
                      <Text style={styles.itemVariant}>Variant: {item.variant}</Text>
                    )}
                    <Text style={[styles.itemPrice, isItemSoldOut && { color: '#94A3B8' }]}>
                      ₹{item.price * item.quantity}
                    </Text>
                  </View>

                  {isItemSoldOut ? (
                    <TouchableOpacity
                      onPress={() => removeFromCart(targetId)}
                      style={styles.removeSoldOutItemBtn}
                    >
                      <Text style={styles.removeSoldOutItemText}>Remove</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(targetId, -1)}
                        style={styles.stepBtn}
                      >
                        <Feather name="minus" size={13} color="#0F172A" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(targetId, 1)}
                        style={styles.stepBtn}
                      >
                        <Feather name="plus" size={13} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Smart Pairing Magazine Upsell Section matching webapp lines 522-608 */}
          {pairings.length > 0 && (
            <View style={styles.card}>
              <View style={styles.pairingsHeaderRow}>
                <View>
                  <Text style={styles.pairingsTitle}>
                    The Perfect Pairing <Text style={{ color: THEME.colors.primary }}>✨</Text>
                  </Text>
                  <Text style={styles.pairingsSubtitle}>Curated For You</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pairingsScroll}
              >
                {pairings.map((prod) => (
                  <View key={prod._id || prod.id} style={styles.pairingCard}>
                    <Image
                      source={{
                        uri: prod.image
                          ? (prod.image.startsWith('http') ? prod.image : `${apiClient.defaults.baseURL?.replace('/api', '')}${prod.image}`)
                          : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
                      }}
                      style={styles.pairingImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.pairingName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <View style={styles.pairingFooter}>
                      <Text style={styles.pairingPrice}>₹{prod.price}</Text>
                      <TouchableOpacity
                        style={styles.addPairingBtn}
                        onPress={() => addToCart(prod, storeId, storeName, null, store?.locationId?._id || store?.locationId)}
                        activeOpacity={0.8}
                      >
                        <Feather name="plus" size={12} color={THEME.colors.primary} />
                        <Text style={styles.addPairingText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Special Cooking Instructions */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Special Cooking Requests</Text>
            
            <View style={styles.quickPillsRow}>
              {QUICK_INSTRUCTIONS.map((pill) => (
                <TouchableOpacity
                  key={pill}
                  style={styles.quickPill}
                  onPress={() => {
                    setCookingInstructions(prev => prev ? `${prev}, ${pill}` : pill);
                  }}
                >
                  <Text style={styles.quickPillText}>{pill}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Please make it extra spicy, less oil, etc."
              placeholderTextColor="#94A3B8"
              value={cookingInstructions}
              onChangeText={setCookingInstructions}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Student / Your Details Card */}
          <View onLayout={(e) => setDetailsCardY(e.nativeEvent.layout.y)} style={styles.card}>
            <View style={styles.studentHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="credit-card" size={18} color={THEME.colors.primary} />
                <Text style={styles.cardHeadingNoMargin}>Your Details</Text>
              </View>
              {isKnownCustomer && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.verifiedBadgeText}>Saved Profile</Text>
                </View>
              )}
            </View>

            {/* Field 1: Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="user" size={13} color={nameError ? '#EF4444' : '#64748B'} />
                <Text style={[styles.inputLabelWithIcon, nameError && { color: '#B91C1C' }]}>
                  Name {nameError && <Text style={{ color: '#EF4444' }}>* Required</Text>}
                </Text>
              </View>
              <TextInput
                ref={nameInputRef}
                style={[
                  styles.detailsInputField,
                  nameError && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2' }
                ]}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                value={customerName}
                onChangeText={(val) => {
                  setCustomerName(val);
                  if (nameError) setNameError(false);
                }}
              />
            </View>

            {/* Field 2: Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="phone" size={13} color={phoneError ? '#EF4444' : '#64748B'} />
                <Text style={[styles.inputLabelWithIcon, phoneError && { color: '#B91C1C' }]}>
                  Phone Number {phoneError && <Text style={{ color: '#EF4444' }}>* 10 Digits Required</Text>}
                </Text>
              </View>
              <TextInput
                ref={phoneInputRef}
                style={[
                  styles.detailsInputField,
                  phoneError && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2' }
                ]}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={customerPhone}
                onChangeText={(val) => {
                  setCustomerPhone(val);
                  if (phoneError) setPhoneError(false);
                }}
              />
            </View>

            {/* Field 3: Email */}
            <View style={styles.inputGroup}>
              <View style={[styles.labelRow, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="mail" size={13} color="#64748B" />
                  <Text style={styles.inputLabelWithIcon}>Email</Text>
                </View>
                <Text style={styles.optionalHelperText}>Optional - for e-receipt</Text>
              </View>
              <TextInput
                style={styles.detailsInputField}
                placeholder="student@university.edu (Optional)"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={customerEmail}
                onChangeText={setCustomerEmail}
              />
            </View>

            {/* Embedded Secure Payment Notice matching webapp lines 850-856 */}
            <View style={styles.securePaymentBanner}>
              <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.securePaymentTitle}>Secure Payment via Razorpay</Text>
                <Text style={styles.securePaymentSub}>UPI • Cards • Wallets • Net Banking</Text>
              </View>
            </View>
          </View>

          {/* Zomato/Swiggy-style Search Coupon & Smart Offers Drawer */}
          {offers && offers.length > 0 && (
            <View style={styles.offersHubContainer}>
              <View style={styles.offersHubHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.offersHubIconBox}>
                    <Ionicons name="pricetag" size={16} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={styles.offersHubTitle}>Coupons & Platform Deals</Text>
                    <Text style={styles.offersHubSub}>
                      {offers.filter(o => o && o.isActive !== false).length} exclusive offers available for this cart
                    </Text>
                  </View>
                </View>
              </View>

              {/* 1. COUPON SEARCH & INPUT BAR */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 8 }}>
                <View style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  paddingHorizontal: 10
                }}>
                  <Ionicons name="pricetag-outline" size={15} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Enter coupon (e.g. CAMPUS10)"
                    placeholderTextColor="#94A3B8"
                    value={couponInput}
                    onChangeText={(val) => { setCouponInput(val); setCouponFeedback(null); }}
                    autoCapitalize="characters"
                    style={{
                      flex: 1,
                      paddingVertical: Platform.OS === 'ios' ? 10 : 7,
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#1E293B',
                      letterSpacing: 0.5
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: THEME.colors.primary,
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>APPLY</Text>
                </TouchableOpacity>
              </View>

              {/* Coupon Feedback Toast */}
              {couponFeedback && (
                <View style={{
                  padding: 8,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: couponFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  borderWidth: 1,
                  borderColor: couponFeedback.type === 'success' ? '#A7F3D0' : '#FECACA',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: couponFeedback.type === 'success' ? '#059669' : '#DC2626',
                    flex: 1
                  }}>
                    {couponFeedback.message}
                  </Text>
                  <TouchableOpacity onPress={() => setCouponFeedback(null)}>
                    <Ionicons name="close" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. ONLY APPLIED COUPON IS VISIBLE BY DEFAULT */}
              {appliedOffer ? (
                <View style={{
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1.5,
                  borderColor: '#10B981',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 4
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: '#10B981',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>
                            {appliedOffer.code || appliedOffer.badgeText}
                          </Text>
                        </View>
                        {appliedOffer.isGlobal && (
                          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#0369A1', fontSize: 10, fontWeight: '800' }}>CAMPUS DEAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46', marginTop: 2 }} numberOfLines={1}>
                        {appliedOffer.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700', marginTop: 1 }}>
                        🎉 Saved ₹{offerDiscount.toFixed(2)} on this order!
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setShowOffersDropdown(prev => !prev)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#A7F3D0',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 5
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857' }}>
                        {showOffersDropdown ? 'Hide ▴' : 'Switch ▾'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleRemoveCoupon}
                      style={{
                        backgroundColor: '#FEE2E2',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 5
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowOffersDropdown(prev => !prev)}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}
                >
                  <Ionicons name="pricetag" size={13} color="#EA580C" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#EA580C' }}>
                    {showOffersDropdown ? 'Hide available offers ▴' : `View available offers (${offers.filter(o => o && o.isActive !== false).length} available) ▾`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 3. COLLAPSIBLE OFFERS DROPDOWN / LIST */}
              {showOffersDropdown && (
                <View style={{ gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  {offers.filter(o => o && o.isActive !== false).map((offer) => {
                    const isEligible = eligibleOffers && eligibleOffers.some(e => String(e.id) === String(offer.id));
                    const isApplied = appliedOffer && String(appliedOffer.id) === String(offer.id);
                    const ineligibility = ineligibleOffers && ineligibleOffers.find(ie => String(ie.offer?.id) === String(offer.id) || String(ie.id) === String(offer.id));
                    const discountLabel = offer.badgeText || (offer.discountType?.includes('PERCENTAGE') ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`);

                    return (
                      <View
                        key={String(offer.id)}
                        style={[
                          styles.cleanCouponCard,
                          isApplied ? styles.cleanCouponCardApplied : isEligible ? styles.cleanCouponCardEligible : styles.cleanCouponCardLocked
                        ]}
                      >
                        {/* Header: Discount Badge + Code + Apply Button */}
                        <View style={styles.cleanCouponTopRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                            <View style={[styles.cleanDiscountBadge, isApplied && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                              <Text style={[styles.cleanDiscountBadgeText, isApplied && { color: '#047857' }]}>
                                {discountLabel}
                              </Text>
                            </View>

                            {offer.code ? (
                              <View style={styles.cleanCodePill}>
                                <Text style={styles.cleanCodePillText}>{offer.code}</Text>
                              </View>
                            ) : null}

                            {offer.isGlobal ? (
                              <View style={styles.cleanCampusBadge}>
                                <Text style={styles.cleanCampusBadgeText}>CAMPUS</Text>
                              </View>
                            ) : null}
                          </View>

                          {isEligible ? (
                            <TouchableOpacity
                              onPress={() => {
                                if (isApplied) {
                                  handleRemoveCoupon();
                                } else {
                                  setSelectedOfferId(offer.id);
                                  setShowOffersDropdown(false);
                                  setCouponFeedback({ type: 'success', message: `Coupon "${offer.code || offer.title}" applied!` });
                                }
                              }}
                              activeOpacity={0.8}
                              style={[
                                styles.cleanApplyBtn,
                                isApplied ? styles.cleanApplyBtnActive : styles.cleanApplyBtnNormal
                              ]}
                            >
                              <Text style={[styles.cleanApplyBtnText, isApplied && { color: '#FFFFFF' }]}>
                                {isApplied ? 'APPLIED ✓' : 'APPLY'}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Title & Description */}
                        <Text style={styles.cleanCouponTitle}>{offer.title}</Text>
                        <Text style={styles.cleanCouponDesc} numberOfLines={2}>
                          {offer.description || 'Valid on this order'}
                        </Text>

                        {/* Footer: Requirements & Terms */}
                        <View style={styles.cleanCouponFooter}>
                          <Text style={styles.cleanCouponTerms}>
                            {offer.minOrderValue > 0 ? `Min. order ₹${offer.minOrderValue}` : 'No minimum order'}
                            {offer.maxDiscountCap > 0 ? ` • Max savings ₹${offer.maxDiscountCap}` : ''}
                          </Text>

                          {!isEligible && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Feather name="lock" size={11} color="#EA580C" />
                              <Text style={styles.cleanLockedText}>
                                {ineligibility ? ineligibility.reason : `Add ₹${Math.max(0, (offer.minOrderValue || 0) - subtotal)} more`}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Bill Summary */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Bill Details</Text>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>

            {offerDiscount > 0 && (
              <View style={styles.billRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="tag" size={13} color="#10B981" />
                  <Text style={[styles.billLabel, { color: '#10B981', fontWeight: '800' }]}>
                    Stall Offer ({appliedOffer?.badgeText || 'Discount'})
                  </Text>
                </View>
                <Text style={[styles.billValue, { color: '#10B981', fontWeight: '900' }]}>
                  -₹{offerDiscount.toFixed(2)}
                </Text>
              </View>
            )}

            {(orderType === 'takeaway' || orderType === 'delivery') && packagingCharge > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Packaging Fee</Text>
                <Text style={styles.billValue}>₹{packagingCharge}</Text>
              </View>
            )}

            {orderType === 'delivery' && (
              <View style={styles.billRow}>
                <View>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  {!isFreeDelivery && freeThreshold > 0 && (
                    <Text style={styles.billSubHelpText}>
                      Free above ₹{freeThreshold} (Add ₹{Math.ceil(freeThreshold - subtotal)} more)
                    </Text>
                  )}
                </View>
                {isFreeDelivery ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.billLabel, { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                      ₹{rawDeliveryFee}
                    </Text>
                    <Text style={[styles.billValue, { color: '#10B981', fontWeight: '800' }]}>
                      FREE
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.billValue}>₹{deliveryFee}</Text>
                )}
              </View>
            )}

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Platform & Convenience Fee</Text>
              {orderType === 'delivery' ? (
                <Text style={styles.billValue}>₹5</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.billLabel, { textDecorationLine: 'line-through' }]}>₹5</Text>
                  <Text style={[styles.billValue, { color: '#10B981', fontWeight: '800' }]}>FREE</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.billRowTotal}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{grandTotal}</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Checkout Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>Total to Pay</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.bottomTotalAmount}>₹{grandTotal}</Text>
            {offerDiscount > 0 && (
              <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through', fontWeight: '700' }}>
                ₹{subtotal + packagingCharge}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            (loading || (orderType === 'delivery' && Boolean(store?.minDeliveryOrderValue > 0 && subtotal < store.minDeliveryOrderValue))) && styles.payButtonDisabled
          ]}
          onPress={handleInitiatePayment}
          disabled={loading || Boolean(orderType === 'delivery' && store?.minDeliveryOrderValue > 0 && subtotal < store.minDeliveryOrderValue)}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {orderType === 'delivery' ? 'Pay & Order Delivery' : 'Proceed to Pay'}
              </Text>
              <Feather name="arrow-right" size={17} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Razorpay WebView Modal */}
      <RazorpayModal
        visible={showRazorpayModal}
        options={razorpayOptions}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={() => setShowRazorpayModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  clearCartBtn: {
    padding: 6,
  },
  clearCartText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.error,
  },
  content: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 65, 35, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  storeLocation: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  orderPreferenceSection: {
    marginBottom: 12,
  },
  preferenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  preferenceSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  deliveryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryTimeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  orderTypeCard: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  preferenceSubRow: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  preferenceSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addressCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  requiredBadge: {
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.4,
  },
  addressInputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    minHeight: 68,
    textAlignVertical: 'top',
  },
  singleInputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  addressFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  addressFooterText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  minOrderNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  minOrderNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  freeDeliveryCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  freeDeliveryCardProgress: {
    backgroundColor: '#FFFBF5',
    borderColor: '#FED7AA',
  },
  freeDeliveryCardUnlocked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  freeDeliveryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  freeDeliveryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeDeliveryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  freeDeliverySub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  addMoreBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addMoreBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  billSubHelpText: {
    fontSize: 10,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  slotSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  preOrderToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  preOrderToggleActive: {
    backgroundColor: THEME.colors.primary,
  },
  preOrderToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  preOrderToggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 6,
  },
  modeTabActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(239, 65, 35, 0.05)',
  },
  modeTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '900',
  },
  slotsWrapper: {
    marginTop: 12,
  },
  slotSelectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  slotNoticeText: {
    fontSize: 11.5,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  slotNoticeBold: {
    color: THEME.colors.primary,
    fontWeight: '900',
  },
  slotsPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  kitchenPrepNote: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  immediatePrepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  immediatePrepText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    flex: 1,
  },
  asapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    gap: 3,
  },
  asapBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  slotsScroll: {
    gap: 8,
  },
  slotPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  slotPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  slotPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  outOfStockBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  outOfStockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  outOfStockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  outOfStockSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  removeOutOfStockBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  removeOutOfStockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemNameSoldOut: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  comboBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  comboBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  soldOutBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldOutBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  removeSoldOutItemBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeSoldOutItemText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  pairingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pairingsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  pairingsSubtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  pairingsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  pairingCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pairingImage: {
    width: '100%',
    height: 95,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  pairingName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  pairingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pairingPrice: {
    fontSize: 12.5,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  addPairingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  addPairingText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  itemVariant: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 10,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 10,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  quickPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    minHeight: 50,
  },
  studentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeadingNoMargin: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 5,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  inputLabelWithIcon: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  optionalHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailsInputField: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  securePaymentBanner: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securePaymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  securePaymentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 10,
  },
  billRowTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  bottomTotalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 100,
    gap: 8,
    ...THEME.shadows.primary,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(239, 65, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  browseButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  appliedOfferCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 18,
    padding: 14,
  },
  appliedOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appliedOfferBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appliedOfferBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  appliedOfferTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  appliedOfferSubtitle: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  ineligibleOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 65, 35, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 65, 35, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  ineligibleOfferText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
    flex: 1,
  },

  /* Zomato/Swiggy Offers & Coupons Hub Styles */
  offersHubContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    padding: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  offersHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offersHubIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersHubTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  offersHubSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  appliedSavingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 100,
  },
  appliedSavingsText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  couponCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  couponCardApplied: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  couponCardEligible: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFAF5',
  },
  couponCardLocked: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  couponTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  couponBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  couponBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  fullCartTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullCartTagText: {
    color: '#0369A1',
    fontSize: 9.5,
    fontWeight: '800',
  },
  categoryTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    color: '#B45309',
    fontSize: 9.5,
    fontWeight: '800',
  },
  couponTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  couponDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  couponTermsRow: {
    marginTop: 4,
  },
  couponTermsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  couponActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  couponSavingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  couponApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  couponApplyBtnActive: {
    backgroundColor: '#10B981',
  },
  couponApplyBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EA580C',
  },
  couponApplyBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  couponApplyBtnTextActive: {
    color: '#FFFFFF',
  },
  couponApplyBtnTextInactive: {
    color: '#EA580C',
  },
  couponLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  couponLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    flex: 1,
  },
  autoDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoDetectBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  presetChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  presetChipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#C2410C',
    fontWeight: '800',
  },
  cleanCouponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cleanCouponCardApplied: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  cleanCouponCardEligible: {
    borderColor: '#FED7AA',
  },
  cleanCouponCardLocked: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
  },
  cleanCouponTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cleanDiscountBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cleanDiscountBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '900',
  },
  cleanCodePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cleanCodePillText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cleanCampusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cleanCampusBadgeText: {
    color: '#1D4ED8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  cleanApplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cleanApplyBtnNormal: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  cleanApplyBtnActive: {
    backgroundColor: '#10B981',
  },
  cleanApplyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
  },
  cleanCouponTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  cleanCouponDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  cleanCouponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cleanCouponTerms: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cleanLockedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
});

export default CartScreen;
