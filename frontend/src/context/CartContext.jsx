import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [storeId, setStoreId] = useState(null);

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
    setCart((prev) => prev.filter(item => (item.cartItemId || item._id) !== targetId));
    if (cart.length === 1) setStoreId(null); // Clear store attachment if cart empties
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
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, storeId, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};
