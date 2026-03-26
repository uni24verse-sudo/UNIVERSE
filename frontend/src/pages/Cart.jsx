import React, { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, Plus, Minus, ArrowLeft, CreditCard, Coins, ShoppingBag, ChevronRight, ShieldCheck, Store } from 'lucide-react';

const Cart = () => {
  const { cart, storeId, updateQuantity, removeFromCart, total, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'Cash' or 'UPI'
  const [orderType, setOrderType] = useState('Dine In');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending', 'initiated', 'completed'
  const [paymentCheckInterval, setPaymentCheckInterval] = useState(null);

  useEffect(() => {
    // Restore payment state from localStorage on mount
    const savedPaymentState = localStorage.getItem('universe_payment_state');
    if (savedPaymentState) {
      try {
        const paymentState = JSON.parse(savedPaymentState);
        if (paymentState.showPaymentScreen && paymentState.currentOrder) {
          setShowPaymentScreen(true);
          setCurrentOrder(paymentState.currentOrder);
          setPaymentStatus(paymentState.paymentStatus);
          setCustomerPhone(paymentState.customerPhone || '');
          setPaymentMethod(paymentState.paymentMethod || 'UPI');
          setOrderType(paymentState.orderType || 'Dine In');
          
          // Restart payment checking if it was initiated
          if (paymentState.paymentStatus === 'initiated') {
            handlePaymentComplete();
          }
        }
      } catch (err) {
        console.error('Error restoring payment state:', err);
        localStorage.removeItem('universe_payment_state');
      }
    }
  }, []);

  useEffect(() => {
    // Save payment state to localStorage whenever it changes
    if (showPaymentScreen && currentOrder) {
      const paymentState = {
        showPaymentScreen,
        currentOrder,
        paymentStatus,
        customerPhone,
        paymentMethod,
        orderType
      };
      localStorage.setItem('universe_payment_state', JSON.stringify(paymentState));
    } else {
      localStorage.removeItem('universe_payment_state');
    }
  }, [showPaymentScreen, currentOrder, paymentStatus, customerPhone, paymentMethod, orderType]);

  useEffect(() => {
    if (storeId) {
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${storeId}`)
        .then(res => setStore(res.data))
        .catch(err => console.error(err));
    }
  }, [storeId]);

  if (cart.length === 0) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', textAlign: 'center' }}>
        <div style={{ background: 'var(--glass-bg)', padding: '3rem', borderRadius: '32px', border: '1px solid var(--surface-border)' }}>
          <ShoppingBag size={64} color="var(--primary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Scan a store QR code or browse vendors to start ordering.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }}>Go Home</button>
        </div>
      </div>
    );
  }

  const packagingFee = orderType === 'Take Away' ? (store?.packagingCharge || 0) : 0;
  const finalTotal = total + packagingFee;

  const initiatePayment = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (paymentMethod === 'UPI' && !customerPhone) {
      alert("Please enter your Phone Number.");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        storeId,
        items: cart.map(item => ({ 
          name: item.name, 
          price: item.price, 
          quantity: item.quantity, 
          variant: item.variant,
          isCombo: item.isCombo || false,
          comboItems: item.comboItems || [],
          freeItems: item.freeItems || []
        })),
        totalAmount: finalTotal,
        paymentMethod,
        customerPhone,
        orderType,
        packagingChargeApplied: packagingFee
      };

      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/orders/create', orderData);
      const newOrder = res.data;
      
      setCurrentOrder(newOrder);
      setShowPaymentScreen(true);
      setPaymentStatus('initiated');
      
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert('Failed to create order: ' + msg);
      console.error('Order creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
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
        
        // Save to Recent Orders in localStorage
        const recentOrders = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
        const updatedOrders = [
          { 
            id: order._id, 
            orderNumber: order.orderNumber, 
            storeName: store.name, 
            market: store.market,
            storeId: store._id,
            status: order.status || 'Pending',
            timestamp: Date.now() 
          },
          ...recentOrders.filter(o => o.id !== order._id)
        ].slice(0, 10);
        localStorage.setItem('universe_recent_orders', JSON.stringify(updatedOrders));

        clearCart();
        setTimeout(() => {
          navigate(`/order-tracker/${order._id}`);
        }, 2000);
      }
    } catch (err) {
      console.error('Payment status check error:', err);
    }
  };

  const handlePaymentComplete = () => {
    // Start checking payment status every 3 seconds
    const interval = setInterval(checkPaymentStatus, 3000);
    setPaymentCheckInterval(interval);
    
    // Also check immediately
    checkPaymentStatus();
  };

  const handlePaymentConfirmation = async () => {
    // Manual confirmation by user
    setPaymentStatus('initiated');
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
      setShowPaymentScreen(false);
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
    if (paymentMethod === 'Cash') {
      // For cash orders, proceed normally
      await initiatePayment();
      if (currentOrder) {
        clearCart();
        navigate(`/order-tracker/${currentOrder._id}`);
      }
    } else {
      // For UPI orders, go to payment screen
      await initiatePayment();
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
  }, [paymentCheckInterval]);

  const upiLink = store?.admin?.upiId 
    ? `upi://pay?pa=${store.admin.upiId}&pn=${store.name.replace(/ /g, '%20')}&am=${finalTotal}&cu=INR&tn=Order%20from%20UniVerse&tr=${currentOrder?._id || Math.random().toString(36).substring(7)}`
    : null;

  // Payment Screen Component
  const PaymentScreen = () => {
    if (!showPaymentScreen || !currentOrder) return null;

    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'rgba(0,0,0,0.9)', 
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
          {paymentStatus === 'completed' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem' 
              }}>
                <span style={{ fontSize: '3rem' }}>✅</span>
              </div>
              <h2 style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>Payment Confirmed!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Redirecting to order tracker...</p>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  background: 'var(--secondary)', 
                  animation: 'shimmer 1s ease-in-out infinite' 
                }} />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Complete Payment</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Order #{currentOrder.orderNumber}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>₹{finalTotal}</p>
              </div>

              {upiLink && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Scan QR Code or Click Button</p>
                    <div style={{ 
                      background: 'white', 
                      padding: '1.5rem', 
                      borderRadius: '16px', 
                      display: 'inline-block',
                      marginBottom: '1.5rem'
                    }}>
                      <QRCodeSVG value={upiLink} size={200} />
                    </div>
                  </div>

                  <a
                    href={upiLink}
                    onClick={handlePaymentComplete}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      textDecoration: 'none',
                      marginBottom: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    Pay Using UPI App
                  </a>

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Works with Google Pay, PhonePe, Paytm & all UPI apps
                    </p>
                  </div>
                </>
              )}

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>Note:</strong> After payment, we'll automatically verify and redirect you to the order tracker. This may take a few seconds.
                </p>
              </div>

              {paymentStatus === 'initiated' && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'rgba(99, 102, 241, 0.05)',
                  borderRadius: '12px'
                }}>
                  <div style={{ 
                    display: 'inline-block', 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid var(--primary)', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>Waiting for payment confirmation...</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handlePaymentConfirmation}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'var(--secondary)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  ✅ I've Paid
                </button>
                <button
                  onClick={handlePaymentCancellation}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  ❌ Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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

      <div className="manage-store-grid" style={{ gap: '2rem' }}>
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
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              {orderType === 'Take Away' && packagingFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Packaging Fee</span>
                  <span style={{ color: 'var(--text-secondary)' }}>₹{packagingFee}</span>
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
              {storeId ? (
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
                    <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                      {store ? (
                        upiLink ? (
                          <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                            <div style={{ 
                              background: 'rgba(99, 102, 241, 0.05)', 
                              padding: '1.5rem', 
                              borderRadius: '20px', 
                              border: '1px solid rgba(99, 102, 241, 0.1)',
                              textAlign: 'left'
                            }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                 <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={20} color="black" />
                                 </div>
                                 <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>Contact Info</h4>
                               </div>
                               
                               <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>PHONE NUMBER (LINKED TO UPI)</label>
                               <input 
                                 type="tel" 
                                 placeholder="Enter your 10-digit number" 
                                 value={customerPhone}
                                 onChange={(e) => setCustomerPhone(e.target.value)}
                                 style={{ 
                                   width: '100%', 
                                   padding: '1rem', 
                                   borderRadius: '12px', 
                                   border: '2px solid var(--surface-border)', 
                                   background: 'white', 
                                   fontSize: '1rem',
                                   fontWeight: '600',
                                   color: '#0f172a'
                                 }}
                               />
                               <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.75rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                                 Providing your number helps the vendor contact you regarding your order.
                               </p>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                            Vendor UPI ID not set. Please inform the vendor or try another method.
                          </p>
                        )
                      ) : (
                        <div style={{ color: '#666' }}>
                           <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Fetching stall details...</p>
                           <p style={{ fontSize: '0.75rem' }}>If this takes too long, check your connection.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

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
              style={{ marginTop: '2rem', height: '60px', borderRadius: '16px', fontSize: '1.125rem' }}
            >
              {loading ? 'Placing Order...' : (
                <>Place Order <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} /></>
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
