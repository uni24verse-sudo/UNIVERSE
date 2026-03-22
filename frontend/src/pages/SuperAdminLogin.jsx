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
    <div className="auth-wrapper" style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card auth-container" style={{ border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 0 50px rgba(99, 102, 241, 0.1)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)' }}>
            <Shield color="white" size={40} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.5rem', color: 'white' }}>Command Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Restricted Super Admin Access</p>
        </div>

        {error && <div className="error-message" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label style={{ color: 'var(--text-secondary)' }}>Admin ID</label>
            <input 
              type="email" 
              placeholder="superadmin@universe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--surface-border)' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'var(--text-secondary)' }}>Security Key</label>
            <div className="password-input" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '3rem', background: 'rgba(255,255,255,0.03)', borderColor: 'var(--surface-border)' }}
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
      
      {/* Background Decor */}
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', zIndex: -1 }}></div>
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', zIndex: -1 }}></div>
    </div>
  );
};

export default SuperAdminLogin;
