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
          background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)', 
          color: 'white', 
          padding: '1rem 1.75rem', 
          borderRadius: '100px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 20px 50px rgba(147, 51, 234, 0.5), inset 0 2px 10px rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 25px 60px rgba(147, 51, 234, 0.6), inset 0 2px 10px rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(147, 51, 234, 0.5), inset 0 2px 10px rgba(255,255,255,0.2)';
        }}
      >
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem', borderRadius: '50%', boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <div>
               <p style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{totalItems} Items</p>
               <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: '500' }}>₹{total} <span style={{ opacity: 0.5, margin: '0 0.2rem' }}>•</span> View Cart</p>
            </div>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '1px', background: 'rgba(255,255,255,0.15)', padding: '0.6rem 1.2rem', borderRadius: '100px' }}>
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
