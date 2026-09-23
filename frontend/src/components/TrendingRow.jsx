import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Flame, Star, ShoppingBag, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import './TrendingRow.css';

const TrendingRow = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

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
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  const handleOrderClick = (storeId) => {
    navigate(`/store/${storeId}`);
  };

  const handleAddToCart = (e, item) => {
    e.stopPropagation();
    if (!item.isOpen || !item.isAvailable) return;
    
    const productForCart = {
      _id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category
    };
    
    addToCart(productForCart, item.storeId);
    
    // Dispatch a custom event to show the notification toast (optional, if you have one)
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { message: `Added ${item.name} to cart!` } 
    }));
  };

  if (loading) {
    return (
      <div className="trending-section">
        <div className="trending-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ width: '190px', height: '1.65rem', borderRadius: '8px' }} />
          </div>
          <div className="skeleton" style={{ width: '260px', height: '0.85rem', borderRadius: '6px' }} />
        </div>
        <div className="trending-carousel-wrapper">
          <div className="trending-carousel">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="trending-card" style={{ pointerEvents: 'none' }}>
                <div className="trending-img-wrapper skeleton" style={{ position: 'relative' }}>
                  <div 
                    className="skeleton" 
                    style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      left: '8px', 
                      width: '26px', 
                      height: '18px', 
                      borderRadius: '100px', 
                      background: 'rgba(255, 255, 255, 0.85)' 
                    }} 
                  />
                </div>
                <div className="trending-info">
                  <div className="skeleton" style={{ height: '0.95rem', width: '78%', marginBottom: '0.35rem', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '0.75rem', width: '52%', marginBottom: '0.75rem', borderRadius: '4px' }} />
                  <div className="trending-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton" style={{ height: '1rem', width: '38px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '1.6rem', width: '54px', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        <p className="trending-subtitle">Most ordered & loved picks near you right now ❤️</p>
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
                <p className="trending-store-name">
                  {item.storeName} {item.market ? `• ${item.market.replace(' Market', '')}` : ''}
                </p>
                
                <div className="trending-footer">
                  <span className="trending-price">₹{item.price}</span>
                  
                  {!item.isOpen ? (
                    <span className="trending-badge-status closed">Closed</span>
                  ) : !item.isAvailable ? (
                    <span className="trending-badge-status unavailable">Out of Stock</span>
                  ) : (
                    <button 
                      className="trending-add-btn" 
                      onClick={(e) => handleAddToCart(e, item)}
                    >
                      ADD <Plus size={14} style={{ marginLeft: '2px' }} />
                    </button>
                  )}
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
