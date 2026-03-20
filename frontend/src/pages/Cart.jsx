import React, { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

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
      <div className="auth-wrapper" style={{ flexDirection: 'column' }}>
        <h2>Your Cart is Empty</h2>
        <p style={{ marginTop: '1rem' }}>Scan a store QR code to start ordering.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '2rem' }}>Go Home</button>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        storeId,
        items: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        totalAmount: total,
        paymentMethod
      };

      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/orders/create', orderData);
      const newOrder = res.data;
      
      clearCart();
      navigate(`/order/${newOrder._id}`);
      
    } catch (err) {
      alert('Failed to place order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const upiLink = store?.admin?.upiId 
    ? `upi://pay?pa=${store.admin.upiId}&pn=${store.name}&am=${total}&cu=INR`
    : null;

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Your Cart</h1>
        {store && <p>Ordering from: <strong>{store.name}</strong></p>}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cart.map(item => (
              <li key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.name}</h4>
                  <p style={{ fontSize: '0.875rem' }}>₹{item.price} each</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => updateQuantity(item._id, -1)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', width: 'auto' }}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', width: 'auto' }}>+</button>
                  <button onClick={() => removeFromCart(item._id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', width: 'auto', color: 'var(--error)', background: 'transparent' }}>X</button>
                </div>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1.5rem' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--secondary)' }}>₹{total}</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3>Payment Method</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px', border: `2px solid ${paymentMethod === 'Cash' ? 'var(--primary)' : 'var(--surface-border)'}` }}>
              <input type="radio" name="payment" value="Cash" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} style={{ transform: 'scale(1.5)' }} />
              <div>
                <strong>Pay Cash at Counter</strong>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>You will receive an order number to show the vendor.</p>
              </div>
            </label>

            {store && store.admin?.upiId ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px', border: `2px solid ${paymentMethod === 'UPI' ? 'var(--primary)' : 'var(--surface-border)'}` }}>
                <input type="radio" name="payment" value="UPI" checked={paymentMethod === 'UPI'} onChange={() => setPaymentMethod('UPI')} style={{ transform: 'scale(1.5)' }} />
                <div style={{ width: '100%' }}>
                  <strong>Zero-Fee UPI Payment</strong>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Pay directly to {store.admin.upiId}</p>
                  
                  {paymentMethod === 'UPI' && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', textAlign: 'center', borderRadius: '8px' }}>
                      <QRCodeSVG value={upiLink} size={150} />
                      <p style={{ marginTop: '1rem', color: '#000', fontSize: '0.875rem' }}>Scan or <a href={upiLink} style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Click Here</a> to Pay via UPI app</p>
                    </div>
                  )}
                </div>
              </label>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>This store has not enabled UPI payments.</p>
            )}

          </div>

          <button onClick={handleCheckout} className="btn btn-primary" disabled={loading || !paymentMethod}>
            {loading ? 'Processing...' : `Confirm Order & Checkout`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
