import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { ShoppingBag } from 'lucide-react';

const FloatingCart = () => {
  const { cart, total } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on specific pages where it's not needed (cart page itself, vendor dashboard, etc.)
  const hidePaths = ['/cart', '/vendor', '/super-admin', '/order-tracker'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (totalItems === 0) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '24px', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      width: '90%', 
      maxWidth: '600px', 
      zIndex: 1000,
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div 
        onClick={() => navigate('/cart')} 
        style={{ 
          background: 'var(--primary)', 
          color: 'white', 
          padding: '1rem 1.5rem', 
          borderRadius: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'transform 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
               <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{totalItems} Items</p>
               <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>₹{total} • View Cart</p>
            </div>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
            NEXT &rarr;
         </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FloatingCart;
