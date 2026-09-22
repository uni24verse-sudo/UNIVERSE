import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, Clock, ShieldAlert, ArrowLeft } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('pending') === 'true') {
      setIsPendingApproval(true);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/login', { email, password });
      login(res.data.token, res.data.admin);
      navigate('/vendor/dashboard');
    } catch (err) {
      if (err.response?.data?.status === 'PENDING_APPROVAL') {
        setIsPendingApproval(true);
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ padding: '0 1rem' }}>
      <div className="auth-container" style={{ maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 1.5rem auto'
          }}>
            <img src="/helmet-guy.png" alt="UNIVERSE Symbol" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Vendor Login</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage your stall with UniVerse</p>
        </div>
        
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px' }}>
          {isPendingApproval ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ 
                width: '68px', height: '68px', borderRadius: '20px', 
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 65, 35, 0.15) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto',
                color: '#f59e0b', border: '1.5px solid rgba(245, 158, 11, 0.3)'
              }}>
                <Clock size={34} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                Account Under Review
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                Thank you for applying to UniVerse! Our campus operations team is verifying your stall details. You will be able to log in as soon as your account is approved.
              </p>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid var(--surface-border)', marginBottom: '1.75rem', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Clock size={15} color="#f59e0b" />
                <span>Verification usually completes within <strong>2 – 4 hours</strong>.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingApproval(false)}
                className="btn btn-secondary"
                style={{ width: '100%', height: '52px', borderRadius: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={18} /> Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '3rem', borderRadius: '14px', height: '54px' }}
                    required 
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '3rem', paddingRight: '3rem', borderRadius: '14px', height: '54px' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.2rem'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className="error-msg" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px' }}>{error}</div>}

              <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '54px', borderRadius: '14px', fontSize: '1rem' }}>
                {isLoading ? 'Signing In...' : <><LogIn size={20} /> Sign In</>}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/vendor/register" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
