import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const OrderTracker = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/${id}`);
        setOrder(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
    socket.emit('join_order_room', id);

    socket.on('order_status_update', (updatedOrder) => {
      setOrder(updatedOrder);
    });

    return () => socket.close();
  }, [id]);

  if (loading) return <div className="auth-wrapper">Loading Tracker...</div>;
  if (!order) return <div className="auth-wrapper"><h3>Order not found.</h3></div>;

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>Order #{order.orderNumber}</h1>
      
      <div className="glass-card" style={{ padding: '3rem 2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 
          order.status === 'Pending' ? '#f59e0b' : 
          order.status === 'Confirmed' ? '#3b82f6' : 
          order.status === 'Completed' ? '#10b981' : '#ef4444' 
        }}>
          {order.status}
        </h2>

        {order.status === 'Pending' && <p>We've sent your order to the vendor. Waiting for confirmation...</p>}
        {order.status === 'Confirmed' && <p>The vendor is preparing your items. Get ready!</p>}
        {order.status === 'Completed' && <p>Your order is ready! Please collect it from the vendor.</p>}
        {order.status === 'Cancelled' && <p>This order was cancelled.</p>}

        <div style={{ marginTop: '3rem', textAlign: 'left', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem' }}>
          <h4>Order Summary</h4>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            {order.items.map((item, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>{item.quantity}x {item.name}</span>
                <span>₹{item.price * item.quantity}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
            <span>Total Paid ({order.paymentMethod})</span>
            <span style={{ color: 'var(--secondary)' }}>₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      <Link to="/" className="btn btn-secondary">Go to Home</Link>
    </div>
  );
};

export default OrderTracker;
