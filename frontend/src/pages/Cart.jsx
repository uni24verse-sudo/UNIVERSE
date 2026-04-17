import React, { useContext, useState, useEffect, useCallback } from 'react';
import { CartContext } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Trash2, Plus, Minus, ArrowLeft, CreditCard, Coins, ShoppingBag,
  ChevronRight, ShieldCheck, Store, Clock, User, Phone,
  CheckCircle, AlertCircle, X, Utensils
} from 'lucide-react';

const Cart = () => {
  const { cart, storeId, updateQuantity, removeFromCart, total, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState('Dine In');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('12:00');


  // Calculate order totals
  const subtotal = total;
  const deliveryFee = orderType === 'Take Away' ? (store?.packagingCharge || 0) : 0;
  const platformFee = 0;
  const finalTotal = subtotal + deliveryFee + platformFee;

  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${storeId}`);
      setStore(res.data);
    } catch (error) {
      console.error('Error fetching store:', error);
    }
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      setValidationError('Please enter your name to proceed');
      return;
    }
    if (!customerPhone || customerPhone.length < 10) {
      setValidationError('Please enter a valid 10-digit phone number');
      return;
    }

    if (isPreOrder) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      if (hours < 10 || hours >= 22) {
        setValidationError('Pre-orders are only available between 10:00 AM and 10:00 PM');
        return;
      }
      
      const now = new Date();
      const minimumTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 min buffer
      
      const selected = new Date();
      selected.setHours(hours, minutes, 0, 0);
      
      if (selected < minimumTime) {
        if (selected < now) {
          setValidationError('Please select a future time for today. Pre-orders are for today only.');
        } else {
          setValidationError('Pre-orders must be scheduled at least 30 minutes in advance');
        }
        return;
      }
    }

    setValidationError('');


    setLoading(true);

    try {
      // Step 1: Create Razorpay order (Backend no longer saves to DB at this point)
      const paymentRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/razorpay/create-order`, {
        amount: finalTotal,
        storeId: storeId
      });

      if (!paymentRes.data.success) {
        alert('Failed to initiate payment. Please try again.');
        setLoading(false);
        return;
      }

      // Prepare order data for verification step
      const orderData = {
        storeId,
        items: cart,
        totalAmount: finalTotal,
        paymentMethod: 'Razorpay',
        customerPhone,
        customerName,
        orderType,
        packagingChargeApplied: deliveryFee > 0,
        isPreOrder,
        scheduledTime: isPreOrder ? scheduledTime : null
      };


      // Step 2: Open Razorpay checkout
      const options = {
        key: paymentRes.data.keyId,
        amount: paymentRes.data.amount,
        currency: paymentRes.data.currency,
        name: store?.name || 'UniVerse',
        description: `Order from ${store?.name || 'UniVerse'}`,
        order_id: paymentRes.data.razorpayOrderId,
        handler: async function (response) {
          // Step 3: Verify payment and CREATE order on backend
          try {
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: orderData
            });

            if (verifyRes.data.success) {
              const savedOrder = verifyRes.data.order;
              // Add to recent orders for tracking
              const recentOrders = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
              const newRecentOrder = {
                id: savedOrder._id,
                orderNumber: savedOrder.orderNumber,
                storeName: store?.name || 'Store',
                market: store?.market || 'Campus',
                timestamp: Date.now(),
                status: 'Pending'
              };
              
              // Only keep unique orders, limit to 5
              const updatedRecent = [newRecentOrder, ...recentOrders.filter(o => o.id !== savedOrder._id)].slice(0, 5);
              localStorage.setItem('universe_recent_orders', JSON.stringify(updatedRecent));
              
              clearCart();
              navigate(`/order-tracker/${savedOrder._id}`);
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: customerName,
          contact: customerPhone
        },
        theme: {
          color: '#ef4123'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            // No need to delete order anymore as it wasn't created yet
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);

    } catch (error) {
      console.error('Error initiating checkout:', error);
      alert('Failed to initiate checkout. Please try again.');
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginTop: '4rem' }}>
          <ShoppingBag size={80} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Add items from your favorite stores</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '1rem 2rem',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Browse Stores
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(239, 65, 35, 0.08)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
            Secure Checkout
          </div>
        </div>

        <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Review Order</h1>
            {store && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>from {store.name}</p>}
          </div>
        </header>

        <div className="checkout-grid" style={{ 
          display: 'grid', 
          gap: '2rem', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' 
        }}>
          {/* Left: Items List */}
          <div>
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShoppingBag size={20} color="var(--primary)" /> Items in Cart
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {cart.map(item => (
                  <div key={item.cartItemId || item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {item.name}
                        {item.variant && <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>({item.variant})</span>}
                        {item.isCombo && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '6px', fontWeight: '800' }}>COMBO</span>}
                      </h4>
                      <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--secondary)', marginBottom: item.isCombo ? '0.5rem' : '0' }}>₹{item.price * item.quantity}</p>

                      {item.isCombo && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--surface-border)', paddingLeft: '0.5rem' }}>
                          {item.comboItems && item.comboItems.length > 0 && item.comboItems.map((ci, idx) => (
                            <div key={`ci-${idx}`} style={{ marginBottom: '0.1rem' }}>• {ci.quantity} {ci.name}</div>
                          ))}
                          {item.freeItems && item.freeItems.length > 0 && item.freeItems.map((fi, idx) => (
                            <div key={`fi-${idx}`} style={{ color: '#10b981', marginTop: '0.2rem' }}>+ Free {fi.quantity} {fi.name}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item._id, -1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '700', color: 'var(--text-primary)' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item._id, 1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartItemId || item._id)}
                      style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.6 }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Item Total</span>
                  <span>₹{total}</span>
                </div>
                {orderType === 'Take Away' && deliveryFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Packaging Fee</span>
                    <span style={{ color: 'var(--text-secondary)' }}>₹{deliveryFee}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Platform Fee</span>
                  <span style={{ color: 'var(--secondary)' }}>FREE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', borderTop: '1px dashed var(--surface-border)', paddingTop: '1rem' }}>
                  <span>To Pay</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Dining Preference</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setOrderType('Dine In')}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: '700', fontSize: '1rem',
                    background: orderType === 'Dine In' ? 'rgba(239, 65, 35, 0.04)' : '#f8fafc',
                    border: `2px solid ${orderType === 'Dine In' ? 'var(--primary)' : 'var(--surface-border)'}`,
                    color: orderType === 'Dine In' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  🍽️ Dine In
                </button>
                <button
                  onClick={() => setOrderType('Take Away')}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: '700', fontSize: '1rem',
                    background: orderType === 'Take Away' ? 'rgba(239, 65, 35, 0.04)' : '#f8fafc',
                    border: `2px solid ${orderType === 'Take Away' ? 'var(--primary)' : 'var(--surface-border)'}`,
                    color: orderType === 'Take Away' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  🛍️ Take Away
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Clock size={20} color="var(--primary)" /> Pre-order for Later?
                </h3>
                <div 
                  onClick={() => setIsPreOrder(!isPreOrder)}
                  style={{
                    width: '50px',
                    height: '26px',
                    background: isPreOrder ? 'var(--primary)' : '#e2e8f0',
                    borderRadius: '100px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: isPreOrder ? '26px' : '4px',
                    width: '20px',
                    height: '20px',
                    background: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                </div>
              </div>

              {isPreOrder && (
                <div style={{ 
                  padding: '1rem', 
                  background: 'rgba(239, 65, 35, 0.04)', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(239, 65, 35, 0.1)',
                  marginTop: '1rem',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Select your preferred pickup time (10 AM - 10 PM)
                  </p>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min="10:00"
                    max="22:00"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '2px solid var(--primary)',
                      background: 'white',
                      fontSize: '1.25rem',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700' }}>
                    <AlertCircle size={14} />
                    Note: Orders must be confirmed by vendor 15 mins before.
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CreditCard size={20} color="var(--primary)" /> Your Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                    <User size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--surface-border)',
                      background: '#f8fafc',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                    <Phone size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomerPhone(val);
                      if (validationError) setValidationError('');
                    }}
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--surface-border)',
                      background: '#f8fafc',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--surface-border)' }}>
                <ShieldCheck size={20} color="var(--primary)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Secure Payment via Razorpay</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>UPI • Cards • Wallets • Net Banking</p>
                </div>
              </div>

              {validationError && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  <AlertCircle size={18} />
                  {validationError}
                </div>
              )}

              <button
                onClick={handleCheckout}
                className="btn btn-primary"
                disabled={loading}
                style={{ marginTop: '1.5rem', height: '60px', borderRadius: '16px', fontSize: '1.125rem', width: '100%', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Processing...' : (
                  <>
                    Pay ₹{finalTotal} <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} />
                  </>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Secure transaction powered by Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;
