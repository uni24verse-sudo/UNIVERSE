import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Join UniVerse</h1>
          <p>Start managing your orders with a simple QR code</p>
        </div>
        
        <div className="glass-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                name="name"
                className="form-input" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                name="email"
                className="form-input" 
                placeholder="vendor@universe.com"
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                name="password"
                className="form-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required 
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID (Optional, for Zero-Fee Payments)</label>
              <input 
                type="text" 
                name="upiId"
                className="form-input" 
                placeholder="yourphone@okhdfcbank"
                value={formData.upiId}
                onChange={handleChange}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}
            {success && <div className="error-msg" style={{color: 'var(--secondary)'}}>{success}</div>}

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '1rem' }}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
            Already have an account? <Link to="/vendor/login" className="link-text">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
