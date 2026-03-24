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

  const handleCheckout = async () => {
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
      
      // Save to Recent Orders in localStorage
      const recentOrders = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
      const updatedOrders = [
        { 
          id: newOrder._id, 
          orderNumber: newOrder.orderNumber, 
          storeName: store.name, 
          market: store.market,
          storeId: store._id,
          status: newOrder.status || 'Pending',
          timestamp: Date.now() 
        },
        ...recentOrders.filter(o => o.id !== newOrder._id)
      ].slice(0, 10); // Keep last 10
      localStorage.setItem('universe_recent_orders', JSON.stringify(updatedOrders));

      clearCart();
      navigate(`/order-tracker/${newOrder._id}`);
      
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert('Failed to place order: ' + msg);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const upiLink = store?.admin?.upiId 
    ? `upi://pay?pa=${store.admin.upiId}&pn=${store.name.replace(/ /g, '%20')}&am=${finalTotal}&cu=INR&tn=Order%20from%20UniVerse&tr=${Math.random().toString(36).substring(7)}`
    : null;

  return (
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
                                 <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Contact Info</h4>
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
  );
};

export default Cart;
