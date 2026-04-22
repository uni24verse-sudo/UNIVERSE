import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { ArrowLeft, ShoppingBag, ChefHat, Info, Plus, Search, Star, Clock, Store, X, Sparkles } from 'lucide-react';
import { useStoreTheme } from '../hooks/useStoreTheme';
import QuantitySelector from '../components/QuantitySelector';

const MenuSkeleton = () => (
  <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
    <div className="store-banner-wrapper skeleton" style={{ height: '240px' }}></div>
    <div className="store-header-sticky" style={{ background: 'white' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '150px', height: '1.25rem' }}></div>
      </div>
    </div>
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="skeleton" style={{ height: '80px', borderRadius: '24px', marginBottom: '2rem' }}></div>
      <div className="skeleton" style={{ height: '52px', borderRadius: '100px', marginBottom: '1.5rem' }}></div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'hidden' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '100px', flexShrink: 0 }}></div>)}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '28px', marginBottom: '1.25rem' }}></div>
      ))}
    </div>
  </div>
);

const StoreMenu = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('all');

  // Apply Dynamic Brand Theme
  useStoreTheme(store);

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

  if (loading) return <MenuSkeleton />;
  if (!store) return <div className="auth-wrapper"><h3>Store not found or unavailable.</h3></div>;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const comboExists = store?.products.some(p => p.isCombo);
  const categories = store ? ['All', ...(comboExists ? ['Combos'] : []), ...new Set(store.products.map(p => p.category || 'Uncategorized'))] : [];
  
  const filteredProducts = store?.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDietary = true;
    if (dietaryFilter === 'veg') matchesDietary = p.dietaryPreference === 'veg';
    else if (dietaryFilter === 'non-veg') matchesDietary = ['non-veg', 'egg'].includes(p.dietaryPreference);
    
    if (activeCategory === 'All') return matchesSearch && matchesDietary;
    if (activeCategory === 'Combos') return p.isCombo && matchesSearch && matchesDietary;
    return (p.category || 'Uncategorized') === activeCategory && matchesSearch && matchesDietary;
  }) || [];

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  const storeClosed = store.isOpen === false;
  const isExternal = localStorage.getItem('universe_location_type') === 'External';

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
      <div className="store-banner-wrapper">
        <img 
          src={getImageUrl(store.image)} 
          alt={store.name} 
          className="store-banner-img"
          loading="lazy"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(251, 251, 251, 1) 100%)' }}></div>
      </div>

      {/* Store Info Subheader - Sticky */}
      <div className="store-header-sticky" style={{ 
        top: `calc(72px + ${(!isExternal && localStorage.getItem('universe_location_type') === 'College') ? 38 : 0}px)`,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        zIndex: 999
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{store.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: '600' }}>
              <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />20-30 mins</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{store.market || 'BH1 Market'}</span>
            </div>
          </div>
          <div style={{ width: '38px' }}></div> {/* Spacer for symmetry */}
        </div>
      </div>

      <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Store Banner/Info */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Menu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>Fresh from {store.name}</p>
              </div>
              {store.isOpen === false && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  color: 'var(--error)', 
                  fontSize: '0.625rem', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '99px', 
                  fontWeight: '800',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  letterSpacing: '0.05em'
                }}>OFFLINE</div>
              )}
           </div>
        </div>

        {/* Local Store Search Bar */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }} className="animate-fade-in-up">
          <div style={{ position: 'absolute', top: '50%', left: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.6 }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder={`Search menu...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ 
              borderRadius: '100px',
              paddingLeft: '3.25rem',
              height: '52px',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
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

        {/* Category Navigation - Sticky */}
        {!isExternal && (
          <div className="category-nav-wrapper animate-fade-in-up" style={{ 
            position: 'sticky',
            top: '70px',
            zIndex: 900,
            background: 'var(--background)',
            margin: '0 -1rem 1rem -1rem',
            padding: '0.75rem 1rem'
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

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

        {isExternal && activeCategory !== 'All' && !searchQuery && (
          <div className="dietary-filter-container animate-fade-in-up" style={{ 
            display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', 
            background: '#f8fafc', 
            padding: '0.5rem', borderRadius: '100px', 
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            border: '1px solid var(--surface-border)'
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'veg', label: 'Veg' },
              { id: 'non-veg', label: 'Non-Veg' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setDietaryFilter(filter.id)}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: '100px',
                  border: 'none',
                  background: dietaryFilter === filter.id ? '#ffffff' : 'transparent',
                  color: dietaryFilter === filter.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: '800',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: dietaryFilter === filter.id ? '0 8px 16px rgba(0,0,0,0.06)' : 'none',
                  transform: dietaryFilter === filter.id ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {filter.id === 'veg' && <span style={{ padding: '0.1rem 0.3rem', fontSize: '0.55rem', fontWeight: '900', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0, background: dietaryFilter === 'veg' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>VEG</span>}
                {filter.id === 'non-veg' && <span style={{ padding: '0.1rem 0.3rem', fontSize: '0.55rem', fontWeight: '900', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0, background: dietaryFilter === 'non-veg' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>NON-VEG</span>}
                {filter.label !== 'Veg' && filter.label !== 'Non-Veg' ? filter.label : null}
              </button>
            ))}
          </div>
        )}

        <div className="store-menu-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: isExternal && activeCategory === 'All' && !searchQuery ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: isExternal && activeCategory === 'All' && !searchQuery ? '0.75rem' : '1rem'
        }}>
          {activeCategory === 'All' && comboExists && !searchQuery && !isExternal && (
            <div 
              onClick={() => setActiveCategory('Combos')}
              className="animate-fade-in-up"
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
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)' }}>
                  🎁 Meal Bundles & Combos
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Save more with our curated combo deals!</p>
              </div>
              <div style={{ 
                background: 'var(--primary)', 
                color: 'white', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '100px', 
                fontWeight: '800', 
                fontSize: '0.75rem',
                boxShadow: '0 8px 20px rgba(239, 65, 35, 0.2)' 
              }}>
                VIEW ALL &rarr;
              </div>
            </div>
          )}

          {isExternal && activeCategory === 'All' && !searchQuery && (
            <div className="store-category-grid animate-fade-in-up" style={{ gridColumn: '1 / -1' }}>
              {categories.filter(c => c !== 'All').map((cat, idx) => {
                const getCategoryImage = (name) => {
                  const explicitCatImage = store.categoryImages?.find(c => c.categoryName === name)?.image;
                  if (explicitCatImage) return getImageUrl(explicitCatImage);

                  const productWithImage = store.products.find(p => (p.category || 'Uncategorized') === name && p.image);
                  if (productWithImage) return getImageUrl(productWithImage.image);
                  return null;
                };
                
                const catImage = getCategoryImage(cat);
                
                return (
                  <div key={cat} className="store-category-tile" onClick={() => setActiveCategory(cat)}>
                    {catImage ? (
                      <img src={catImage} alt={cat} className="store-category-image" />
                    ) : (
                      <div className="store-category-fallback-image">
                        {cat.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="store-category-name">{cat}</div>
                  </div>
                );
              })}
            </div>
          )}

          {isExternal && activeCategory !== 'All' && (
             <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
               <button 
                 onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                 style={{
                   background: '#ffffff',
                   border: '1px solid var(--surface-border)',
                   color: 'var(--text-primary)',
                   padding: '0.5rem 1rem',
                   borderRadius: '100px',
                   cursor: 'pointer',
                   boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.5rem',
                   fontWeight: '700',
                   fontSize: '0.875rem'
                 }}
               >
                 <ArrowLeft size={16} /> Back to Categories
               </button>
             </div>
          )}

          {(!isExternal || activeCategory !== 'All' || searchQuery) && filteredProducts.map((product, idx) => {
            const isUnavailable = product.isAvailable === false;
            return (
              <div 
                key={product._id} 
                className="product-card animate-fade-in-up"
                style={{ 
                  animationDelay: `${idx * 0.05}s`,
                  opacity: isUnavailable ? 0.6 : 1,
                  filter: isUnavailable ? 'grayscale(0.8)' : 'none',
                  pointerEvents: isUnavailable ? 'none' : 'auto',
                }}
              >
                {isUnavailable && (
                   <div style={{
                     position: 'absolute',
                     top: '20px',
                     right: '-35px',
                     transform: 'rotate(45deg)',
                     background: '#64748b',
                     color: 'white',
                     padding: '0.25rem 3rem',
                     fontWeight: '900',
                     fontSize: '0.625rem',
                     zIndex: 20,
                     letterSpacing: '0.1em'
                   }}>SOLD OUT</div>
                )}

                <div className="product-img-container">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="product-img"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                    />
                  ) : null}
                  <div style={{ 
                    display: product.image ? 'none' : 'flex', 
                    width: '100%', 
                    height: '100%', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                  }}>🍲</div>

                  {/* Floating Quantity Selector Overlay */}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '12px', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100px',
                    zIndex: 15
                  }}>
                    <QuantitySelector 
                      product={product} 
                      storeId={id} 
                      onVariantClick={handleAddToCartClick}
                      storeClosed={storeClosed}
                    />
                  </div>
                </div>

                <div className="product-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {product.dietaryPreference === 'veg' && (
                      <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #10b981', color: '#10b981', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(16, 185, 129, 0.05)' }}>VEG</span>
                    )}
                    {product.dietaryPreference === 'non-veg' && (
                      <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(239, 68, 68, 0.05)' }}>NON-VEG</span>
                    )}
                    {product.dietaryPreference === 'egg' && (
                      <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem', fontWeight: '900', border: '1.5px solid #f59e0b', color: '#f59e0b', borderRadius: '6px', letterSpacing: '0.08em', background: 'rgba(245, 158, 11, 0.05)' }}>EGG</span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.category || 'Specialty'}</span>
                  </div>

                  <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: '1.2' }}>{product.name}</h3>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)' }}>₹</span>
                    {product.variants && product.variants.length > 0 ? (
                      <span style={{ fontWeight: '900', fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{Math.min(...product.variants.map(v => v.price))}<span style={{ fontSize: '0.8rem', marginLeft: '1px' }}>+</span></span>
                    ) : (
                      <span style={{ fontWeight: '900', fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{product.price}</span>
                    )}
                  </div>
                  
                  {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
                    <div style={{ 
                      marginTop: '1rem',
                      background: 'rgba(99, 102, 241, 0.03)', 
                      padding: '0.6rem 0.8rem', 
                      borderRadius: '14px', 
                      border: '1px solid rgba(99, 102, 241, 0.08)' 
                    }}>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {product.comboItems.map((ci, k) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                             <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.6 }}></div>
                             <span style={{ fontWeight: '500' }}><span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{ci.quantity}</span> {ci.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Customize Selection</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '500' }}>{selectedProduct.name}</p>
              </div>
              <button onClick={() => setShowVariantModal(false)} style={{ background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
              {selectedProduct.variants.map((v, i) => (
                <label key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.25rem', 
                  background: selectedVariant === v ? 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.05)' : '#f8fafc', 
                  border: `2px solid ${selectedVariant === v ? 'var(--primary)' : 'transparent'}`, 
                  borderRadius: '20px', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      border: `2px solid ${selectedVariant === v ? 'var(--primary)' : '#cbd5e1'}`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: selectedVariant === v ? 'var(--primary)' : 'transparent',
                      transition: 'all 0.2s ease'
                    }}>
                       {selectedVariant === v && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>}
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: selectedVariant === v ? 'var(--primary)' : 'var(--text-primary)' }}>{v.name}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: selectedVariant === v ? 'var(--primary)' : 'var(--text-primary)', fontSize: '1rem' }}>₹{v.price}</span>
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
              style={{ width: '100%', height: '56px', borderRadius: '18px', fontSize: '1rem', letterSpacing: '0.02em' }}
            >
              {storeClosed ? '🔒 STORE CLOSED' : `ADD SELECTION - ₹${selectedVariant?.price}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreMenu;
