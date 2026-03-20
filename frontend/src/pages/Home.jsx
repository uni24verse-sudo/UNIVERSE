import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/all/list');
        setStores(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);
  
  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        UniVerse Directory
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        Discover local vendors, browse their menus, and order directly from your phone.
      </p>

      {loading ? (
        <p>Loading vendors...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', textAlign: 'left' }}>
          {stores.map(store => (
            <div key={store._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>{store.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Vendor: {store.admin?.name || 'Unknown'} | Items: {store.products?.length || 0}
              </p>
              
              <button 
                className="btn btn-primary" 
                style={{ marginTop: 'auto' }}
                onClick={() => navigate(`/store/${store._id}`)}
              >
                View Menu & Order
              </button>
            </div>
          ))}
          
          {stores.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              No stores are registered yet. Vendors, sign up below!
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
