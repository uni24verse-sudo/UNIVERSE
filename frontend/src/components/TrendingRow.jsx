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
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60';
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
           <div className="skeleton" style={{ width: '200px', height: '2rem', borderRadius: '8px' }}></div>
        </div>
        <div className="trending-carousel-wrapper">
          <div className="trending-carousel">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="trending-card">
                <div className="trending-img-wrapper skeleton"></div>
                <div className="trending-info">
                  <div className="skeleton" style={{ height: '1rem', width: '80%', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                  <div className="skeleton" style={{ height: '0.75rem', width: '60%', marginBottom: '1rem', borderRadius: '4px' }}></div>
                  <div className="trending-footer">
                    <div className="skeleton" style={{ height: '1rem', width: '30%', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ height: '1.75rem', width: '60px', borderRadius: '8px' }}></div>
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
