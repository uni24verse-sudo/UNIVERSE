import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, X, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { io } from 'socket.io-client';

const RecentOrders = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on vendor dashboard or order tracker itself to avoid clutter
  const hideOnPaths = ['/dashboard', '/order-tracker', '/login', '/register', '/manage-store'];
  const shouldHide = hideOnPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const loadOrders = () => {
      const stored = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const active = stored.filter(o => o.timestamp > twoHoursAgo);
      if (active.length !== stored.length) {
        localStorage.setItem('universe_recent_orders', JSON.stringify(active));
      }
      setOrders(active);
    };

    if (!shouldHide) {
      loadOrders();
      const interval = setInterval(loadOrders, 60000);
      
      // Socket Setup for live updates
      const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
      
      // Join rooms for all recent orders
      const stored = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
      stored.forEach(order => socket.emit('join_order_room', order.id));

      socket.on('order_status_update', (updatedOrder) => {
        setOrders(prev => {
          const existing = prev.find(o => o.id === updatedOrder._id);
          if (existing && existing.status !== updatedOrder.status) {
            // Play Sound
            if (updatedOrder.status === 'Confirmed') {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
            } else if (updatedOrder.status === 'Completed') {
              new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3').play().catch(() => {});
            }

            // Update Local Storage
            const stored = JSON.parse(localStorage.getItem('universe_recent_orders') || '[]');
            const updated = stored.map(o => o.id === updatedOrder._id ? { ...o, status: updatedOrder.status } : o);
            localStorage.setItem('universe_recent_orders', JSON.stringify(updated));
            
            return prev.map(o => o.id === updatedOrder._id ? { ...o, status: updatedOrder.status } : o);
          }
          return prev;
        });
      });

      return () => {
        clearInterval(interval);
        socket.close();
      };
    }
  }, [location.pathname, shouldHide]);

  if (shouldHide || orders.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        className="hover-scale"
      >
        {isOpen ? <X size={24} /> : <ShoppingBag size={24} />}
        {!isOpen && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ef4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: '800',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #1a1b2e'
          }}>
            {orders.length}
          </div>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className="glass-card"
          style={{
            position: 'absolute',
            bottom: '80px',
            right: 0,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '1.25rem',
            borderRadius: '24px',
            background: '#1a1b2e', // More solid background
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out',
            zIndex: 1001
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white' }}>Recent Orders</h3>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>Last 2h</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => (
              <div 
                key={order.id}
                onClick={() => {
                  navigate(`/order-tracker/${order.id}`);
                  setIsOpen(false);
                }}
                style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white', display: 'block', marginBottom: '0.2rem' }}>{order.storeName}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '700' }}>{order.market || 'Campus Market'}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <Clock size={12} /> {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <ExternalLink size={14} color="var(--primary)" />
                    {order.status === 'Completed' ? (
                       <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                         <CheckCircle2 size={10} /> READY
                       </span>
                    ) : order.status === 'Cancelled' ? (
                       <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '800', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                         <AlertCircle size={10} /> CANCELLED
                       </span>
                    ) : (
                       <span style={{ fontSize: '0.65rem', color: order.status === 'Confirmed' ? '#3b82f6' : '#f59e0b', fontWeight: '800', opacity: 0.8 }}>
                         {order.status?.toUpperCase() || 'PENDING'}
                       </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hover-scale:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default RecentOrders;
