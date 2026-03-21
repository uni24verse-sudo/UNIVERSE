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

  const [customerUpiId, setCustomerUpiId] = useState('');

  const handleCheckout = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (paymentMethod === 'UPI' && !customerUpiId) {
      alert("Please enter your UPI ID for potential refunds.");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        storeId,
        items: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        totalAmount: total,
        paymentMethod,
        customerUpiId
      };

      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/orders/create', orderData);
      const newOrder = res.data;
      
      clearCart();
      navigate(`/order/${newOrder._id}`);
      
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert('Failed to place order: ' + msg);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const upiLink = store?.admin?.upiId 
    ? `upi://pay?pa=${store.admin.upiId}&pn=${store.name.replace(/ /g, '%20')}&am=${total}&cu=INR&tn=Order%20from%20UniVerse&tr=${Math.random().toString(36).substring(7)}`
    : null;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store color="white" size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.04em', color: 'white' }}>UniVerse</span>
        </div>
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
          Secure Checkout
        </div>
      </header>

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
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{item.name}</h4>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--secondary)' }}>₹{item.price * item.quantity}</p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '12px' }}>
                    <button 
                      onClick={() => updateQuantity(item._id, -1)} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '700' }}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item._id, 1)} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeFromCart(item._id)} 
                    style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.6 }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>₹{total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Platform Fee</span>
                <span style={{ color: 'var(--secondary)' }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', borderTop: '1px dashed var(--surface-border)', paddingTop: '1rem' }}>
                <span>To Pay</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                              <CreditCard size={28} color="var(--primary)" />
                            </div>
                            <p style={{ color: '#000', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Direct UPI Sync</p>
                            <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.5' }}>
                              Your order will be sent to the vendor as **Paid**. You'll see the payment QR code on the next screen.
                            </p>
                            
                            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                               <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>YOUR UPI ID (FOR REFUNDS)</label>
                               <input 
                                 type="text" 
                                 placeholder="e.g. yourname@okaxis" 
                                 value={customerUpiId}
                                 onChange={(e) => setCustomerUpiId(e.target.value)}
                                 style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', background: '#f8fafc', fontSize: '0.875rem' }}
                               />
                               <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem' }}>Required to send money back if you cancel.</p>
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
