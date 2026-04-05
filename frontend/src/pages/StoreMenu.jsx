import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { ArrowLeft, ShoppingBag, ChefHat, Info, Plus, Search, Star, Clock, Store, X } from 'lucide-react';

const StoreMenu = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

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
  const comboExists = store?.products.some(p => p.isCombo);
  const categories = store ? ['All', ...(comboExists ? ['Combos'] : []), ...new Set(store.products.map(p => p.category || 'Uncategorized'))] : [];
  
  const filteredProducts = store?.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === 'All') return matchesSearch;
    if (activeCategory === 'Combos') return p.isCombo && matchesSearch;
    return (p.category || 'Uncategorized') === activeCategory && matchesSearch;
  }) || [];

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  const storeClosed = store.isOpen === false;

  const handleAddToCartClick = (product) => {
    if (storeClosed) return;
    if (product.isAvailable === false) return;
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedVariant(product.variants[0]); // Default to first
      setShowVariantModal(true);
    } else {
      addToCart(product, id);
    }
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(249, 250, 251, 0.2) 0%, rgba(249, 250, 251, 1) 100%)' }}></div>
      </div>

      {/* Store Info Subheader */}
      <div style={{ 
        position: 'relative', 
        zIndex: 90, 
        background: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '1rem',
        marginTop: '-40px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate(-1)} style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--text-primary)' }}>{store.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontWeight: '600' }}>
              <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />20-30 mins</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ color: 'var(--primary)', fontWeight: '800', padding: '0.2rem 0.6rem', background: 'rgba(239, 65, 35, 0.08)', borderRadius: '100px' }}>{store.market || 'BH1 Market'}</span>
            </div>
          </div>
          <div style={{ width: '42px' }}></div> {/* Spacer for symmetry */}
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

        {/* Local Store Search Bar */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder={`Search ${store.name}'s menu...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1.25rem 1.25rem 1.25rem 3.5rem', 
              borderRadius: '100px', 
              background: '#ffffff', 
              border: '1px solid var(--surface-border)', 
              color: 'var(--text-primary)', 
              fontSize: '1rem',
              fontWeight: '500',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} 
            onFocus={(e) => {
               e.target.style.borderColor = 'var(--primary)';
               e.target.style.boxShadow = '0 10px 30px rgba(239, 65, 35, 0.1)';
            }}
            onBlur={(e) => {
               e.target.style.borderColor = 'var(--surface-border)';
               e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', top: '50%', right: '1.25rem', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
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
                background: activeCategory === cat ? 'var(--primary)' : '#ffffff',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)',
                boxShadow: activeCategory === cat ? '0 10px 20px rgba(239, 65, 35, 0.2)' : 'none'
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
          gap: '1.5rem'
        }}>
          {activeCategory === 'All' && comboExists && !searchQuery && (
            <div 
              onClick={() => setActiveCategory('Combos')}
              style={{ 
                gridColumn: '1 / -1', 
                background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.08) 0%, rgba(255,255,255,1) 100%)',
                padding: '1.5rem',
                borderRadius: '24px',
                border: '1px solid rgba(239, 65, 35, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                overflow: 'hidden',
                position: 'relative'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)' }}>
                  🎁 Meal Bundles & Combos
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Save more with our curated combo deals!</p>
              </div>
              <div style={{ 
                background: 'var(--primary)', 
                color: 'white', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '12px', 
                fontWeight: '800', 
                fontSize: '0.875rem',
                boxShadow: '0 8px 20px rgba(239, 65, 35, 0.3)' 
              }}>
                VIEW ALL &rarr;
              </div>
              <div style={{ position: 'absolute', right: '-20px', top: '-10px', fontSize: '5rem', opacity: 0.1, pointerEvents: 'none' }}>🎁</div>
            </div>
          )}

          {filteredProducts.map(product => {
            const isUnavailable = product.isAvailable === false;
            return (
              <div key={product._id} style={{ 
                display: 'flex', 
                padding: '1.5rem',
                gap: '1.5rem',
                borderRadius: '28px',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                backdropFilter: 'blur(20px)',
                opacity: isUnavailable ? 0.6 : 1,
                filter: isUnavailable ? 'grayscale(1)' : 'none',
                pointerEvents: isUnavailable ? 'none' : 'auto',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                if (!isUnavailable) {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 65, 35, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUnavailable) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
                }
              }}>
                {isUnavailable && (
                   <div style={{
                     position: 'absolute',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%) rotate(-15deg)',
                     background: '#ef4444',
                     color: 'white',
                     padding: '0.4rem 1.2rem',
                     borderRadius: '8px',
                     fontWeight: '900',
                     fontSize: '0.75rem',
                     zIndex: 10,
                     boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                     border: '2px solid white',
                     whiteSpace: 'nowrap'
                   }}>OUT OF STOCK</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', border: `1px solid ${isUnavailable ? '#94a3b8' : '#10b981'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isUnavailable ? '#94a3b8' : '#10b981' }}></div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: isUnavailable ? 'var(--text-secondary)' : 'var(--secondary)', fontWeight: '600' }}>{product.category || 'Special'}</span>
                    {product.isCombo && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '6px', fontWeight: '800', marginLeft: 'auto' }}>🎁 COMBO DEAL</span>}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>{product.name}</h3>
                  {product.variants && product.variants.length > 0 ? (
                    <p style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: product.isCombo ? '0.5rem' : '1rem', color: 'var(--text-secondary)' }}>From ₹{Math.min(...product.variants.map(v => v.price))}</p>
                  ) : (
                    <p style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: product.isCombo ? '0.5rem' : '1rem' }}>₹{product.price}</p>
                  )}
                  
                  {product.isCombo && (
                    <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                      {product.comboItems && product.comboItems.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Includes:</span>
                          {product.comboItems.map((ci, idx) => (
                            <div key={idx} style={{ marginBottom: '0.2rem' }}>• {ci.quantity} {ci.name}</div>
                          ))}
                        </div>
                      )}
                      {product.freeItems && product.freeItems.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <span style={{ fontWeight: '700', display: 'block', marginBottom: '0.25rem' }}>+ Free:</span>
                          {product.freeItems.map((fi, idx) => (
                            <div key={idx} style={{ marginBottom: '0.2rem' }}>• {fi.quantity} {fi.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!product.isCombo && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Authentic flavor prepared with fresh ingredients. A favorite among locals.
                    </p>
                  )}
                </div>

                <div style={{ width: '120px', position: 'relative', flexShrink: 0 }}>
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '16px', background: '#f3f4f6' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                    />
                  ) : null}
                  <div style={{ 
                    display: product.image ? 'none' : 'flex', 
                    width: '120px', 
                    height: '120px', 
                    background: '#f3f4f6', 
                    borderRadius: '16px', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>🍲</div>

                  <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', width: '90%' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleAddToCartClick(product)}
                      disabled={isUnavailable || storeClosed}
                      style={{ 
                        padding: '0.6rem', 
                        height: '42px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800',
                        letterSpacing: '0.5px',
                        boxShadow: (isUnavailable || storeClosed) ? 'none' : '0 8px 25px rgba(239, 65, 35, 0.3)',
                        borderRadius: '12px',
                        background: (isUnavailable || storeClosed) ? '#f1f5f9' : 'var(--primary)',
                        color: (isUnavailable || storeClosed) ? 'var(--text-secondary)' : 'white',
                        border: 'none',
                        transition: 'all 0.3s ease',
                        cursor: (isUnavailable || storeClosed) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {storeClosed ? '🔒 CLOSED' : isUnavailable ? 'SOLD OUT' : (product.variants && product.variants.length > 0 ? 'OPTIONS +' : <><Plus size={14} /> ADD</>)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', background: '#ffffff', padding: '2rem', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>Customize Size</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{selectedProduct.name}</p>
              </div>
              <button onClick={() => setShowVariantModal(false)} style={{ background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {selectedProduct.variants.map((v, i) => (
                <label key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: selectedVariant === v ? 'rgba(239, 65, 35, 0.08)' : '#f8fafc', border: `2px solid ${selectedVariant === v ? 'var(--primary)' : 'var(--surface-border)'}`, borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selectedVariant === v ? 'var(--primary)' : 'var(--text-secondary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {selectedVariant === v && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>}
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--text-primary)' }}>{v.name}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: 'var(--secondary)', fontSize: '1.125rem' }}>₹{v.price}</span>
                  <input type="radio" hidden checked={selectedVariant === v} onChange={() => setSelectedVariant(v)} />
                </label>
              ))}
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (storeClosed) return;
                addToCart(selectedProduct, id, selectedVariant);
                setShowVariantModal(false);
              }}
              disabled={storeClosed}
              style={{ width: '100%', height: '54px', borderRadius: '16px', fontSize: '1.125rem', opacity: storeClosed ? 0.5 : 1 }}
            >
              {storeClosed ? '🔒 Store is Closed' : `Add to Cart - ₹${selectedVariant?.price}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreMenu;
