import React, { useContext } from 'react';
import { Plus, Minus } from 'lucide-react';
import { CartContext } from '../context/CartContext';

const QuantitySelector = ({ product, storeId, onVariantClick, storeClosed }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useContext(CartContext);

  // Find all items in cart belonging to this product
  const cartItems = cart.filter(item => item._id === product._id);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const hasCustomizations = (product.variants && product.variants.length > 0) || (product.addOns && product.addOns.length > 0);

  const handleIncrement = () => {
    if (storeClosed) return;
    if (hasCustomizations) {
      // If has variants or add-ons, open modal to let user customize
      onVariantClick(product);
    } else {
      addToCart(product, storeId);
    }
  };

  const handleDecrement = () => {
    if (storeClosed || totalQuantity === 0) return;
    
    const lastItem = cartItems[cartItems.length - 1];
    const targetId = lastItem.cartItemId || lastItem._id;

    if (lastItem.quantity > 1) {
      updateQuantity(targetId, -1);
    } else {
      removeFromCart(targetId);
    }
  };

  const isUnavailable = product.isAvailable === false;

  if (storeClosed) {
    return null;
  }

  if (isUnavailable) {
    return (
      <button className="btn btn-primary quantity-btn-disabled" disabled>
        SOLD
      </button>
    );
  }

  if (totalQuantity === 0) {
    return (
      <button 
        className="quantity-selector-add"
        onClick={handleIncrement}
        aria-label={`Add ${product.name} to cart`}
      >
        <span className="add-text">ADD</span>
        <Plus size={14} className="add-plus" strokeWidth={3} />
      </button>
    );
  }

  return (
    <div className="quantity-selector-active">
      <button className="qty-ctrl-btn" onClick={handleDecrement} aria-label="Decrease quantity">
        <Minus size={16} strokeWidth={3} />
      </button>
      <span className="qty-display">{totalQuantity}</span>
      <button className="qty-ctrl-btn" onClick={handleIncrement} aria-label="Increase quantity">
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
};

export default QuantitySelector;
