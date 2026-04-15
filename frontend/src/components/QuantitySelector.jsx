import React, { useContext } from 'react';
import { Plus, Minus } from 'lucide-react';
import { CartContext } from '../context/CartContext';

const QuantitySelector = ({ product, storeId, onVariantClick, storeClosed }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useContext(CartContext);

  // Find all items in cart belonging to this product
  // This handles items with and without variants
  const cartItems = cart.filter(item => item._id === product._id);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const hasVariants = product.variants && product.variants.length > 0;

  const handleIncrement = () => {
    if (storeClosed) return;
    if (hasVariants) {
      // If has variants, open modal to let user choose which variant to add
      onVariantClick(product);
    } else {
      addToCart(product, storeId);
    }
  };

  const handleDecrement = () => {
    if (storeClosed || totalQuantity === 0) return;
    
    // For variants, we decrement the last item in the cartItems list for this product
    // For simple items, it's just the one item
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
    return (
      <button className="btn btn-primary quantity-btn-disabled" disabled>
        CLOSED
      </button>
    );
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
      >
        <span className="add-text">ADD</span>
        <Plus size={14} className="add-plus" strokeWidth={3} />
      </button>
    );
  }

  return (
    <div className="quantity-selector-active">
      <button className="qty-ctrl-btn" onClick={handleDecrement}>
        <Minus size={16} strokeWidth={3} />
      </button>
      <span className="qty-display">{totalQuantity}</span>
      <button className="qty-ctrl-btn" onClick={handleIncrement}>
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
};

export default QuantitySelector;
