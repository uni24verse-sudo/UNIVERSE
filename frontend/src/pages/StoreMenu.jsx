import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, Clock, Search, X } from 'lucide-react';
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
        if (storeId === id) {
          setStore(prev => prev ? { ...prev, isOpen } : prev);
        }
      };

      const handleProductAvailability = ({ productId, isAvailable }) => {
        setStore(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            products: prev.products.map(p => p._id === productId ? { ...p, isAvailable } : p)
          };
        });
      };

      socket.on('store_status_update', handleStoreStatus);
      socket.on('product_availability_update', handleProductAvailability);

      return () => {
        socket.off('store_status_update', handleStoreStatus);
        socket.off('product_availability_update', handleProductAvailability);
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
  }, [location.search]);
  
  // Menu State
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('all');

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

  // Performance Optimization: Memoize category and product calculations
  const categories = useMemo(() => {
    if (!store) return [];
    const comboExists = store.products.some(p => p.isCombo);
    return ['All', ...(comboExists ? ['Combos'] : []), ...new Set(store.products.map(p => p.category || 'Uncategorized'))];
  }, [store]);

  const filteredProducts = useMemo(() => {
    if (!store) return [];
    return store.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesDietary = true;
      if (dietaryFilter === 'veg') matchesDietary = p.dietaryPreference === 'veg';
      else if (dietaryFilter === 'non-veg') matchesDietary = ['non-veg', 'egg'].includes(p.dietaryPreference);
      
      if (activeCategory === 'All') return matchesSearch && matchesDietary;
      if (activeCategory === 'Combos') return p.isCombo && matchesSearch && matchesDietary;
      return (p.category || 'Uncategorized') === activeCategory && matchesSearch && matchesDietary;
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
        return cat === 'Combos' ? p.isCombo : (p.category || 'Uncategorized') === cat;
      });
    });
  }, [store, categories, dietaryFilter]);

  const storeClosed = store?.isOpen === false;
  const isExternal = localStorage.getItem('universe_location_type') === 'External';

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
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      <div className="store-banner-wrapper">
        <OptimizedImage src={store.image} alt={store.name} className="store-banner-img" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(251, 251, 251, 1) 100%)' }}></div>
      </div>

      <StoreSubHeader 
        store={store}
        navigate={navigate}
        isExternal={isExternal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dietaryFilter={dietaryFilter}
        setDietaryFilter={setDietaryFilter}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      <div style={{ padding: '0 1rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Campus Category Nav Bar */}
        {!isExternal && (
          <div className="category-nav-wrapper animate-fade-in-up" style={{ 
            position: 'sticky',
            top: `calc(var(--nav-actual-height, 72px) + ${(!isExternal && localStorage.getItem('universe_location_type') === 'College') ? 'var(--promo-height, 38px)' : '0px'} + 68px)`,
            zIndex: 998,
            background: 'rgba(251, 251, 251, 0.98)',
            backdropFilter: 'blur(10px)',
            margin: '1rem -1rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--surface-border)'
          }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`category-btn ${activeCategory === cat ? 'active' : ''}`}>{cat}</button>
            ))}
          </div>
        )}

        {storeClosed && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '24px', border: '1px dashed rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
            <Clock size={40} color="var(--error)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--error)', margin: '0 0 0.5rem 0' }}>Currently Closed</h3>
          </div>
        )}

        <div className="store-menu-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: isExternal && activeCategory === 'All' && !searchQuery ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem'
        }}>
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
              key={product._id} 
              product={product} 
              storeId={id} 
              index={idx}
              onVariantClick={() => handleAddToCartClick(product)}
              storeClosed={storeClosed}
            />
          ))}
        </div>
      </div>

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
