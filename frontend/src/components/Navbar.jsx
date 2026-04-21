import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Store, Search, User, ShoppingBag, X, ChefHat, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import logoSymbol from '../assets/logo-symbol.png';

const Navbar = ({ bannerVisible }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { vendor, token } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ stores: [], dishes: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Track window width for reactivity
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 600;

  // Hide Navbar on vendor and super-admin routes
  if (location.pathname.startsWith('/vendor') || location.pathname.startsWith('/super-admin')) {
    return null;
  }

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ stores: [], dishes: [] });
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const locationId = localStorage.getItem('universe_location_id');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/global/search`, {
          params: { q: searchQuery, locationId }
        });
        setSearchResults({
          stores: res.data.stores || [],
          dishes: res.data.dishes || []
        });
        setShowDropdown(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleResultClick = (storeId) => {
    setShowDropdown(false);
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(`/store/${storeId}`);
  };

  const closeSearch = () => {
    setIsSearchFocused(false);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  return (
    <nav className="nav-container" style={{ top: bannerVisible ? '38px' : 0 }}>
      {/* Brand Logo - Hidden when searching on mobile */}
       {(!isSearchFocused || !isMobile) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div 
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.75rem' }}
          >
            <img src={logoSymbol} alt="UNIVERSE Symbol" style={{ height: '44px', objectFit: 'contain' }} />
            {!isMobile && (
              <span style={{ 
                fontFamily: "'Poppins', sans-serif", 
                fontWeight: '900', 
                fontSize: '1.25rem', 
                letterSpacing: '-0.03em', 
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                UNIVERSE
              </span>
            )}
          </div>

          {!isAdminPath && (
            <div 
              onClick={() => {
                localStorage.removeItem('universe_location_id');
                window.location.reload();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                background: '#f8fafc',
                border: '1px solid var(--surface-border)',
                borderRadius: '100px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginLeft: isMobile ? '0' : '0.5rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'var(--surface-border)'; }}
            >
              <div style={{ width: '20px', height: '20px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <MapPin size={10} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', maxWidth: isMobile ? '80px' : '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {localStorage.getItem('universe_location_name') || 'Select Hub'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Global Search Bar - Hidden on Store Pages */}
      {!location.pathname.startsWith('/store/') && (
        <div 
          className={`search-wrapper ${isSearchFocused ? 'focused' : ''}`}
          ref={dropdownRef}
        >
          <div className="search-inner">
            {isMobile && isSearchFocused ? (
              <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '0.25rem', cursor: 'pointer', marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={18} />
              </button>
            ) : (
              <Search size={18} color={isSearchFocused ? 'var(--primary)' : 'var(--text-secondary)'} style={{ opacity: 0.7 }} />
            )}
            
            <input 
              ref={searchInputRef}
              type="text"
              placeholder={isMobile ? "Search campus..." : "Search stores or cravings..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { 
                  setIsSearchFocused(true); 
                  if (searchQuery.trim().length > 0) setShowDropdown(true); 
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9375rem',
                fontWeight: '500',
                outline: 'none',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowDropdown(false); searchInputRef.current?.focus(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {showDropdown && (
            <div className="search-results-overlay">
              {isSearching ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div className="skeleton skeleton-title" style={{ width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                  <p style={{ fontSize: '0.875rem' }}>Searching...</p>
                </div>
              ) : searchResults.stores.length === 0 && searchResults.dishes.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ChefHat size={32} color="var(--surface-border)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.875rem' }}>No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div style={{ padding: '0.75rem 0' }}>
                  {/* Store Matches */}
                  {searchResults.stores.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', padding: '0 1.5rem' }}>Stalls</h4>
                      {searchResults.stores.map((store) => (
                        <div 
                          key={`store-${store._id}`}
                          onClick={() => handleResultClick(store._id)}
                          className="result-item"
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                            <img src={getImageUrl(store.image)} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '700', color: 'var(--text-primary)' }}>{store.name}</h5>
                             <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                               <MapPin size={10} color="var(--primary)" /> {store.market}
                             </p>
                          </div>
                          <ChevronRight size={14} color="#cbd5e1" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  {searchResults.stores.length > 0 && searchResults.dishes.length > 0 && (
                    <div style={{ height: '1px', background: 'var(--surface-border)', margin: '0.75rem 1.5rem' }} />
                  )}

                  {/* Dish Matches */}
                  {searchResults.dishes.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', padding: '0 1.5rem' }}>Items</h4>
                      {searchResults.dishes.map((store) => (
                        <div 
                          key={`dish-store-${store._id}`}
                          onClick={() => handleResultClick(store._id)}
                          className="result-item"
                          style={{ background: 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.03)' }}
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--surface-border)' }}>
                            <ChefHat size={18} color="var(--primary)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                              In <span style={{ color: 'var(--primary)' }}>{store.name}</span>
                            </h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                              {store.matchedProducts.map((p, pIdx) => (
                                <span key={pIdx} style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                  {p.name} <span style={{ color: 'var(--primary)' }}>₹{p.price}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight size={14} color="var(--primary)" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right Icons */}
      {(!isSearchFocused || !isMobile) && token && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <button 
            onClick={() => navigate('/vendor/dashboard')}
            className="btn-secondary"
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '12px', 
              fontSize: '0.8125rem', 
              fontWeight: '700', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              width: 'auto',
              background: '#f8fafc'
            }}
          >
            <User size={14} /> <span className="hide-on-mobile">Dashboard</span>
          </button>
        </div>
      )}

      {/* Responsive Styles embedded for Navbar */}
      <style>{`
        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
          .hide-on-mobile {
            display: none !important;
          }
          .search-result-item {
            padding: 1rem !important;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-radius: 0 !important;
          }
          .search-result-item:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
