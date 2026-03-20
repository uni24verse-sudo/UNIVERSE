import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const CreateStore = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/create', { name }, {
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
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Setup Your Store</h1>
          <p>Give your digital storefront a name to continue</p>
        </div>
        
        <div className="glass-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Shyam's Samosas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '1rem' }}>
              {isLoading ? 'Creating...' : 'Create Store'}
            </button>
            
            <button type="button" onClick={() => navigate('/vendor/dashboard')} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStore;
