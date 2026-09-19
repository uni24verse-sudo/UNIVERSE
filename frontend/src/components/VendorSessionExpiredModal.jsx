import React from 'react';
import { Clock, LogIn, ShieldAlert } from 'lucide-react';

const VendorSessionExpiredModal = ({ isOpen, onLoginAgain }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div 
        className="glass-card animate-scale-up"
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 40px rgba(239, 65, 35, 0.15)',
          border: '1px solid rgba(239, 65, 35, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top ambient glow */}
        <div 
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '180px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(239, 65, 35, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} 
        />

        {/* Glowing Icon Container */}
        <div 
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.12) 0%, rgba(252, 175, 23, 0.15) 100%)',
            border: '2px solid rgba(239, 65, 35, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.75rem auto',
            boxShadow: '0 12px 30px rgba(239, 65, 35, 0.2)'
          }}
        >
          <Clock size={42} color="var(--primary, #ef4123)" strokeWidth={2.3} />
        </div>

        {/* Title */}
        <h2 
          style={{
            fontSize: '1.65rem',
            fontWeight: '900',
            color: '#0f172a',
            margin: '0 0 0.75rem 0',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}
        >
          Session Expired
        </h2>

        {/* Message */}
        <p 
          style={{
            fontSize: '0.9375rem',
            color: '#64748b',
            lineHeight: '1.6',
            margin: '0 0 2rem 0',
            fontWeight: '500'
          }}
        >
          Your vendor session has ended for your account security. Please log in again to access your live dashboard and manage your orders.
        </p>

        {/* Action Button */}
        <button
          onClick={onLoginAgain}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            background: 'linear-gradient(135deg, #ef4123 0%, #ff6b4a 100%)',
            boxShadow: '0 10px 25px rgba(239, 65, 35, 0.35)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          <LogIn size={20} strokeWidth={2.5} /> Log In Again
        </button>

        {/* Helpful reassurance */}
        <div 
          style={{ 
            marginTop: '1.25rem', 
            fontSize: '0.8rem', 
            color: '#94a3b8', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.4rem' 
          }}
        >
          <ShieldAlert size={14} /> Your stall settings & data remain completely safe
        </div>
      </div>
    </div>
  );
};

export default VendorSessionExpiredModal;
