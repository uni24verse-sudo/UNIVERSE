import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useSocket } from './SocketContext';

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

    socket.on('product_availability_update', handleProductAvailability);
    socket.on('store_menu_update', handleStoreMenu);
    socket.on('store_status_update', handleStoreStatus);

    return () => {
      socket.off('product_availability_update', handleProductAvailability);
      socket.off('store_menu_update', handleStoreMenu);
      socket.off('store_status_update', handleStoreStatus);
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
    }}>
      {children}
    </CartContext.Provider>
  );
};
