import React, { createContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { socket, connected } = useSocket();

  // Initialize from localStorage
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('universe_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [storeId, setStoreId] = useState(() => {
    return localStorage.getItem('universe_storeId') || null;
  });

  const [cartLocationId, setCartLocationId] = useState(() => {
    return localStorage.getItem('universe_cart_location_id') || null;
  });

  const [isStoreClosed, setIsStoreClosed] = useState(false);

  // Persist to localStorage whenever cart, storeId, or cartLocationId changes
  useEffect(() => {
    localStorage.setItem('universe_cart', JSON.stringify(cart));
    if (storeId) {
      localStorage.setItem('universe_storeId', storeId);
    } else {
      localStorage.removeItem('universe_storeId');
    }
    if (cartLocationId) {
      localStorage.setItem('universe_cart_location_id', cartLocationId);
    } else {
      localStorage.removeItem('universe_cart_location_id');
    }
  }, [cart, storeId, cartLocationId]);

  // Real-time synchronization of stock and menu changes for items currently in cart
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
      const products = data.products || data.store?.products;
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

  const addToCart = (product, currentStoreId, variant = null, storeLocationId = null) => {
    const activeLocId = storeLocationId || localStorage.getItem('universe_location_id');
    
    // If adding from a different store or different campus location, prompt to clear cart
    if (storeId && (String(storeId) !== String(currentStoreId) || (cartLocationId && activeLocId && String(cartLocationId) !== String(activeLocId)))) {
      if (window.confirm("Adding items from another store or campus will clear your current cart. Continue?")) {
        const newCartItemId = `${product._id}${variant ? '-' + variant.name : ''}`;
        setCart([{ 
          ...product, 
          quantity: 1, 
          variant: variant?.name, 
          price: variant ? variant.price : product.price, 
          cartItemId: newCartItemId,
          isAvailable: product.isAvailable !== false 
        }]);
        setStoreId(currentStoreId);
        if (activeLocId) setCartLocationId(activeLocId);
      }
      return;
    }

    setStoreId(currentStoreId);
    if (activeLocId) setCartLocationId(activeLocId);

    setCart((prev) => {
      const targetId = `${product._id}${variant ? '-' + variant.name : ''}`;
      const existing = prev.find(item => (item.cartItemId || item._id) === targetId || (item._id === product._id && !item.variant && !variant));
      
      if (existing) {
        return prev.map(item => ((item.cartItemId || item._id) === targetId || (item._id === product._id && !item.variant && !variant))
          ? { ...item, quantity: item.quantity + 1, isAvailable: product.isAvailable !== false } : item);
      }
      return [...prev, { 
        ...product, 
        quantity: 1, 
        variant: variant?.name, 
        price: variant ? variant.price : product.price, 
        cartItemId: targetId,
        isAvailable: product.isAvailable !== false 
      }];
    });
  };

  const removeFromCart = (targetId) => {
    setCart((prev) => {
      const newCart = prev.filter(item => (item.cartItemId || item._id) !== targetId);
      if (newCart.length === 0) {
        setStoreId(null);
        setCartLocationId(null);
      }
      return newCart;
    });
  };

  const removeOutOfStockItems = () => {
    setCart((prev) => {
      const remaining = prev.filter(item => item.isAvailable !== false);
      if (remaining.length === 0) {
        setStoreId(null);
        setCartLocationId(null);
      }
      return remaining;
    });
  };

  const updateQuantity = (targetId, delta) => {
    setCart((prev) => prev.map(item => {
      if ((item.cartItemId || item._id) === targetId) {
        // Prevent increment if item is marked out of stock
        if (delta > 0 && item.isAvailable === false) return item;
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setStoreId(null);
    setCartLocationId(null);
    localStorage.removeItem('universe_cart');
    localStorage.removeItem('universe_storeId');
    localStorage.removeItem('universe_cart_location_id');
  };

  const reorder = (items, targetStoreId, targetLocationId = null) => {
    const newCart = (items || []).map(item => ({
      _id: item.productId || item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      variant: item.variant || null,
      cartItemId: `${item.productId || item._id}${item.variant ? '-' + item.variant : ''}`,
      isAvailable: item.isAvailable !== false
    }));
    setCart(newCart);
    if (targetStoreId) {
      setStoreId(targetStoreId);
    }
    const activeLocId = targetLocationId || localStorage.getItem('universe_location_id');
    if (activeLocId) {
      setCartLocationId(activeLocId);
    }
  };

  const hasOutOfStockItems = cart.some(item => item.isAvailable === false);
  const outOfStockItems = cart.filter(item => item.isAvailable === false);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      storeId, 
      cartLocationId,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      reorder, 
      total,
      hasOutOfStockItems,
      outOfStockItems,
      removeOutOfStockItems,
      isStoreClosed
    }}>
      {children}
    </CartContext.Provider>
  );
};
