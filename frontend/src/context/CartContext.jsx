import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // Initialize from localStorage
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('universe_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [storeId, setStoreId] = useState(() => {
    return localStorage.getItem('universe_storeId') || null;
  });

  // Persist to localStorage whenever cart or storeId changes
  useEffect(() => {
    localStorage.setItem('universe_cart', JSON.stringify(cart));
    if (storeId) {
      localStorage.setItem('universe_storeId', storeId);
    } else {
      localStorage.removeItem('universe_storeId');
    }
  }, [cart, storeId]);

  const addToCart = (product, currentStoreId, variant = null) => {
    // If adding from a different store, clear cart
    if (storeId && storeId !== currentStoreId) {
      if (window.confirm("Adding items from another store will clear your current cart. Continue?")) {
        const newCartItemId = `${product._id}${variant ? '-' + variant.name : ''}`;
        setCart([{ ...product, quantity: 1, variant: variant?.name, price: variant ? variant.price : product.price, cartItemId: newCartItemId }]);
        setStoreId(currentStoreId);
      }
      return;
    }

    setStoreId(currentStoreId);
    setCart((prev) => {
      const targetId = `${product._id}${variant ? '-' + variant.name : ''}`;
      const existing = prev.find(item => (item.cartItemId || item._id) === targetId || (item._id === product._id && !item.variant && !variant));
      
      if (existing) {
        return prev.map(item => ((item.cartItemId || item._id) === targetId || (item._id === product._id && !item.variant && !variant))
          ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, variant: variant?.name, price: variant ? variant.price : product.price, cartItemId: targetId }];
    });
  };

  const removeFromCart = (targetId) => {
    setCart((prev) => {
      const newCart = prev.filter(item => (item.cartItemId || item._id) !== targetId);
      if (newCart.length === 0) setStoreId(null);
      return newCart;
    });
  };

  const updateQuantity = (targetId, delta) => {
    setCart((prev) => prev.map(item => {
      if ((item.cartItemId || item._id) === targetId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setStoreId(null);
    localStorage.removeItem('universe_cart');
    localStorage.removeItem('universe_storeId');
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, storeId, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};
