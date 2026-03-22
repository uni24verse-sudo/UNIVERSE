import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Store, Search, User, ShoppingBag, X, ChefHat, MapPin, ChevronRight } from 'lucide-react';
import { CartContext } from '../context/CartContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ stores: [], dishes: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
    setSearchQuery('');
    navigate(`/store/${storeId}`);
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
      {/* Brand Logo */}
      <div 
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
      >
        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}>
          <Store color="white" size={24} />
        </div>
        <span className="hide-on-mobile" style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.04em', color: 'white' }}>UniVerse</span>
      </div>

      {/* Global Search Bar */}
      <div style={{ flex: 1, maxWidth: '600px', position: 'relative' }} ref={dropdownRef}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--surface-border)',
          borderRadius: '99px',
          padding: '0.5rem 1.25rem',
          transition: 'all 0.3s ease',
          boxShadow: showDropdown ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
          borderColor: showDropdown ? 'var(--primary)' : 'var(--surface-border)'
        }}>
          <Search size={20} color={showDropdown ? 'var(--primary)' : 'var(--text-secondary)'} style={{ minWidth: '20px' }} />
          <input 
            type="text"
            placeholder="Search stores, cravings, specialties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim().length > 0) setShowDropdown(true); }}
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
              onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            right: 0,
            background: 'var(--bg-dark)',
            border: '1px solid var(--surface-border)',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column'
          }} className="hide-scrollbar">
            
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
                              <MapPin size={12} color="var(--primary)" /> {store.category || 'General'}
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
                              Found matching items in <span style={{ color: 'var(--primary)' }}>{store.name}</span>
                            </h5>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Includes: {store.matchedProducts.map(p => p.name).join(', ')}
                            </p>
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

      {/* Right Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <button 
          onClick={() => navigate('/vendor/login')}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '0.6rem 1.25rem', borderRadius: '14px', fontSize: '0.875rem', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <User size={16} /> Vendor
        </button>
      </div>

      {/* Responsive Styles embedded for Navbar */}
      <style>{`
        @media (max-width: 600px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
