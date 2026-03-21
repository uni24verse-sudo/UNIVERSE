import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clock, ChefHat, PackageCheck, ArrowLeft, Home, ShoppingBag, Receipt, CreditCard } from 'lucide-react';

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

  const navigate = useNavigate();
  
  // Status config
  const statusSteps = [
    { label: 'Pending', icon: Clock, color: '#f59e0b', desc: 'Vendor is reviewing your order' },
    { label: 'Confirmed', icon: ChefHat, color: '#3b82f6', desc: 'Great! Chef is preparing your food' },
    { label: 'Completed', icon: PackageCheck, color: '#10b981', desc: 'Delicious! Collect your order now' }
  ];

  const currentStepIndex = order ? statusSteps.findIndex(s => s.label === order.status) : -1;

  if (loading) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '1.5rem' }}>
        <div className="pulse-circle" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass-bg)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={32} color="var(--primary)" className="spin" />
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving your order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Order Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We couldn't find the order you're looking for.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}>
           <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Track Order</h1>
      </header>

      <div className="glass-card" style={{ padding: '2rem', borderRadius: '28px', textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Order #{order.orderNumber}</p>
        
        {/* Live Status Animation */}
        <div style={{ margin: '2rem 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
           <div className="pulse-circle" style={{ 
             width: '100px', 
             height: '100px', 
             borderRadius: '50%', 
             background: 'rgba(99, 102, 241, 0.1)', 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center',
             color: 'var(--primary)',
             border: '2px dashed var(--primary)'
           }}>
             {React.createElement(statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].icon, { size: 48 })}
           </div>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{order.status}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '3rem' }}>
          {statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].desc}
        </p>

        {/* Timeline */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', padding: '0 1rem' }}>
           <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '2px', background: 'var(--surface-border)', zIndex: 0 }}></div>
           <div style={{ position: 'absolute', top: '24px', left: '10%', width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '40%' : '80%', height: '2px', background: 'var(--primary)', zIndex: 1, transition: 'width 1s ease' }}></div>
           
           {statusSteps.map((step, idx) => {
             const Icon = step.icon;
             const isCompleted = idx < currentStepIndex;
             const isActive = idx === currentStepIndex;
             
             return (
               <div key={idx} style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: isCompleted || isActive ? 'var(--primary)' : 'var(--background)',
                    border: '2px solid',
                    borderColor: isCompleted || isActive ? 'var(--primary)' : 'var(--surface-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCompleted || isActive ? 'white' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
                  }}>
                    {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={20} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isActive ? 'white' : 'var(--text-secondary)' }}>{step.label}</span>
               </div>
             );
           })}
        </div>

        {/* UPI Payment Section (Conditional) */}
        {order.paymentMethod === 'UPI' && order.status === 'Confirmed' && order.store?.admin?.upiId && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CreditCard size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>Complete Your Payment</h3>
            </div>
            
            <div style={{ display: 'inline-block', padding: '1rem', background: '#f8fafc', borderRadius: '16px', marginBottom: '1rem' }}>
              <QRCodeSVG 
                value={`upi://pay?pa=${order.store.admin.upiId}&pn=${order.store.name.replace(/ /g, '%20')}&am=${order.totalAmount}&cu=INR&tn=Order%20${order.orderNumber}&tr=${order._id}`} 
                size={180} 
              />
            </div>
            
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Scan this QR with any app (Paytm, GPay, PhonePe) or click the button below to pay **₹{order.totalAmount}**.
            </p>
            
            <a 
              href={`upi://pay?pa=${order.store.admin.upiId}&pn=${order.store.name.replace(/ /g, '%20')}&am=${order.totalAmount}&cu=INR&tn=Order%20${order.orderNumber}&tr=${order._id}`}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', borderRadius: '12px', height: '54px' }}
            >
              Pay Now Directly
            </a>
            
            <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '1rem', fontStyle: 'italic' }}>
              Note: The vendor has already received your order. Please pay immediately to avoid delays.
            </p>
          </div>
        )}

        {/* Breakdown */}
        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-border)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Receipt size={18} color="var(--primary)" />
              <h4 style={{ margin: 0 }}>Order Summary</h4>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             {order.items.map((item, idx) => (
               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {item.name}</span>
                 <span>₹{item.price * item.quantity}</span>
               </div>
             ))}
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--surface-border)', fontWeight: '800', fontSize: '1.25rem' }}>
             <span>Paid via {order.paymentMethod}</span>
             <span style={{ color: 'var(--secondary)' }}>₹{order.totalAmount}</span>
           </div>
        </div>
      </div>

      <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ height: '60px', borderRadius: '16px' }}>
         <Home size={20} /> Return to Home
      </button>
    </div>
  );
};

export default OrderTracker;
