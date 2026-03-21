import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, CreditCard, UserPlus, Store } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    upiId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/register', formData);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/vendor/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ padding: '2rem 1rem' }}>
      <div className="auth-container" style={{ maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--secondary)', 
            borderRadius: '18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }}>
            <UserPlus color="white" size={32} />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Join UniVerse</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Start your digital journey yesterday</p>
        </div>
        
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ paddingLeft: '3rem', borderRadius: '14px', height: '54px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  name="email"
                  className="form-input" 
                  placeholder="vendor@universe.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: '3rem', borderRadius: '14px', height: '54px' }}
                  required 
                />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  name="password"
                  className="form-input" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '3rem', borderRadius: '14px', height: '54px' }}
                  required 
                  minLength="6"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">UPI ID (e.g. yourname@upi)</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <CreditCard size={18} />
                </div>
                <input 
                  type="text" 
                  name="upiId"
                  className="form-input" 
                  placeholder="Optional but recommended"
                  value={formData.upiId}
                  onChange={handleChange}
                  style={{ paddingLeft: '3rem', borderRadius: '14px', height: '54px' }}
                />
              </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px' }}>{error}</div>}
            {success && <div className="error-msg" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px', color: 'var(--secondary)', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>{success}</div>}

            <button type="submit" className="btn btn-secondary" disabled={isLoading} style={{ height: '54px', borderRadius: '14px', fontSize: '1rem' }}>
              {isLoading ? 'Creating Account...' : <><UserPlus size={20} /> Create Account</>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/vendor/login" style={{ color: 'var(--secondary)', fontWeight: '700', textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
