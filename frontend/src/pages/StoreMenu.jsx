import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { ArrowLeft, ShoppingBag, ChefHat, Info, Plus, Search, Star, Clock } from 'lucide-react';

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

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Banner Image */}
      <div style={{ position: 'relative', height: '240px', width: '100%', overflow: 'hidden' }}>
        <img 
          src={getImageUrl(store.image)} 
          alt={store.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11, 15, 26, 0.4) 0%, rgba(11, 15, 26, 1) 100%)' }}></div>
      </div>

      {/* Sticky Header */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'rgba(11, 15, 26, 0.8)', 
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '1rem',
        marginTop: '-40px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700' }}>{store.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Star size={10} fill="currentColor" /> 4.8</span>
              <span>•</span>
              <span>20-30 mins</span>
            </div>
          </div>
          <div style={{ width: '24px' }}></div> {/* Spacer */}
        </div>
      </div>

      <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Store Banner/Info */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>Menu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Discover delicious items from {store.name}</p>
              </div>
              {store.isOpen === false && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: 'var(--error)', 
                  fontSize: '0.7rem', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '99px', 
                  fontWeight: '800',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>OFFLINE</div>
              )}
           </div>
        </div>

        {/* Category Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: '1.5rem', 
          marginBottom: '1rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'sticky',
          top: '80px',
          zIndex: 90
        }} className="hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: activeCategory === cat ? 'var(--primary)' : 'var(--surface-border)',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                background: activeCategory === cat ? 'var(--primary)' : 'var(--glass-bg)',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)',
                boxShadow: activeCategory === cat ? '0 10px 20px rgba(99, 102, 241, 0.2)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {store.isOpen === false && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem', 
            marginBottom: '3rem', 
            borderRadius: '24px',
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px dashed rgba(239, 68, 68, 0.2)'
          }}>
            <Clock size={40} color="var(--error)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--error)', margin: '0 0 0.5rem 0' }}>Currently Closed</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>This vendor is not accepting orders at the moment.</p>
          </div>
        )}

        <div className="store-menu-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))',
          gap: '1.5rem',
          opacity: store.isOpen !== false ? 1 : 0.6, 
          pointerEvents: store.isOpen !== false ? 'auto' : 'none' 
        }}>
          {filteredProducts.map(product => (
            <div key={product._id} className="glass-card" style={{ 
              display: 'flex', 
              padding: '1.25rem',
              gap: '1.25rem',
              borderRadius: '24px',
              border: '1px solid var(--surface-border)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   <div style={{ width: '12px', height: '12px', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                   </div>
                   <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>{product.category || 'Special'}</span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>{product.name}</h3>
                <p style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '1rem' }}>₹{product.price}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Authentic flavor prepared with fresh ingredients. A favorite among locals.
                </p>
              </div>

              <div style={{ width: '120px', position: 'relative', flexShrink: 0 }}>
                {product.image ? (
                   <img 
                    src={product.image} 
                    alt={product.name} 
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '16px', background: 'var(--glass-bg)' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                   />
                ) : null}
                <div style={{ 
                  display: product.image ? 'none' : 'flex', 
                  width: '120px', 
                  height: '120px', 
                  background: 'var(--glass-bg)', 
                  borderRadius: '16px', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>🍲</div>

                <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', width: '90%' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => addToCart(product, id)}
                    style={{ 
                      padding: '0.5rem', 
                      height: '36px', 
                      fontSize: '0.875rem', 
                      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
                      borderRadius: '8px'
                    }}
                  >
                    <Plus size={14} /> ADD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary Bar Section */}
      {totalItems > 0 && (
        <div style={{ 
          position: 'fixed', 
          bottom: '24px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '90%', 
          maxWidth: '600px', 
          zIndex: 1000 
        }}>
          <div onClick={() => navigate('/cart')} style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            padding: '1rem 1.5rem', 
            borderRadius: '24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                   <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{totalItems} Items</p>
                   <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>₹{cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)} • View Cart</p>
                </div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                NEXT &rarr;
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreMenu;
