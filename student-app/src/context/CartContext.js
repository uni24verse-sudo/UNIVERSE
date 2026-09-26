import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useSocket } from './SocketContext';
import apiClient from '../api/client';

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { socket, connected } = useSocket();

  const [cart, setCart] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [cartLocationId, setCartLocationId] = useState(null);
  const [isStoreClosed, setIsStoreClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  // Fetch offers for the active stall
  useEffect(() => {
    if (!storeId || storeId === 'null' || storeId === 'undefined') {
      setOffers([]);
      return;
    }
    apiClient.get(`/store/${storeId}/offers`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setOffers(res.data);
        } else {
          setOffers([]);
        }
      })
      .catch(() => {
        setOffers([]);
      });
  }, [storeId]);

  // Rehydrate cart from AsyncStorage
  useEffect(() => {
    const loadCart = async () => {
      try {
        const [savedCart, savedStoreId, savedStoreName, savedLocId] = await Promise.all([
          AsyncStorage.getItem('universe_cart'),
          AsyncStorage.getItem('universe_storeId'),
          AsyncStorage.getItem('universe_storeName'),
          AsyncStorage.getItem('universe_cart_location_id'),
        ]);

        if (savedCart) setCart(JSON.parse(savedCart));
        if (savedStoreId) setStoreId(savedStoreId);
        if (savedStoreName) setStoreName(savedStoreName);
        if (savedLocId) setCartLocationId(savedLocId);
      } catch (err) {
        console.error('Failed to load saved cart:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  // Save cart to AsyncStorage
  useEffect(() => {
    if (loading) return;

    AsyncStorage.setItem('universe_cart', JSON.stringify(cart)).catch(() => {});
    if (storeId) {
      AsyncStorage.setItem('universe_storeId', storeId).catch(() => {});
    } else {
      AsyncStorage.removeItem('universe_storeId').catch(() => {});
    }
    if (storeName) {
      AsyncStorage.setItem('universe_storeName', storeName).catch(() => {});
    } else {
      AsyncStorage.removeItem('universe_storeName').catch(() => {});
    }
    if (cartLocationId) {
      AsyncStorage.setItem('universe_cart_location_id', cartLocationId).catch(() => {});
    } else {
      AsyncStorage.removeItem('universe_cart_location_id').catch(() => {});
    }
  }, [cart, storeId, storeName, cartLocationId, loading]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket || !connected) return;

    // When vendor toggles product stock (In-Stock / Out-of-Stock)
    const handleProductAvailability = ({ storeId: updatedStoreId, productId, isAvailable }) => {
      setCart((prev) => {
        const hasMatch = prev.some(item => 
          String(item._id) === String(productId) || String(item.productId) === String(productId)
        );
        if (!hasMatch) return prev;

        return prev.map(item => {
          if (String(item._id) === String(productId) || String(item.productId) === String(productId)) {
            return { ...item, isAvailable: isAvailable !== false };
          }
          return item;
        });
      });
    };

    // When vendor adds/edits/updates products
    const handleStoreMenu = (data) => {
      const products = data?.products || data?.store?.products;
      if (!Array.isArray(products)) return;

      setCart((prev) => {
        let changed = false;
        const updated = prev.map(item => {
          const pId = String(item._id || item.productId);
          const matched = products.find(p => String(p._id || p.id) === pId);
          if (matched) {
            const newAvailability = matched.isAvailable !== false;
            if (item.isAvailable !== newAvailability) {
              changed = true;
              return { ...item, isAvailable: newAvailability };
            }
          }
          return item;
        });
        return changed ? updated : prev;
      });
    };

    // When stall is turned ON or OFF
    const handleStoreStatus = ({ storeId: updatedStoreId, isOpen }) => {
      if (storeId && String(storeId) === String(updatedStoreId)) {
        setIsStoreClosed(isOpen === false);
      }
    };

    // When stall vendor updates or toggles offers live
    const handleOffersUpdate = ({ storeId: updatedStoreId, offers: newOffers }) => {
      if (storeId && String(storeId) === String(updatedStoreId) && Array.isArray(newOffers)) {
        setOffers(newOffers);
      }
    };

    socket.on('product_availability_update', handleProductAvailability);
    socket.on('store_menu_update', handleStoreMenu);
    socket.on('store_status_update', handleStoreStatus);
    socket.on('store_offers_update', handleOffersUpdate);

    return () => {
      socket.off('product_availability_update', handleProductAvailability);
      socket.off('store_menu_update', handleStoreMenu);
      socket.off('store_status_update', handleStoreStatus);
      socket.off('store_offers_update', handleOffersUpdate);
    };
  }, [socket, connected, storeId]);

  const addToCart = (product, currentStoreId, currentStoreName = '', variant = null, storeLocationId = null) => {
    const targetId = `${product._id || product.id}${variant ? '-' + variant.name : ''}`;

    // Prompt if adding from different store or campus
    if (storeId && String(storeId) !== String(currentStoreId)) {
      Alert.alert(
        "Replace Cart Items?",
        "Your cart contains dishes from another stall. Do you want to clear your current cart and add this dish instead?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => {
              setCart([{
                ...product,
                _id: product._id || product.id,
                quantity: 1,
                variant: variant?.name || null,
                price: variant ? variant.price : product.price,
                dietaryPreference: product.dietaryPreference || 'veg',
                cartItemId: targetId,
                isAvailable: product.isAvailable !== false,
              }]);
              setStoreId(currentStoreId);
              setStoreName(currentStoreName);
              if (storeLocationId) setCartLocationId(storeLocationId);
            }
          }
        ]
      );
      return;
    }

    setStoreId(currentStoreId);
    if (currentStoreName) setStoreName(currentStoreName);
    if (storeLocationId) setCartLocationId(storeLocationId);

    setCart((prev) => {
      const existing = prev.find(item => (item.cartItemId || item._id) === targetId);
      if (existing) {
        return prev.map(item => (item.cartItemId || item._id) === targetId
          ? { ...item, quantity: item.quantity + 1, isAvailable: product.isAvailable !== false }
          : item
        );
      }
      return [...prev, {
        ...product,
        _id: product._id || product.id,
        quantity: 1,
        variant: variant?.name || null,
        price: variant ? variant.price : product.price,
        dietaryPreference: product.dietaryPreference || 'veg',
        cartItemId: targetId,
        isAvailable: product.isAvailable !== false,
      }];
    });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.cartItemId === cartItemId || item._id === cartItemId) {
          // Prevent increment if item is out of stock
          if (delta > 0 && item.isAvailable === false) {
            return item;
          }
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => {
      const updated = prev.filter(item => item.cartItemId !== cartItemId && item._id !== cartItemId);
      if (updated.length === 0) {
        setStoreId(null);
        setStoreName('');
        setCartLocationId(null);
        setIsStoreClosed(false);
      }
      return updated;
    });
  };

  const removeOutOfStockItems = () => {
    setCart(prev => {
      const remaining = prev.filter(item => item.isAvailable !== false);
      if (remaining.length === 0) {
        setStoreId(null);
        setStoreName('');
        setCartLocationId(null);
        setIsStoreClosed(false);
      }
      return remaining;
    });
  };

  const clearCart = () => {
    setCart([]);
    setStoreId(null);
    setStoreName('');
    setCartLocationId(null);
    setIsStoreClosed(false);
  };

  const getItemQuantity = (productId, variantName = null) => {
    const targetId = `${productId}${variantName ? '-' + variantName : ''}`;
    const found = cart.find(item => (item.cartItemId || item._id) === targetId || (item._id === productId && !item.variant && !variantName));
    return found ? found.quantity : 0;
  };

  const reorder = (items, targetStoreId, targetStoreName, targetLocationId) => {
    setStoreId(targetStoreId);
    setStoreName(targetStoreName);
    setCartLocationId(targetLocationId);
    setCart(items.map(it => ({
      _id: it.productId || it._id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      variant: it.variant || null,
      dietaryPreference: it.dietaryPreference || 'veg',
      cartItemId: `${it.productId || it._id}${it.variant ? '-' + it.variant : ''}`,
      isAvailable: true,
      image: it.image || '',
    })));
  };

  const hasOutOfStockItems = cart.some(item => item.isAvailable === false);
  const outOfStockItems = cart.filter(item => item.isAvailable === false);

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

  // Deterministic Student Offers & Deals Calculator
  const pricing = useMemo(() => {
    let originalSubtotal = 0;
    cart.forEach(item => {
      originalSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    });

    const activeOffers = (Array.isArray(offers) ? offers : []).filter(o => o && o.isActive !== false);
    const eligibleOffers = [];
    const ineligibleOffers = [];

    for (const offer of activeOffers) {
      const minOrder = Number(offer.minOrderValue) || 0;
      const val = Number(offer.discountValue) || 0;
      const maxCap = Number(offer.maxDiscountCap) || 0;
      const targetCats = Array.isArray(offer.targetCategories)
        ? offer.targetCategories.map(c => c.toLowerCase().trim())
        : [];

      if (originalSubtotal < minOrder) {
        ineligibleOffers.push({
          ...offer,
          shortfall: minOrder - originalSubtotal,
          reason: `Add ₹${Math.round(minOrder - originalSubtotal)} more to unlock this deal`
        });
        continue;
      }

      let discount = 0;
      if (offer.discountType === 'PERCENTAGE_CART') {
        const raw = originalSubtotal * (val / 100);
        discount = maxCap > 0 ? Math.min(raw, maxCap) : raw;
      } else if (offer.discountType === 'PERCENTAGE_CATEGORY') {
        let catSubtotal = 0;
        cart.forEach(item => {
          if (targetCats.includes((item.category || '').toLowerCase().trim())) {
            catSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
          }
        });
        if (catSubtotal > 0) {
          const raw = catSubtotal * (val / 100);
          discount = maxCap > 0 ? Math.min(raw, maxCap) : raw;
        }
      } else if (offer.discountType === 'FLAT_PRICE_CATEGORY') {
        cart.forEach(item => {
          if (targetCats.includes((item.category || '').toLowerCase().trim())) {
            const unitPrice = Number(item.price) || 0;
            if (unitPrice > val) {
              discount += (unitPrice - val) * (Number(item.quantity) || 1);
            }
          }
        });
        if (maxCap > 0 && discount > maxCap) discount = maxCap;
      } else if (offer.discountType === 'FLAT_DISCOUNT_CART') {
        discount = Math.min(val, originalSubtotal);
      }

      if (discount > 0) {
        eligibleOffers.push({
          ...offer,
          potentialDiscount: Math.round(discount * 100) / 100
        });
      }
    }

    let selectedEvaluation = null;
    if (selectedOfferId === 'NONE') {
      selectedEvaluation = null;
    } else if (selectedOfferId) {
      selectedEvaluation = eligibleOffers.find(e => String(e.id) === String(selectedOfferId));
    }

    if (!selectedEvaluation && selectedOfferId !== 'NONE' && eligibleOffers.length > 0) {
      selectedEvaluation = eligibleOffers.reduce((best, curr) => curr.potentialDiscount > best.potentialDiscount ? curr : best);
    }

    const discountAmount = selectedEvaluation ? selectedEvaluation.potentialDiscount : 0;
    const discountedSubtotal = Math.max(0, originalSubtotal - discountAmount);

    return {
      originalSubtotal,
      discountAmount,
      discountedSubtotal,
      appliedOffer: selectedEvaluation ? {
        id: selectedEvaluation.id,
        code: selectedEvaluation.code || '',
        title: selectedEvaluation.title,
        discountType: selectedEvaluation.discountType,
        discountValue: selectedEvaluation.discountValue,
        badgeText: selectedEvaluation.badgeText || (
          selectedEvaluation.discountType?.includes('PERCENTAGE') 
            ? `${selectedEvaluation.discountValue}% OFF` 
            : `₹${selectedEvaluation.discountValue} OFF`
        ),
        discountAmount,
        isGlobal: Boolean(selectedEvaluation.isGlobal)
      } : null,
      eligibleOffers,
      ineligibleOffers
    };
  }, [cart, offers, selectedOfferId]);

  const applyCoupon = (code) => {
    if (!code || !code.trim()) {
      return { success: false, message: 'Please enter a coupon code' };
    }
    const cleanCode = code.trim().toUpperCase();
    const activeOffers = (Array.isArray(offers) ? offers : []).filter(o => o && o.isActive !== false);
    const matched = activeOffers.find(o => (o.code || '').toUpperCase() === cleanCode);
    if (!matched) {
      return { success: false, message: `Coupon code "${cleanCode}" is invalid or expired` };
    }
    const eligible = pricing.eligibleOffers.find(e => String(e.id) === String(matched.id));
    if (!eligible) {
      const inelig = pricing.ineligibleOffers.find(ie => String(ie.id) === String(matched.id));
      return { success: false, message: inelig?.reason || `Minimum order requirement not met for "${cleanCode}"` };
    }
    setSelectedOfferId(matched.id);
    return { success: true, message: `Coupon "${cleanCode}" applied! Saved ₹${eligible.potentialDiscount}` };
  };

  const removeCoupon = () => {
    setSelectedOfferId('NONE');
  };

  return (
    <CartContext.Provider value={{
      cart,
      storeId,
      storeName,
      cartLocationId,
      isStoreClosed,
      totalItems,
      subtotal,
      hasOutOfStockItems,
      outOfStockItems,
      removeOutOfStockItems,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getItemQuantity,
      reorder,
      offers,
      selectedOfferId,
      setSelectedOfferId,
      appliedOffer: pricing.appliedOffer,
      discountAmount: pricing.discountAmount,
      discountedSubtotal: pricing.discountedSubtotal,
      eligibleOffers: pricing.eligibleOffers,
      ineligibleOffers: pricing.ineligibleOffers,
      applyCoupon,
      removeCoupon
    }}>
      {children}
    </CartContext.Provider>
  );
};
