import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [storeId, setStoreId] = useState(null);

  const addToCart = (product, currentStoreId) => {
    // If adding from a different store, clear cart
    if (storeId && storeId !== currentStoreId) {
      if (window.confirm("Adding items from another store will clear your current cart. Continue?")) {
        setCart([{ ...product, quantity: 1 }]);
        setStoreId(currentStoreId);
      }
      return;
    }

    setStoreId(currentStoreId);
    setCart((prev) => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter(item => item._id !== productId));
    if (cart.length === 1) setStoreId(null); // Clear store attachment if cart empties
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => prev.map(item => {
      if (item._id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setStoreId(null);
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, storeId, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};
