import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, X, ExternalLink, Clock } from 'lucide-react';

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
      
      // Filter orders from the last 2 hours
      const active = stored.filter(o => o.timestamp > twoHoursAgo);
      
      // Update storage if some were expired
      if (active.length !== stored.length) {
        localStorage.setItem('universe_recent_orders', JSON.stringify(active));
      }
      
      setOrders(active);
    };

    if (!shouldHide) {
      loadOrders();
      // Refresh every minute to check for expiration
      const interval = setInterval(loadOrders, 60000);
      return () => clearInterval(interval);
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
            boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Recent Orders</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>Last 2h</span>
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
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  border: '1px solid var(--surface-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white' }}>{order.storeName}</span>
                  <ExternalLink size={14} color="var(--primary)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Order #{order.orderNumber}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <Clock size={12} />
                    {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
