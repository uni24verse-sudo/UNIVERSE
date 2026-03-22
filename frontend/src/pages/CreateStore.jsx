import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Rocket, Sparkles, Store, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

const CreateStore = () => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [market, setMarket] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token, vendor } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/create', { name, category, market }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/vendor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create store');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="auth-container" style={{ maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}>
            <Rocket color="white" size={40} />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Welcome, {vendor?.name}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Let's launch your digital storefront.</p>
        </div>
        
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <Store size={18} color="var(--primary)" /> Store Name
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. The Gourmet Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem' }}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <Tag size={18} color="var(--primary)" /> Store Category
              </label>
              <select 
                className="form-input" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem', appearance: 'none', background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0 1rem' }}
                required
              >
                <option value="" disabled style={{ background: '#1e1b4b' }}>Select Category</option>
                <option value="Snacks" style={{ background: '#1e1b4b' }}>Snacks & Fast Food</option>
                <option value="Meals" style={{ background: '#1e1b4b' }}>Full Meals</option>
                <option value="Beverages" style={{ background: '#1e1b4b' }}>Beverages & Drinks</option>
                <option value="Desserts" style={{ background: '#1e1b4b' }}>Desserts & Sweets</option>
                <option value="Other" style={{ background: '#1e1b4b' }}>Other</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={12} color="var(--secondary)" /> This helps customers find you easily.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <Store size={18} color="var(--primary)" /> Market Location
              </label>
              <select 
                className="form-input" 
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem', appearance: 'none', background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0 1rem' }}
                required
              >
                <option value="" disabled style={{ background: '#1e1b4b' }}>Select Market</option>
                <option value="BH1 Market" style={{ background: '#1e1b4b' }}>BH1 Market</option>
                <option value="Block34 Market" style={{ background: '#1e1b4b' }}>Block34 Market</option>
                <option value="Hospital Market" style={{ background: '#1e1b4b' }}>Hospital Market</option>
                <option value="BH6 Market" style={{ background: '#1e1b4b' }}>BH6 Market</option>
                <option value="Apartment Market" style={{ background: '#1e1b4b' }}>Apartment Market</option>
              </select>
            </div>

            {error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem', fontWeight: '800', marginTop: '1rem' }}>
              {isLoading ? 'Launching...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>Create My Store <ArrowRight size={20} /></span>}
            </button>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
               <ShieldCheck size={16} color="var(--secondary)" /> Secure & Encrypted Registration
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => navigate('/vendor/login')}>
          Not your account? <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Switch User</span>
        </p>
      </div>
    </div>
  );
};

export default CreateStore;

