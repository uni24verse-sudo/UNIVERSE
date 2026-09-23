import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { 
  Store, 
  User, 
  Search, 
  ChefHat, 
  ShoppingBag, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Tag, 
  ChevronRight,
  Star,
  Pizza,
  Coffee,
  Utensils,
  Cake,
  IceCream,
  Beef,
  Sparkles,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import HeroCarousel from '../components/HeroCarousel';
import TrendingRow from '../components/TrendingRow';

const FloatingBackground = () => {
  const icons = [
    { Icon: Pizza, top: '10%', left: '5%', size: 60, rot: 15 },
    { Icon: Coffee, top: '25%', left: '85%', size: 50, rot: -10 },
    { Icon: Utensils, top: '60%', left: '8%', size: 45, rot: 30 },
    { Icon: Cake, top: '75%', left: '80%', size: 70, rot: -20 },
    { Icon: IceCream, top: '40%', left: '92%', size: 40, rot: 10 },
    { Icon: Beef, top: '55%', left: '88%', size: 55, rot: -15 },
    { Icon: Pizza, top: '85%', left: '15%', size: 50, rot: 45 },
    { Icon: Coffee, top: '5%', left: '75%', size: 40, rot: -5 },
    { Icon: Utensils, top: '15%', left: '45%', size: 30, rot: 10 },
    { Icon: Cake, top: '45%', left: '2%', size: 55, rot: -30 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
      {icons.map((item, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: item.top,
          left: item.left,
          color: 'var(--primary)',
          opacity: 0.08,
          transform: `rotate(${item.rot}deg)`
        }}>
          <item.Icon size={item.size} strokeWidth={1} />
        </div>
      ))}
    </div>
  );
};

const CampusStallCardSkeleton = () => (
  <div className="campus-stall-card" style={{ pointerEvents: 'none' }}>
    <div className="campus-stall-media skeleton" style={{ height: '195px', position: 'relative' }}>
      <div className="campus-stall-top-bar" style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        <div className="skeleton" style={{ width: '48px', height: '22px', borderRadius: '100px', background: 'rgba(255, 255, 255, 0.75)' }}></div>
        <div className="skeleton" style={{ width: '84px', height: '22px', borderRadius: '100px', background: 'rgba(255, 255, 255, 0.75)' }}></div>
      </div>
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 2 }}>
        <div className="skeleton" style={{ width: '88px', height: '22px', borderRadius: '100px', background: 'rgba(255, 255, 255, 0.75)' }}></div>
      </div>
    </div>
    <div className="campus-stall-details" style={{ padding: '1.25rem' }}>
      <div className="campus-stall-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div className="skeleton" style={{ width: '65%', height: '1.35rem', borderRadius: '6px' }}></div>
        <div className="skeleton" style={{ width: '18px', height: '18px', borderRadius: '50%' }}></div>
      </div>
      <div className="skeleton" style={{ width: '45%', height: '0.85rem', borderRadius: '4px', marginBottom: '1.25rem' }}></div>
      <div className="campus-stall-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '55px', height: '1rem', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '45px', height: '1rem', borderRadius: '4px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '92px', height: '34px', borderRadius: '10px' }}></div>
      </div>
    </div>
  </div>
);

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'items', 'name'
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const hubType = localStorage.getItem('universe_location_type') || 'College';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStoresAndLocation = async () => {
      try {
        const baseUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
          ? window.location.origin
          : (import.meta.env.VITE_API_URL || 'http://localhost:5000');
        const locationId = localStorage.getItem('universe_location_id');
        const [storesRes, locsRes] = await Promise.all([
          axios.get(`${baseUrl}/api/store/all/list`, { params: { locationId } }),
          axios.get(`${baseUrl}/api/super-admin/locations/public`)
        ]);
        setStores(storesRes.data);
        const loc = locsRes.data.find(l => (l._id || l.id) === locationId);
        if (loc) {
          setCurrentLocation(loc);
        } else if (locsRes.data.length > 0) {
          setCurrentLocation(locsRes.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch stores or location info', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStoresAndLocation();
  }, []);

  const { socket, connected } = useSocket();
  useEffect(() => {
    if (socket && connected) {
      const handleStoreStatus = ({ storeId, isOpen }) => {
        setStores(prev => prev.map(s => (s._id === storeId || s.id === storeId) ? { ...s, isOpen } : s));
      };
      socket.on('store_status_update', handleStoreStatus);
      return () => socket.off('store_status_update', handleStoreStatus);
    }
  }, [socket, connected]);

  // Dynamic markets for the active location: Configured markets + distinct live store markets
  const availableMarkets = useMemo(() => {
    if (hubType !== 'College') return [];
    
    let configured = [];
    if (currentLocation?.markets && currentLocation.markets.trim()) {
      configured = currentLocation.markets.split(',').map(m => m.trim()).filter(Boolean);
    } else if (currentLocation?.name?.toLowerCase().includes('lpu') || currentLocation?.name?.toLowerCase().includes('lovely')) {
      configured = ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market'];
    }

    const liveStoreMarkets = stores.map(s => s.market).filter(Boolean);
    return Array.from(new Set([...configured, ...liveStoreMarkets]));
  }, [currentLocation, stores, hubType]);

  const marketCounts = useMemo(() => {
    const counts = { All: stores.length };
    stores.forEach(s => {
      const m = s.market || 'General Campus';
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [stores]);

  const openStoresCount = useMemo(() => {
    return stores.filter(s => s.isOpen !== false).length;
  }, [stores]);

  const categories = ['All', 'Snacks', 'Meals', 'Beverages', 'Desserts', 'Other'];

  const filteredStores = stores
    .filter(store => {
      // Hub type filtering
      if (hubType === 'College') {
        if (selectedMarket !== 'All' && (store.market || 'BH1 Market') !== selectedMarket) return false;
      } else {
        if (selectedCategory !== 'All') {
          const cat = (store.category || '').toLowerCase();
          const sel = selectedCategory.toLowerCase();
          // Relaxed matching to ensure categories like 'Desserts' match 'Dessert'
          if (!cat.includes(sel) && !sel.includes(cat)) return false;
        }
      }
      
      // Local search filtering
      if (localSearchQuery.trim() !== '') {
        const query = localSearchQuery.toLowerCase();
        const nameMatch = store.name.toLowerCase().includes(query);
        const catMatch = (store.category || '').toLowerCase().includes(query);
        if (!nameMatch && !catMatch) return false;
      }

      // Filter by open status
      if (filterOpen && store.isOpen === false) return false;

      // Filter by store type
      if (filterType !== 'All' && store.storeType !== filterType) return false;

      return true;
    })
    .sort((a, b) => {
      // Primary Sort based on selection
      if (sortBy === 'rating') {
        // 1. Primary: Number of Completed Orders (More completed first)
        const aOrders = a.completedOrdersCount || 0;
        const bOrders = b.completedOrdersCount || 0;
        if (bOrders !== aOrders) return bOrders - aOrders;

        // 2. Secondary: Number of Cancelled Orders (Fewer cancelled first)
        const aCancelled = a.cancelledOrdersCount || 0;
        const bCancelled = b.cancelledOrdersCount || 0;
        if (aCancelled !== bCancelled) return aCancelled - bCancelled;

        // 3. Tertiary: Rating
        const aRating = a.rating || 5.0;
        const bRating = b.rating || 5.0;
        if (bRating !== aRating) return bRating - aRating;
      } else if (sortBy === 'items') {
        const aItems = a.products?.length || 0;
        const bItems = b.products?.length || 0;
        if (bItems !== aItems) return bItems - aItems;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      
      // Secondary sort by Open status
      const aOpen = a.isOpen !== false;
      const bOpen = b.isOpen !== false;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;

      return 0;
    });

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingBackground />
      
      {/* Premium Hero Carousel Skeleton */}
      <div style={{ padding: '2rem 2rem 0 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="hero-carousel-container" style={{ borderRadius: '32px', position: 'relative', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0B1120 0%, #1E293B 100%)' }}>
          <div className="hero-slide-content" style={{ zIndex: 2, width: '100%', maxWidth: '640px' }}>
            <div className="skeleton" style={{ width: '150px', height: '26px', borderRadius: '100px', marginBottom: '1.25rem', background: 'rgba(255, 255, 255, 0.12)' }}></div>
            <div className="skeleton" style={{ width: '85%', height: '3.25rem', borderRadius: '14px', marginBottom: '1rem', background: 'rgba(255, 255, 255, 0.16)' }}></div>
            <div className="skeleton" style={{ width: '60%', height: '1.25rem', borderRadius: '8px', marginBottom: '2rem', background: 'rgba(255, 255, 255, 0.10)' }}></div>
            <div className="skeleton" style={{ width: '160px', height: '48px', borderRadius: '12px', background: 'rgba(239, 65, 35, 0.35)' }}></div>
          </div>
          <div className="hero-carousel-controls" style={{ position: 'absolute', bottom: '25px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
            <div className="skeleton" style={{ width: '24px', height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.6)' }}></div>
            <div className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
            <div className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        {hubType === 'College' ? (
          <>
            {/* Dynamic Trending Row Skeleton */}
            <div className="trending-section" style={{ marginBottom: '2.5rem' }}>
              <div className="trending-header" style={{ marginBottom: '1.25rem' }}>
                <div className="skeleton" style={{ width: '220px', height: '1.75rem', borderRadius: '8px', marginBottom: '0.4rem' }}></div>
                <div className="skeleton" style={{ width: '280px', height: '0.9rem', borderRadius: '6px' }}></div>
              </div>
              <div className="trending-carousel-wrapper">
                <div className="trending-carousel">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="trending-card" style={{ pointerEvents: 'none' }}>
                      <div className="trending-img-wrapper skeleton"></div>
                      <div className="trending-info" style={{ padding: '0.75rem' }}>
                        <div className="skeleton" style={{ height: '1rem', width: '80%', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                        <div className="skeleton" style={{ height: '0.75rem', width: '55%', marginBottom: '0.85rem', borderRadius: '4px' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="skeleton" style={{ height: '1.1rem', width: '40px', borderRadius: '4px' }}></div>
                          <div className="skeleton" style={{ height: '1.75rem', width: '58px', borderRadius: '8px' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campus Market Navigation Filters Skeleton */}
            <div className="market-filter-wrapper" style={{ marginBottom: '2.5rem' }}>
              <div className="market-filter-scroll">
                {['All Areas', 'BH1', 'Block34', 'LIT', 'Mall', 'BH6', 'Apartment'].map((name, i) => (
                  <div 
                    key={i} 
                    className="skeleton" 
                    style={{ 
                      height: '42px', 
                      width: i === 0 ? '96px' : '78px', 
                      borderRadius: '999px', 
                      flexShrink: 0 
                    }} 
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Category Grid Bento Cards Skeleton */}
            <div className="category-grid-premium" style={{ marginBottom: '2.5rem' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="premium-bento-cat skeleton" style={{ minHeight: '110px', borderRadius: '20px' }}></div>
              ))}
            </div>

            {/* Dynamic Trending Row Skeleton */}
            <div className="trending-section" style={{ marginBottom: '2.5rem' }}>
              <div className="trending-header" style={{ marginBottom: '1.25rem' }}>
                <div className="skeleton" style={{ width: '220px', height: '1.75rem', borderRadius: '8px', marginBottom: '0.4rem' }}></div>
                <div className="skeleton" style={{ width: '280px', height: '0.9rem', borderRadius: '6px' }}></div>
              </div>
              <div className="trending-carousel-wrapper">
                <div className="trending-carousel">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="trending-card" style={{ pointerEvents: 'none' }}>
                      <div className="trending-img-wrapper skeleton"></div>
                      <div className="trending-info" style={{ padding: '0.75rem' }}>
                        <div className="skeleton" style={{ height: '1rem', width: '80%', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                        <div className="skeleton" style={{ height: '0.75rem', width: '55%', marginBottom: '0.85rem', borderRadius: '4px' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="skeleton" style={{ height: '1.1rem', width: '40px', borderRadius: '4px' }}></div>
                          <div className="skeleton" style={{ height: '1.75rem', width: '58px', borderRadius: '8px' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Section Heading Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
          <div>
            <div className="skeleton" style={{ width: '190px', height: '1.85rem', borderRadius: '8px', marginBottom: '0.4rem' }}></div>
            <div className="skeleton" style={{ width: '270px', height: '0.9rem', borderRadius: '6px' }}></div>
          </div>
        </div>

        {/* Campus Stalls Grid Skeleton */}
        <div className="campus-stalls-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <CampusStallCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );



  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingBackground />

      {/* Full-Bleed Edge-to-Edge Hero Carousel */}
      <div style={{ width: '100%', margin: 0, padding: 0 }}>
        <HeroCarousel hubType={hubType} onSearch={(q) => { 
          setLocalSearchQuery(q); 
          window.scrollTo({ top: 600, behavior: 'smooth' }); 
        }} />
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        
        {/* Navigation & Cravings Flow */}
        {hubType === 'College' ? (
          <>
            {/* Dynamic Trending Row */}
            <TrendingRow />

            {/* Campus Market Navigation Filters (Only rendered if campus has configured zones or multiple stalls) */}
            {availableMarkets.length > 0 && (
              <div className="market-filter-wrapper animate-fade-in-up">
                <div className="market-filter-scroll">
                  {['All', ...availableMarkets].map(market => {
                    const isActive = selectedMarket === market;
                    return (
                      <button
                        key={market}
                        onClick={() => setSelectedMarket(market)}
                        className={`market-filter-pill ${isActive ? 'active' : ''}`}
                      >
                        {isActive && <span className="market-pill-dot" />}
                        <span className="market-pill-label">
                          {market === 'All' ? 'All Areas' : market.replace(' Market', '')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* External Hub: Category Cravings Bento Grid First */}
            <div className="category-grid-premium animate-fade-in-up" style={{ marginBottom: '2.5rem' }}>
              {[
                { id: 'All', name: 'All Cravings', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
                { id: 'Biryani', name: 'Biryani & Rice', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80' },
                { id: 'Pizza', name: 'Hand-tossed Pizzas', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80' },
                { id: 'Burger', name: 'Juicy Burgers', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80' },
                { id: 'Chinese', name: 'Asian Wok', img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80' },
                { id: 'Dessert', name: 'Sweet Delights', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80' },
                { id: 'Healthy', name: 'Healthy Eats', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80' },
                { id: 'Beverages', name: 'Cold Sips', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80' }
              ].map(cat => (
                <div 
                  key={cat.id} 
                  className={`premium-bento-cat ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <img src={cat.img} alt={cat.name} className="bento-cat-bg" loading="lazy" />
                  <div className="bento-cat-overlay"></div>
                  <div className="bento-cat-content">
                    {selectedCategory === cat.id && <div className="live-pulse-dot" style={{ position: 'absolute', top: '12px', right: '12px' }}></div>}
                    <span className="bento-cat-text">{cat.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Trending Row for External Hubs (Below Category Cards) */}
            <TrendingRow />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {hubType === 'College' 
                ? (selectedMarket === 'All' ? 'Campus Stalls' : `${selectedMarket.replace(' Market', '')} Stalls`)
                : (selectedCategory === 'All' ? 'Featured Places' : `Best in ${selectedCategory}`)
              }
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.875rem' }}>
              {hubType === 'College' ? 'Discover unique tastes across the campus' : 'The finest ordering experience for the best locations'}
            </p>
          </div>
        </div>

        {stores.length === 0 ? (
          <div className="glass-card animate-fade-in-up" style={{ padding: '4.5rem 2rem', textAlign: 'center', borderRadius: '32px', margin: '2rem 0' }}>
             <Store size={54} color="var(--primary)" style={{ opacity: 0.35, margin: '0 auto 1.25rem' }} />
             <h3 style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
               No Stalls Live at {currentLocation?.name || 'this Campus'} Yet
             </h3>
             <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.75rem auto', fontSize: '0.95rem', lineHeight: '1.5' }}>
               We are expanding rapidly! If you operate a campus stall, tuck shop, or food joint here, you can launch your digital storefront in minutes.
             </p>
             <button 
               onClick={() => navigate('/vendor/register')} 
               style={{ 
                 padding: '0.9rem 2rem', 
                 background: 'linear-gradient(135deg, #ef4123 0%, #ff5722 100%)', 
                 color: 'white', 
                 border: 'none', 
                 borderRadius: '16px', 
                 fontWeight: '800', 
                 fontSize: '1rem',
                 cursor: 'pointer', 
                 display: 'inline-flex', 
                 alignItems: 'center', 
                 gap: '0.6rem',
                 boxShadow: '0 10px 25px rgba(239, 65, 35, 0.3)'
               }}
             >
               Launch Your Stall Here <ArrowRight size={18} />
             </button>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="glass-card animate-fade-in-up" style={{ padding: '5rem 2rem', textAlign: 'center', borderRadius: '32px' }}>
             <Store size={48} color="var(--text-secondary)" style={{ opacity: 0.2, marginBottom: '1.25rem' }} />
             <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '600' }}>No stalls found matching your filter.</p>
             <button onClick={() => { setSelectedMarket('All'); setFilterOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '700', marginTop: '0.75rem', cursor: 'pointer' }}>Clear all filters</button>
          </div>
        ) : (
          <div className="campus-stalls-grid">
            {filteredStores.map((store, idx) => {
              const isOpen = store.isOpen !== false;
              return (
                <Link 
                  key={store._id || store.id || idx} 
                  to={`/store/${store._id || store.id}`}
                  className="animate-fade-in-up"
                  style={{ textDecoration: 'none', color: 'inherit', animationDelay: `${idx * 0.04}s` }}
                >
                  <div className={`campus-stall-card ${!isOpen ? 'is-closed' : ''}`}>
                    {/* Visual Media Wrapper */}
                    <div className="campus-stall-media">
                      <img 
                        src={getImageUrl(store.image)}
                        alt={store.name}
                        className="campus-stall-img"
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60'; }}
                      />
                      <div className="campus-stall-img-scrim" />

                      {/* Top Overlay Badges */}
                      <div className="campus-stall-top-bar">
                        <div className="campus-stall-rating-badge">
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />
                          <span>{store.rating || '4.5'}</span>
                        </div>

                        {isOpen ? (
                          <div className="campus-stall-status-badge live">
                            <span className="live-pulse-beacon" /> OPEN NOW
                          </div>
                        ) : (
                          <div className="campus-stall-status-badge closed">
                            <Lock size={10} style={{ marginRight: '2px' }} /> CLOSED
                          </div>
                        )}
                      </div>

                      {/* Bottom Market Pill Over Photo */}
                      <div className="campus-stall-market-chip">
                        <MapPin size={10} />
                        <span>{store.market || 'Campus'}</span>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="campus-stall-details">
                      <div className="campus-stall-title-row">
                        <h3 className="campus-stall-name">{store.name}</h3>
                        <CheckCircle2 size={16} color="var(--primary)" className="stall-verified-icon" />
                      </div>

                      <p className="campus-stall-cuisine">
                        {store.category || 'Specialty Campus Kitchen'}
                      </p>

                      {/* Footer Row */}
                      <div className="campus-stall-footer-row">
                        <div className="campus-stall-meta-stats">
                          <span className="meta-stat-pill">
                            <ShoppingBag size={13} color={isOpen ? "var(--primary)" : "#94a3b8"} />
                            <strong>{store.products?.length || 0}</strong> items
                          </span>
                          <span className="meta-stat-divider">•</span>
                          <span className="meta-stat-pill">
                            <Clock size={13} color={isOpen ? "var(--text-secondary)" : "#94a3b8"} />
                            {isOpen ? '15m prep' : 'Offline'}
                          </span>
                        </div>

                        {isOpen ? (
                          <div className="campus-stall-cta live-cta">
                            <span>Order Now</span>
                            <ChevronRight size={14} />
                          </div>
                        ) : (
                          <div className="campus-stall-cta closed-cta">
                            <span>View Menu</span>
                            <ChevronRight size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;


