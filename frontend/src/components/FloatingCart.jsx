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
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '0.75rem 0.75rem 0.75rem 1.25rem', 
          borderRadius: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 65, 35, 0.08)', color: 'var(--primary)', padding: '0.6rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <div>
               <p style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '0.2px' }}>{totalItems} Items</p>
               <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>₹{total}</p>
            </div>
         </div>
         <div style={{ 
           display: 'flex', 
           alignItems: 'center', 
           gap: '0.4rem', 
           fontWeight: '800', 
           fontSize: '0.9rem', 
           background: 'var(--primary)', 
           color: 'white', 
           padding: '0.8rem 1.25rem', 
           borderRadius: '16px', 
           boxShadow: '0 4px 20px rgba(239, 65, 35, 0.3)',
           letterSpacing: '0.5px'
         }}>
            View Cart
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
