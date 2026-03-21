import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';

const StoreMenu = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${id}`);
        setStore(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [id]);

  if (loading) return <div className="auth-wrapper">Loading Menu...</div>;
  if (!store) return <div className="auth-wrapper"><h3>Store not found or unavailable.</h3></div>;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const categories = store ? ['All', ...new Set(store.products.map(p => p.category || 'Uncategorized'))] : [];
  
  const filteredProducts = store?.products.filter(p => 
    activeCategory === 'All' || (p.category || 'Uncategorized') === activeCategory
  );

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{store.name}</h1>
          {!store.isOpen && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold' }}>CLOSED</span>
          )}
        </div>
        <p>Order seamlessly directly from your phone!</p>
      </header>

      {/* Category Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        overflowX: 'auto', 
        paddingBottom: '1.5rem', 
        marginBottom: '1rem',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '99px',
              border: 'none',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              boxShadow: activeCategory === cat ? '0 4px 12px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {!store.isOpen && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Currently Closed</h3>
          <p>This store is not accepting orders right now. Please check back later!</p>
        </div>
      )}

      <div className="store-menu-grid" style={{ opacity: store.isOpen ? 1 : 0.6, pointerEvents: store.isOpen ? 'auto' : 'none' }}>
        {filteredProducts.map(product => (
          <div key={product._id} className="glass-card menu-product-card">
            {product.image && (
               <img src={product.image} alt={product.name} className="menu-product-image" onError={(e) => { e.target.style.display = 'none' }} />
            )}
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h3>
            <p style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: 'auto' }}>
              ₹{product.price}
            </p>
            
            <button 
              className={`btn ${!product.isAvailable ? 'btn-secondary' : 'btn-primary'}`}
              style={{ marginTop: '1rem' }}
              disabled={!product.isAvailable}
              onClick={() => addToCart(product, store._id)}
            >
              {product.isAvailable ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <button 
            onClick={() => navigate('/cart')}
            className="btn btn-primary" 
            style={{ 
              pointerEvents: 'auto', 
              boxShadow: '0 10px 25px rgba(79, 70, 229, 0.6)', 
              borderRadius: '99px',
              padding: '1rem 3rem',
              display: 'flex',
              gap: '1rem'
            }}
          >
            <span>Cart ({totalItems} items)</span>
            <span>&rarr; Checkout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreMenu;
