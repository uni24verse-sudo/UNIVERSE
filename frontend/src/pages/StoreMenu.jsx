import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, Clock, Search, X, LayoutList, LayoutGrid, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { useStoreTheme } from '../hooks/useStoreTheme';

// Import Modularized Components
import OptimizedImage from '../components/OptimizedImage';
import StoreSubHeader from '../components/Store/StoreSubHeader';
import CategoryOverview from '../components/Store/CategoryOverview';
import ProductCard from '../components/Store/ProductCard';
import VariantModal from '../components/Store/VariantModal';

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '28px' }}></div>
        ))}
      </div>
    </div>
  </div>
);

const StoreMenu = () => {
  const { id } = useParams();
  const location = useLocation();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (socket && connected && id) {
      const handleStoreStatus = ({ storeId, isOpen }) => {
        if (String(storeId) === String(id)) {
          setStore(prev => prev ? { ...prev, isOpen } : prev);
        }
      };

      const handleProductAvailability = ({ storeId, productId, isAvailable }) => {
        if (String(storeId) === String(id)) {
          setStore(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              products: (prev.products || []).map(p => 
                (String(p._id) === String(productId) || String(p.id) === String(productId))
                  ? { ...p, isAvailable }
                  : p
              )
            };
          });
        }
      };

      const handleStoreMenu = (data) => {
        const incomingId = String(data?.storeId || data?._id || data?.id || '');
        if (incomingId === String(id)) {
          if (data.store && Array.isArray(data.store.products)) {
            setStore(data.store);
          } else if (Array.isArray(data.products)) {
            setStore(prev => prev ? { ...prev, products: data.products } : prev);
          }
        }
      };

      socket.on('store_status_update', handleStoreStatus);
      socket.on('product_availability_update', handleProductAvailability);
      socket.on('store_menu_update', handleStoreMenu);

      return () => {
        socket.off('store_status_update', handleStoreStatus);
        socket.off('product_availability_update', handleProductAvailability);
        socket.off('store_menu_update', handleStoreMenu);
      };
    }
  }, [socket, connected, id]);

  useEffect(() => {
    // Detect physical QR scan and persist in local storage
    const params = new URLSearchParams(location.search);
    if (params.get('source') === 'qr') {
      localStorage.setItem('universe_order_source', 'qr');
      console.log('[StoreMenu] Physical QR Visit Identified');
    }

    // Check for shared dish parameter in URL
    const dishParam = params.get('dish');
    if (dishParam) {
      setSearchQuery(dishParam);
      setShowSearchModal(true);
    }
  }, [location.search]);

  // Menu State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchAnchorRef = useRef(null);
  const searchInputRef = useRef(null);

  const isExternal = localStorage.getItem('universe_location_type') === 'External' || store?.hubId?.type === 'External';

  const handleToggleSearch = useCallback(() => {
    setShowSearchModal(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (searchAnchorRef.current) {
          // Accurately calculate sticky top elements (Navbar + Promo + Sticky Store bar + breathing room)
          const isCollege = !isExternal && localStorage.getItem('universe_location_type') === 'College';
          const navHeight = window.innerWidth <= 600 ? 64 : 72;
          const promoHeight = isCollege ? 38 : 0;
          const stickyStoreHeight = 55;
          const totalHeaderOffset = navHeight + promoHeight + stickyStoreHeight + 15;

          const rect = searchAnchorRef.current.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - totalHeaderOffset;

          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });

          // Focus after smooth scroll completes so virtual keyboard does not cancel smooth scroll
          setTimeout(() => {
            if (searchInputRef.current) {
              searchInputRef.current.focus({ preventScroll: true });
            }
          }, 350);
        }
      }, 50);
    });
  }, [isExternal]);

  useEffect(() => {
    const handleNavbarSearch = () => {
      handleToggleSearch();
    };
    window.addEventListener('universe_toggle_store_search', handleNavbarSearch);
    return () => window.removeEventListener('universe_toggle_store_search', handleNavbarSearch);
  }, [handleToggleSearch]);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Apply Dynamic Brand Theme
  useStoreTheme(store);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${id}`);
        const fetchedStore = res.data;
        setStore(fetchedStore);
        
        // Automatic Location Synchronization
        if (fetchedStore.locationId) {
          const currentLocId = localStorage.getItem('universe_location_id');
          const targetLoc = fetchedStore.locationId;
          const targetId = targetLoc._id || targetLoc;
          
          if (currentLocId !== targetId) {
            localStorage.setItem('universe_location_id', targetId);
            if (targetLoc.name) {
              localStorage.setItem('universe_location_name', targetLoc.name);
              localStorage.setItem('universe_location_type', targetLoc.type || 'College');
            }
            // Trigger smooth global sync without reload
            window.dispatchEvent(new CustomEvent('universe_set_location', { detail: targetLoc }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();

    // Listen for global sync events from SessionGuard
    window.addEventListener('universe_sync_data', fetchStore);
    return () => window.removeEventListener('universe_sync_data', fetchStore);
  }, [id]);

  // Robust Wakeup Mechanism: Refetch data when returning from inactivity/sleep
  useEffect(() => {
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        console.log('[StoreMenu] Device woke up, syncing fresh store data...');
        // Silent fetch to ensure store open/close status and menu are fresh
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${id}`)
          .then(res => setStore(res.data))
          .catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
    };
  }, [id]);

  // Performance Optimization: Normalize and memoize category and product calculations
  const categories = useMemo(() => {
    if (!store || !store.products) return [];
    
    const otherCats = [];
    let hasCombos = false;

    store.products.forEach(p => {
      const rawCat = (p.category || 'Specialty').trim();
      if (p.isCombo || rawCat.toLowerCase() === 'combo' || rawCat.toLowerCase() === 'combos') {
        hasCombos = true;
      } else {
        const formatted = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
        if (!otherCats.includes(formatted)) {
          otherCats.push(formatted);
        }
      }
    });

    return ['All', ...(hasCombos ? ['Combos'] : []), ...otherCats];
  }, [store]);

  const categoryCounts = useMemo(() => {
    if (!store || !store.products) return {};
    const counts = { All: store.products.length };
    store.products.forEach(p => {
      const isThisCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
      if (isThisCombo) {
        counts['Combos'] = (counts['Combos'] || 0) + 1;
      } else {
        const rawCat = (p.category || 'Specialty').trim();
        const formatted = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
        counts[formatted] = (counts[formatted] || 0) + 1;
      }
    });
    return counts;
  }, [store]);

  const filteredProducts = useMemo(() => {
    if (!store) return [];
    return store.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesDietary = true;
      if (dietaryFilter === 'veg') matchesDietary = p.dietaryPreference === 'veg';
      else if (dietaryFilter === 'non-veg') matchesDietary = ['non-veg', 'egg'].includes(p.dietaryPreference);
      
      if (!matchesSearch || !matchesDietary) return false;
      if (activeCategory === 'All') return true;
      
      const isThisCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
      if (activeCategory === 'Combos') return isThisCombo;
      
      const pCat = (p.category || 'Specialty').trim();
      return pCat.toLowerCase() === activeCategory.toLowerCase();
    });
  }, [store, searchQuery, dietaryFilter, activeCategory]);

  const visibleCategories = useMemo(() => {
    if (!store) return [];
    return categories.filter(cat => {
      if (cat === 'All') return true;
      return store.products.some(p => {
        let matchesDietary = true;
        if (dietaryFilter === 'veg') matchesDietary = p.dietaryPreference === 'veg';
        else if (dietaryFilter === 'non-veg') matchesDietary = ['non-veg', 'egg'].includes(p.dietaryPreference);
        if (!matchesDietary) return false;
        const isThisCombo = p.isCombo || (p.category || '').toLowerCase().includes('combo');
        return cat === 'Combos' ? isThisCombo : (p.category || 'Specialty').toLowerCase() === cat.toLowerCase();
      });
    });
  }, [store, categories, dietaryFilter]);

  const effectiveDietaryMode = useMemo(() => {
    if (!store) return 'veg';
    const loc = store.location || {};
    const locName = (loc.name || localStorage.getItem('universe_location_name') || '').toLowerCase();
    
    // Explicit setting on location
    if (loc.dietaryType === 'veg') return 'veg';
    if (loc.dietaryType === 'non-veg') return 'non-veg';
    if (loc.dietaryType === 'both') return 'both';

    // Heuristics for Lovely Professional University
    if (locName.includes('lovely') || locName.includes('lpu')) {
      return 'veg';
    }

    // Check store products: if store has non-veg or egg items, allow 'both', otherwise 'veg'
    const hasNonVeg = (store.products || []).some(p => ['non-veg', 'egg'].includes(p.dietaryPreference));
    return hasNonVeg ? 'both' : 'veg';
  }, [store]);

  const storeClosed = store?.isOpen === false;

  // Performance Optimization: Memoize handlers
  const handleVariantClick = useCallback((product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants[0]);
    setShowVariantModal(true);
  }, []);

  const handleAddToCartClick = useCallback((product) => {
    if (storeClosed) return;
    if (product.isAvailable === false) return;
    if (product.variants && product.variants.length > 0) {
      handleVariantClick(product);
    } else {
      addToCart(product, id);
    }
  }, [storeClosed, id, addToCart, handleVariantClick]);

  if (loading) return <MenuSkeleton />;
  if (!store) return <div className="auth-wrapper"><h3>Store not found.</h3></div>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '160px' }}>
      {/* Full-Width Edge-to-Edge Hero Banner with Bottom-Only Rounded Corners */}
      <div className="store-banner-fullwidth animate-fade-in-up">
        <OptimizedImage src={store.image} alt={store.name} className="store-banner-img" />
        <button 
          onClick={() => navigate(-1)} 
          className="store-banner-back-btn"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <StoreSubHeader 
        store={store}
        navigate={navigate}
        isExternal={isExternal}
        dietaryFilter={dietaryFilter}
        setDietaryFilter={setDietaryFilter}
        showDietaryFilter={effectiveDietaryMode === 'both'}
      />

      <div className="store-menu-content-container">
        {/* Anchor for precision auto-scrolling when search is triggered */}
        <div ref={searchAnchorRef} id="store-search-anchor" style={{ scrollMarginTop: '180px' }} />

        {/* Connected Inline Search Bar directly above dishes */}
        {showSearchModal && (
          <div className="connected-search-container animate-fade-in-up">
            <div className="connected-search-bar">
              <Search size={18} color="#ef4123" />
              <input 
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder={`Search dishes in ${store.name}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="connected-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="search-modal-clear-btn"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
              <button onClick={() => setShowSearchModal(false)} className="connected-search-close-btn">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Active Filter / Search Banner */}
        {(activeCategory !== 'All' || searchQuery) && (
          <div className="active-filter-banner animate-fade-in-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filtered by:</span>
              <span style={{ fontWeight: '800', color: '#ef4123', fontSize: '0.85rem' }}>
                {activeCategory !== 'All' ? activeCategory : `"${searchQuery}"`}
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.06)', padding: '0.1rem 0.45rem', borderRadius: '100px', fontWeight: '700' }}>
                {filteredProducts.length} items
              </span>
            </div>
            <button 
              onClick={() => { setActiveCategory('All'); setSearchQuery(''); }} 
              className="clear-filter-btn"
            >
              <X size={12} strokeWidth={2.5} /> Clear
            </button>
          </div>
        )}

        {/* Product Cards Container (Dynamic: List or Grid) */}
        <div className={viewMode === 'list' ? 'store-menu-list' : 'store-menu-grid'}>
          {isExternal && activeCategory === 'All' && !searchQuery && (
            <CategoryOverview 
              categories={visibleCategories} 
              store={store} 
              onCategorySelect={setActiveCategory} 
              activeCategory={activeCategory}
            />
          )}

          {isExternal && activeCategory !== 'All' && (
             <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
               <button onClick={() => { setActiveCategory('All'); setSearchQuery(''); }} className="category-btn active" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <ArrowLeft size={16} /> Back to Categories
               </button>
             </div>
          )}

          {(!isExternal || activeCategory !== 'All' || searchQuery) && filteredProducts.map((product, idx) => (
            <ProductCard 
              key={product._id || product.id || idx} 
              product={product} 
              storeId={id} 
              index={idx}
              onVariantClick={() => handleAddToCartClick(product)}
              storeClosed={storeClosed}
              showDietaryBadge={effectiveDietaryMode === 'both'}
              viewMode={viewMode}
            />
          ))}
        </div>

        {/* Friendly Empty State */}
        {(!isExternal || activeCategory !== 'All' || searchQuery) && filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }} className="animate-fade-in-up">
            <UtensilsCrossed size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>No dishes found</h4>
            <p style={{ fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              {searchQuery ? `No results matching "${searchQuery}"` : `No items in ${activeCategory}`}
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} 
              className="category-pill-btn active"
              style={{ display: 'inline-block' }}
            >
              Show All Dishes ({categoryCounts['All'] || 0})
            </button>
          </div>
        )}
      </div>

      {/* Sleek Precision-Machined Controller Docked to Extreme Right (Campus Stalls Only) */}
      {!isExternal && (
        <div className="stall-controller-rail">
          <div className="controller-rail-inner-content">
            {/* 1. Search Action */}
            <button 
              className={`controller-rail-btn ${showSearchModal || searchQuery ? 'active-filter' : ''}`}
              onClick={handleToggleSearch}
              title="Search dishes"
              aria-label="Search dishes"
            >
              <Search size={18} />
            </button>

            <div className="controller-rail-divider" />

            {/* 2. Menu Categories Drawer Action */}
            <button 
              className={`controller-rail-btn ${activeCategory !== 'All' ? 'active-filter' : ''}`}
              onClick={() => setShowMenuSheet(true)}
              title="Browse Menu Categories"
              aria-label="Browse Menu Categories"
            >
              <UtensilsCrossed size={18} />
              <span className="controller-rail-badge">{categories.length}</span>
            </button>

            <div className="controller-rail-divider" />

            {/* 3. Layout Switcher (List ☰ / Grid ⊞) */}
            <button 
              className="controller-rail-btn"
              onClick={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
              title={`Switch to ${viewMode === 'list' ? 'Grid' : 'List'} View`}
              aria-label={`Switch to ${viewMode === 'list' ? 'Grid' : 'List'} View`}
            >
              {viewMode === 'list' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Slide-Up Browse Menu Category Drawer */}
      {showMenuSheet && (
        <div className="menu-sheet-overlay" onClick={() => setShowMenuSheet(false)}>
          <div className="menu-sheet-container" onClick={e => e.stopPropagation()}>
            <div className="menu-sheet-handle" />
            <div className="menu-sheet-header">
              <h3>
                <UtensilsCrossed size={20} color="var(--primary)" />
                Browse Menu
              </h3>
              <button 
                className="menu-sheet-close-btn"
                onClick={() => setShowMenuSheet(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="menu-sheet-list">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`menu-sheet-item ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    setShowMenuSheet(false);
                    window.scrollTo({ top: 180, behavior: 'smooth' });
                  }}
                >
                  <span>{cat}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="menu-sheet-item-count">
                      {categoryCounts[cat] || 0}
                    </span>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showVariantModal && (
        <VariantModal 
          selectedProduct={selectedProduct}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
          addToCart={addToCart}
          storeId={id}
          storeClosed={storeClosed}
        />
      )}
    </div>
  );
};

export default StoreMenu;
