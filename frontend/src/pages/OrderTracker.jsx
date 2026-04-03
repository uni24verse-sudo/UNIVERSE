import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { CheckCircle2, Clock, ChefHat, PackageCheck, ArrowLeft, Home, Receipt, X, Phone, MessageCircle } from 'lucide-react';

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundCard, setShowRefundCard] = useState(true);

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
      setOrder(prev => {
        if (prev && prev.status !== updatedOrder.status) {
          if (updatedOrder.status === 'Confirmed') {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
          } else if (updatedOrder.status === 'Completed') {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
          }
        }
        return updatedOrder;
      });
    });

    return () => socket.close();
  }, [id]);

  const statusSteps = [
    { label: 'Pending', icon: Clock, color: '#f59e0b', desc: 'Vendor is reviewing your order' },
    { label: 'Confirmed', icon: ChefHat, color: '#3b82f6', desc: 'Great! Your order is being prepared' },
    { label: 'Completed', icon: PackageCheck, color: '#10b981', desc: 'Your order is ready! Please collect it' }
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

      {/* Floating Refund Contact Card - Only for Cancelled Orders */}
      {order.status === 'Cancelled' && showRefundCard && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '560px',
          zIndex: 9999,
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))',
            backdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setShowRefundCard(false)}
              style={{ 
                position: 'absolute', top: '0.75rem', right: '0.75rem', 
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', 
                width: '28px', height: '28px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
              }}
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
              }}>
                <MessageCircle size={22} color="white" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white' }}>Need an Instant Refund?</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Your order was cancelled • Contact us now</p>
              </div>
            </div>

            {/* Info Text */}
            <p style={{ 
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.5', marginBottom: '1rem',
              padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              Your payment of <span style={{ color: '#ef4444', fontWeight: '800' }}>₹{order.totalAmount}</span> will be refunded. 
              Call or WhatsApp us for <span style={{ color: '#10b981', fontWeight: '700' }}>instant processing</span>.
            </p>

            {/* Phone Numbers */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a href="tel:7985397373" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981', fontWeight: '800', fontSize: '0.85rem',
                textDecoration: 'none', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
              }}>
                <Phone size={16} /> 7985397373
              </a>
              <a href="tel:8295886832" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3b82f6', fontWeight: '800', fontSize: '0.85rem',
                textDecoration: 'none', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
              }}>
                <Phone size={16} /> 8295886832
              </a>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}>
           <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Track Order</h1>
      </header>

      <div className="glass-card" style={{ padding: '2rem', borderRadius: '28px', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', borderRadius: '12px', fontWeight: '900', fontSize: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          Order #{order.orderNumber}
        </div>
        
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
              {order.status === 'Completed' ? (
                 <CheckCircle2 size={48} color="#10b981" />
              ) : order.status === 'Cancelled' ? (
                 <X size={48} color="#ef4444" />
              ) : order.status === 'Payment Pending' ? (
                 <Clock size={48} color="#f59e0b" />
              ) : (
                 React.createElement(statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].icon, { size: 48 })
              )}
            </div>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          {order.status === 'Payment Pending' ? 'Processing Payment...' : order.status}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '3rem' }}>
          {order.status === 'Payment Pending' ? 'Your payment is being processed' :
           order.status === 'Cancelled' ? 'This order has been cancelled by the vendor' :
           statusSteps[currentStepIndex >= 0 ? currentStepIndex : 0].desc}
        </p>

        {/* Timeline */}
        {order.status !== 'Payment Pending' && order.status !== 'Cancelled' && (
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
        )}

        {/* Payment Status */}
        <div style={{ 
          padding: '1rem', 
          borderRadius: '16px', 
          marginBottom: '2rem',
          background: order.paymentStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
          border: `1px solid ${order.paymentStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
        }}>
          <p style={{ 
            fontWeight: '700', 
            margin: 0,
            color: order.paymentStatus === 'Confirmed' ? '#10b981' : '#f59e0b'
          }}>
            {order.paymentStatus === 'Confirmed' ? '✅ Payment Confirmed' : '⏳ Payment Processing'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            {order.paymentStatus === 'Confirmed' 
              ? `₹${order.totalAmount} paid via Razorpay` 
              : 'Your payment is being verified...'}
          </p>
        </div>

        {/* Order Summary */}
        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Receipt size={18} color="var(--primary)" />
              <h4 style={{ margin: 0 }}>Order Summary</h4>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Store</span>
             <span style={{ fontWeight: '700' }}>{order.store?.name || 'Store'}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Order Type</span>
             <span style={{ fontWeight: '700' }}>{order.orderType}</span>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {order.items.map((item, idx) => (
               <div key={idx} style={{ borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', paddingBottom: idx === order.items.length - 1 ? 0 : '0.75rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                   <span style={{ fontWeight: '700', color: 'white' }}>
                     {item.quantity}x {item.name} {item.variant && <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>({item.variant})</span>}
                     {item.isCombo && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: '800', marginLeft: '0.5rem', verticalAlign: 'middle' }}>COMBO</span>}
                   </span>
                   <span style={{ fontWeight: '700' }}>₹{item.price * item.quantity}</span>
                 </div>
                 
                 {item.isCombo && (
                   <div style={{ marginTop: '0.4rem', paddingLeft: '1.25rem', borderLeft: '2px solid var(--surface-border)' }}>
                     {item.comboItems && item.comboItems.length > 0 && (
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                         {item.comboItems.map((ci, cidx) => (
                           <div key={cidx}>• {ci.quantity} {ci.name}</div>
                         ))}
                       </div>
                     )}
                     {item.freeItems && item.freeItems.length > 0 && (
                       <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem', fontWeight: '600' }}>
                         {item.freeItems.map((fi, fidx) => (
                           <div key={fidx}>+ Free {fi.quantity} {fi.name}</div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--surface-border)', fontWeight: '800', fontSize: '1.25rem' }}>
             <span>Total Paid</span>
             <span style={{ color: 'var(--secondary)' }}>₹{order.totalAmount}</span>
           </div>
        </div>

        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ height: '60px', borderRadius: '16px', width: '100%' }}>
           <Home size={20} /> Return to Home
        </button>
      </div>
    </div>
  );
};

export default OrderTracker;
