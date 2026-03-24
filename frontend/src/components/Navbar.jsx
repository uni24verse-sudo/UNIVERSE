import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Store, Search, User, ShoppingBag, X, ChefHat, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
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
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/global/search?q=${searchQuery}`);
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
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--surface-border)',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2rem'
    }}>
      {/* Brand Logo - Hidden when searching on mobile */}
      {(!isSearchFocused || !isMobile) && (
        <div 
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}>
            <Store color="white" size={24} />
          </div>
          <span className="hide-on-mobile" style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.04em', color: 'white' }}>UniVerse</span>
        </div>
      )}

      {/* Global Search Bar - Hidden on Store Pages */}
      {!location.pathname.startsWith('/store/') && (
        <div 
          className={`search-container ${isSearchFocused ? 'focused' : ''}`}
          style={{ 
            flex: 1, 
            maxWidth: isSearchFocused ? '800px' : '600px', 
            position: 'relative',
            zIndex: 1002,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} 
          ref={dropdownRef}
        >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--surface-border)',
          borderRadius: '99px',
          padding: '0.5rem 1.25rem',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(20px)',
          boxShadow: isSearchFocused ? '0 10px 40px rgba(0,0,0,0.6)' : 'none',
          borderColor: isSearchFocused ? 'var(--primary)' : 'rgba(255,255,255,0.15)'
        }}>
          {isMobile && isSearchFocused ? (
            <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '0.25rem', cursor: 'pointer', marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Search size={20} color={isSearchFocused ? 'var(--primary)' : 'var(--text-secondary)'} style={{ minWidth: '20px' }} />
          )}
          
          <input 
            ref={searchInputRef}
            type="text"
            placeholder={isMobile ? "Search campus..." : "Search stores, cravings, specialties..."}
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
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              outline: 'none',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setShowDropdown(false); searchInputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown/Overlay */}
        {showDropdown && (
          <div 
            className="search-results-overlay"
            style={{
              position: 'absolute',
              top: 'calc(100% + 15px)',
              left: isMobile ? '-1rem' : 0,
              right: isMobile ? '-1rem' : 0,
              background: 'rgba(11, 15, 26, 0.99)',
              border: isMobile ? 'none' : '1px solid var(--surface-border)',
              borderRadius: isMobile ? 0 : '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              maxHeight: isMobile ? 'calc(100vh - 100px)' : '500px',
              overflowY: 'auto',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(30px)',
              animation: 'dropdownFade 0.2s ease-out',
              paddingBottom: isMobile ? '2rem' : 0
            }}
          >
            
            {isSearching ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div className="pulse-container" style={{ margin: '0 auto 1rem', width: '30px', height: '30px' }}><div className="pulse-dot" style={{ width: '10px', height: '10px' }}></div></div>
                <p>Searching the campus...</p>
              </div>
            ) : searchResults.stores.length === 0 && searchResults.dishes.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <ChefHat size={32} color="var(--surface-border)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No results found for "{searchQuery}"</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Try searching for a category like "Meals" or a dish like "Dosa".</p>
              </div>
            ) : (
              <div style={{ padding: '1rem 0' }}>
                {/* Store Matches */}
                {searchResults.stores.length > 0 && (
                  <div style={{ padding: '0 1rem', marginBottom: searchResults.dishes.length > 0 ? '1rem' : 0 }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>Stalls & Outlets</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {searchResults.stores.map((store) => (
                        <div 
                          key={`store-${store._id}`}
                          onClick={() => handleResultClick(store._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          className="search-result-item"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={getImageUrl(store.image)} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>{store.name}</h5>
                             <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                               <MapPin size={12} color="var(--primary)" /> {store.category || 'General'} • <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{store.market}</span>
                             </p>
                          </div>
                          <ChevronRight size={18} color="var(--surface-border)" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {searchResults.stores.length > 0 && searchResults.dishes.length > 0 && (
                  <div style={{ height: '1px', background: 'var(--surface-border)', margin: '1rem 0' }} />
                )}

                {/* Dish Matches */}
                {searchResults.dishes.length > 0 && (
                  <div style={{ padding: '0 1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>Specific Items</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {searchResults.dishes.map((store) => (
                        <div 
                          key={`dish-store-${store._id}`}
                          onClick={() => handleResultClick(store._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                            background: 'rgba(99, 102, 241, 0.05)'
                          }}
                          className="search-result-item"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ChefHat size={20} color="var(--primary)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>
                              Found in <span style={{ color: 'var(--primary)' }}>{store.name}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.6rem', fontWeight: '600', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                {store.market}
                              </span>
                            </h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                              {store.matchedProducts.map((p, pIdx) => (
                                <span key={pIdx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  {p.name} <span style={{ color: 'var(--secondary)', fontWeight: '800' }}>₹{p.price}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight size={18} color="var(--primary)" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Right Icons - Hidden when searching on mobile */}
      {(!isSearchFocused || !isMobile) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <button 
            onClick={() => navigate(token ? '/vendor/dashboard' : '/vendor/login')}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '0.6rem 1.25rem', borderRadius: '14px', fontSize: '0.875rem', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <User size={16} /> {token ? 'Dashboard' : 'Vendor'}
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
