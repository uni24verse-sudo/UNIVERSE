import React, { useContext, useState, useEffect, useCallback } from 'react';
import { CartContext } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
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
  const [showPayment, setShowPayment] = useState(false);
  const [showPaidButton, setShowPaidButton] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentCheckInterval, setPaymentCheckInterval] = useState(null);

  // Calculate order totals
  const subtotal = total;
  const deliveryFee = orderType === 'Dine In' ? 0 : 20;
  const platformFee = Math.round(subtotal * 0.02);
  const finalTotal = subtotal + deliveryFee + platformFee;

  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
    // Cleanup payment check interval on unmount
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${storeId}`);
      setStore(res.data);
    } catch (error) {
      console.error('Error fetching store:', error);
    }
  };

  const generateUpiLink = useCallback(() => {
    if (!store?.admin?.upiId || !currentOrder) return null;
    return `upi://pay?pa=${store.admin.upiId}&pn=${store.name.replace(/ /g, '%20')}&am=${finalTotal}&cu=INR&tn=Order%20from%20UniVerse&tr=${currentOrder._id}`;
  }, [store, currentOrder, finalTotal]);

  const checkPaymentStatus = useCallback(async () => {
    if (!currentOrder) return;

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${currentOrder._id}`);
      const order = res.data;

      if (order.paymentStatus === 'Confirmed') {
        setPaymentStatus('completed');
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval);
          setPaymentCheckInterval(null);
        }

        // Save to recent orders
        const recentOrders = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
        const updatedOrders = [
          {
            id: order._id,
            orderNumber: order.orderNumber,
            storeName: store?.name || 'Restaurant',
            market: store?.market || '',
            storeId: store?._id || '',
            status: order.status || 'Pending',
            timestamp: Date.now()
          },
          ...recentOrders.filter(o => o.id !== order._id)
        ].slice(0, 10);
        localStorage.setItem('universe_recent_orders', JSON.stringify(updatedOrders));

        // Clear cart and redirect
        clearCart();
        setTimeout(() => {
          navigate(`/order-tracker/${order._id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  }, [currentOrder, store, clearCart, navigate, paymentCheckInterval]);

  const handlePaymentComplete = useCallback(() => {
    setPaymentStatus('initiated');
    // Start checking payment status every 3 seconds
    const interval = setInterval(checkPaymentStatus, 3000);
    setPaymentCheckInterval(interval);
  }, [checkPaymentStatus]);

  const initiateOrder = async () => {
    if (!store) {
      alert('Store information not available');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (paymentMethod === 'UPI' && !customerPhone) {
      alert('Please enter your phone number');
      return;
    }

    if (paymentMethod === 'UPI' && !customerName) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        storeId,
        items: cart,
        totalAmount: finalTotal,
        paymentMethod,
        customerPhone: paymentMethod === 'UPI' ? customerPhone : '',
        customerName: paymentMethod === 'UPI' ? customerName : '',
        orderType,
        packagingChargeApplied: deliveryFee > 0
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/create`, orderData);
      setCurrentOrder(res.data);

      // Save payment state to localStorage
      localStorage.setItem('universe_payment_state', JSON.stringify({
        showPaymentScreen: true,
        currentOrder: res.data,
        paymentStatus: 'pending',
        customerPhone,
        customerName,
        paymentMethod,
        orderType
      }));

      if (paymentMethod === 'Cash') {
        // For cash orders, go directly to tracker
        clearCart();
        navigate(`/order-tracker/${res.data._id}`);
      } else {
        // For UPI orders, show payment screen
        setShowPayment(true);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmation = async () => {
    // Manual confirmation by user
    handlePaymentComplete();
  };

  const handlePaymentCancellation = async () => {
    try {
      // Cancel the order
      if (currentOrder) {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${currentOrder._id}`);
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
    } finally {
      // Reset payment state
      setShowPayment(false);
      setCurrentOrder(null);
      setPaymentStatus('pending');
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        setPaymentCheckInterval(null);
      }
      localStorage.removeItem('universe_payment_state');
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (paymentMethod === 'UPI' && !customerPhone) {
      alert('Please enter your phone number for UPI payment');
      return;
    }

    if (paymentMethod === 'UPI' && !customerName) {
      alert('Please enter your name for UPI payment');
      return;
    }

    // Create order
    await initiateOrder();
  };

  // Payment Screen Component
  const PaymentScreen = () => {
    if (!showPayment || !currentOrder) return null;

    const upiLink = generateUpiLink();

    // Show paid button after 15 seconds
    useEffect(() => {
      const timer = setTimeout(() => {
        setShowPaidButton(true);
      }, 15000);

      return () => clearTimeout(timer);
    }, []);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'var(--glass-bg)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          border: '1px solid var(--surface-border)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '1.5rem',
              fontSize: '1.25rem',
              fontWeight: '800'
            }}>
              Scan QR to Pay
            </h2>

            <div style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              marginBottom: '1.5rem',
              display: 'inline-block'
            }}>
              <QRCodeSVG value={upiLink} size={200} level="H" />
            </div>

            <div style={{ 
              textAlign: 'center', 
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px'
            }}>
              <p style={{ 
                margin: '0 0 0.5rem 0', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)' 
              }}>
                Total Cart Amount
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '1.75rem', 
                fontWeight: '800', 
                color: 'var(--error)' 
              }}>
                ₹{finalTotal}
              </p>
            </div>

            {/* Paid Successfully Button - Shows after 15 seconds */}
            {showPaidButton ? (
              <button
                onClick={handlePaymentConfirmation}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'var(--secondary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle size={20} />
                Paid Successfully
              </button>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--primary)',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 0.5rem'
                }} />
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  color: 'var(--text-secondary)' 
                }}>
                  Waiting for payment...
                </p>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)' 
                }}>
                  "Paid Successfully" button will appear in 15 seconds
                </p>
              </div>
            )}

            <button
              onClick={handlePaymentCancellation}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    );
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
      <PaymentScreen />
      <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
            Secure Checkout
          </div>
        </div>

        <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Review Order</h1>
            {store && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>from {store.name}</p>}
          </div>
        </header>

        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '12px' }}>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item._id, -1)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '700' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item._id, 1)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
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

              <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
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
                    background: orderType === 'Dine In' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${orderType === 'Dine In' ? 'var(--primary)' : 'transparent'}`,
                    color: orderType === 'Dine In' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  🍽️ Dine In
                </button>
                <button
                  onClick={() => setOrderType('Take Away')}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: '700', fontSize: '1rem',
                    background: orderType === 'Take Away' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${orderType === 'Take Away' ? 'var(--primary)' : 'transparent'}`,
                    color: orderType === 'Take Away' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  🛍️ Take Away
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Payment Method</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* UPI Option */}
                <div
                  onClick={() => setPaymentMethod('UPI')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: paymentMethod === 'UPI' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${paymentMethod === 'UPI' ? 'var(--primary)' : 'transparent'}`,
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700' }}>UPI Payment</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Instant & Safe</p>
                    </div>
                    {paymentMethod === 'UPI' && <ShieldCheck size={20} color="var(--primary)" />}
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          background: 'white',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#0f172a',
                          marginBottom: '1rem'
                        }}
                      />
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                        Phone Number (for order confirmation)
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          background: 'white',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#0f172a'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Cash Option */}
                <div
                  onClick={() => setPaymentMethod('Cash')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: paymentMethod === 'Cash' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${paymentMethod === 'Cash' ? 'var(--secondary)' : 'transparent'}`,
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700' }}>Pay with Cash</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>At the counter</p>
                    </div>
                    {paymentMethod === 'Cash' && <ShieldCheck size={20} color="var(--secondary)" />}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="btn btn-primary"
                disabled={loading || !paymentMethod}
                style={{ marginTop: '2rem', height: '60px', borderRadius: '16px', fontSize: '1.125rem', width: '100%' }}
              >
                {loading ? 'Placing Order...' : (
                  <>
                    {paymentMethod === 'UPI' ? 'Proceed to Payment' : 'Place Order'} <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} />
                  </>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Secure transaction powered by UniVerse
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;
