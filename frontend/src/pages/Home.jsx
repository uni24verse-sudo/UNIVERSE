import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/all/list');
        // Sort stores so open ones are first
        const sortedStores = res.data.sort((a, b) => (b.isOpen === a.isOpen) ? 0 : b.isOpen ? 1 : -1);
        setStores(sortedStores);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        UniVerse
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        The smarter way to order from your favorite local stalls. No lines, no wait.
      </p>

      {/* Search Section */}
      <div style={{ maxWidth: '600px', margin: '0 auto 4rem auto', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Search for a store or food item..." 
          className="form-input" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            borderRadius: '99px', 
            paddingLeft: '3rem', 
            height: '60px', 
            fontSize: '1.1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}
        />
        <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.25rem', opacity: 0.5 }}>🔍</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem', textAlign: 'left' }}>
          {filteredStores.map(store => (
            <div 
              key={store._id} 
              className="glass-card store-card-hover" 
              onClick={() => navigate(`/store/${store._id}`)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>{store.name}</h3>
                  <p style={{ fontSize: '0.875rem' }}>by {store.admin?.name || 'Vendor'}</p>
                </div>
                <div style={{ 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '99px', 
                  fontSize: '0.7rem', 
                  fontWeight: '800',
                  background: store.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: store.isOpen ? '#10b981' : '#ef4444',
                  border: `1px solid ${store.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {store.isOpen ? '● Open' : '○ Closed'}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {store.products?.length || 0} Items
                </span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Freshly Prepared
                </span>
              </div>
              
              <div className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Enter Store
              </div>
            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--surface-border)' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No stores found</p>
              <p style={{ fontSize: '0.875rem' }}>Try searching with a different name.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '3rem' }}>
        <h3>Are you a Vendor?</h3>
        <p style={{ margin: '1rem 0' }}>Digitize your menu, eliminate unpaid orders, and track your revenue in real-time.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/vendor/login')} style={{ width: 'auto' }}>
          Vendor Login / Register
        </button>
      </div>
    </div>
  );
};

export default Home;
