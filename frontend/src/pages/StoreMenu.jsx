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

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{store.name}</h1>
        <p>Order seamlessly directly from your phone!</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {store.products.map(product => (
          <div key={product._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            {product.image && (
               <img src={product.image} alt={product.name} onError={(e) => { e.target.style.display = 'none' }} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />
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
