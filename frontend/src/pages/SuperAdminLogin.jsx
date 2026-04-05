import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, { email, password });
      login(res.data.token, res.data.admin);
      
      // We don't strictly verify role here since backend will block non-SAs, 
      // but if the login is successful, we navigate to the SA panel.
      // If it's a normal vendor, the SA backend routes will throw 403.
      navigate('/super-admin/panel');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ background: 'var(--background)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card auth-container" style={{ border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 0 50px rgba(99, 102, 241, 0.1)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <img src="/helmet-guy.png" alt="UNIVERSE Symbol" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Command Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Restricted Super Admin Access</p>
        </div>

        {error && <div className="error-message" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Admin ID</label>
            <input 
              type="email" 
              placeholder="superadmin@universe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%',
                padding: '1rem',
                background: '#f8fafc', 
                border: '1px solid var(--surface-border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Security Key</label>
            <div className="password-input" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ 
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: '#f8fafc', 
                  border: '1px solid var(--surface-border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '60px', fontSize: '1.2rem', gap: '0.5rem' }}>
            {isLoading ? <Loader2 className="spin" /> : <>Access Panel <ChevronRight /></>}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>&larr; Back to App</Link>
        </div>
      </div>
      
      {/* Removed decor for light mode cleanliness */}
    </div>
  );
};

export default SuperAdminLogin;
