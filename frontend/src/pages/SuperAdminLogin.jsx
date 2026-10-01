import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, Lock, ChevronRight, Loader2 } from 'lucide-react';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, { email, password });
      login(res.data.token, res.data.admin);
      
      // If they came from the locked external hub, send them back there to view it.
      // Otherwise, take them to the super admin panel.
      if (location.state?.fromRestrictedAccess) {
        navigate('/');
      } else {
        navigate('/super-admin/panel');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ background: 'var(--background)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card auth-container" style={{ maxWidth: '350px', width: '100%', padding: '1.75rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
            <img src="/helmet-guy.png" alt="UNIVERSE Symbol" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Restricted Super Admin Access</p>
        </div>

        {error && <div className="error-message" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.45rem 0.65rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '0.85rem', textAlign: 'left' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin ID</label>
            <input 
              type="email" 
              placeholder="superadmin@universe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%',
                height: '38px',
                padding: '0.4rem 0.75rem',
                background: '#f8fafc', 
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1.2rem', textAlign: 'left' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Security Key</label>
            <div className="password-input" style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ 
                  width: '100%',
                  height: '38px',
                  padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                  background: '#f8fafc', 
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', height: '38px', fontSize: '0.82rem', fontWeight: '700', borderRadius: '8px', gap: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isLoading ? <Loader2 size={15} className="spin" /> : <>Access Panel <ChevronRight size={15} /></>}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '600' }}>&larr; Back to App</Link>
        </div>
      </div>
      
      {/* Removed decor for light mode cleanliness */}
    </div>
  );
};

export default SuperAdminLogin;
