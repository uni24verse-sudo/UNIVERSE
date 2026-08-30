import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, Star, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './TrendingRow.css';

const TrendingRow = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const locationId = localStorage.getItem('universe_location_id');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/trending`, {
          params: { locationId }
        });
        setTrending(res.data);
      } catch (err) {
        console.error('Failed to fetch trending items', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  const handleOrderClick = (storeId) => {
    navigate(`/store/${storeId}`);
  };

  if (loading) {
    return (
      <div className="trending-section">
        <h2 className="trending-title skeleton-text skeleton" style={{ width: '200px', height: '2rem' }}></h2>
        <div className="trending-carousel">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="trending-card skeleton" style={{ minWidth: '220px', height: '260px', borderRadius: '16px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="trending-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="trending-header">
        <h2 className="trending-title">
          <Flame color="#ef4444" size={24} /> Trending Cravings
        </h2>
        <span className="trending-subtitle">Most ordered near you right now</span>
      </div>

      <div className="trending-carousel-wrapper">
        <div className="trending-carousel">
          {trending.map((item, idx) => (
            <div 
              key={`${item.productId}-${idx}`} 
              className="trending-card"
              onClick={() => handleOrderClick(item.storeId)}
            >
              <div className="trending-img-wrapper">
                <img src={getImageUrl(item.image)} alt={item.name} className="trending-img" />
                <div className="trending-badge">
                  #{idx + 1}
                </div>
              </div>
              <div className="trending-info">
                <h3 className="trending-item-name">{item.name}</h3>
                <p className="trending-store-name">{item.storeName} &bull; {item.market.replace(' Market', '')}</p>
                
                <div className="trending-footer">
                  <span className="trending-price">₹{item.price}</span>
                  <button className="trending-add-btn">
                    <ShoppingBag size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingRow;
