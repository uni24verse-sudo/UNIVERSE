import React, { useEffect, useState } from 'react';
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
  Zap
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

const StoreCardSkeleton = () => (
  <div className="glass-card store-card">
    <div className="store-img-wrapper skeleton skeleton-img"></div>
    <div className="store-info-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton skeleton-text" style={{ width: '80%', height: '1.25rem' }}></div>
      </div>
      <div className="skeleton skeleton-text store-category-text" style={{ width: '40%', height: '0.75rem' }}></div>
      <div className="store-footer-row" style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="skeleton skeleton-text" style={{ width: '40px', height: '0.75rem' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '40px', height: '0.75rem' }}></div>
        </div>
        <div className="skeleton btn-circle" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
      </div>
    </div>
  </div>
);

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'items', 'name'
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const hubType = localStorage.getItem('universe_location_type') || 'College';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const locationId = localStorage.getItem('universe_location_id');
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/all/list`;
        const res = await axios.get(url, { params: { locationId } });
        setStores(res.data);
      } catch (err) {
        console.error('Failed to fetch stores');
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  const { socket, connected } = useSocket();
  useEffect(() => {
    if (socket && connected) {
      const handleStoreStatus = ({ storeId, isOpen }) => {
        setStores(prev => prev.map(s => s._id === storeId ? { ...s, isOpen } : s));
      };
      socket.on('store_status_update', handleStoreStatus);
      return () => socket.off('store_status_update', handleStoreStatus);
    }
  }, [socket, connected]);

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
    if (!img) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingBackground />
      
      <section className="hero-section">
        <div className="hero-badge skeleton" style={{ width: '180px', height: '28px', margin: '0 auto 2rem auto', borderRadius: '99px' }}></div>
        <div className="skeleton skeleton-title" style={{ width: '70%', height: '4rem', margin: '0 auto 1.5rem auto' }}></div>
        <div className="hero-tip-card skeleton" style={{ width: '100%', maxWidth: '540px', height: '80px', margin: '2.5rem auto', borderRadius: '28px' }}></div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        <div className="market-btn-container" style={{ opacity: 0.5 }}>
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '20px' }}></div>
           ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <div className="skeleton skeleton-text" style={{ width: '200px', height: '2rem', marginBottom: '0.5rem' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '300px', height: '1rem' }}></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );



  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingBackground />

      {/* Premium Hero Carousel */}
      <div style={{ padding: '2rem 2rem 0 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <HeroCarousel hubType={hubType} onSearch={(q) => { 
          setLocalSearchQuery(q); 
          window.scrollTo({ top: 600, behavior: 'smooth' }); 
        }} />
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        
        {/* Dynamic Trending Row */}
        <TrendingRow />

        {/* Navigation Filters */}
        {hubType === 'College' ? (
          <div className="market-btn-container animate-fade-in-up">
            {['All', 'BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market'].map(market => (
              <button
                key={market}
                onClick={() => setSelectedMarket(market)}
                className={`market-btn ${selectedMarket === market ? 'active' : ''}`}
              >
                {market === 'All' ? 'All Areas' : market.replace(' Market', '')}
              </button>
            ))}
          </div>
        ) : (
          <div className="category-grid-premium animate-fade-in-up">
            {[
              { id: 'All', name: 'All Cravings', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80' },
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
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
              {hubType === 'College' 
                ? (selectedMarket === 'All' ? 'Campus Stalls' : `${selectedMarket} Stalls`)
                : (selectedCategory === 'All' ? 'Featured Places' : `Best in ${selectedCategory}`)
              }
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.875rem' }}>
              {hubType === 'College' ? 'Discover unique tastes across the campus' : 'The finest ordering experience for the best locations'}
            </p>
          </div>
        </div>

        {filteredStores.length === 0 ? (
          <div className="glass-card animate-fade-in-up" style={{ padding: '6rem 2rem', textAlign: 'center', borderRadius: '40px' }}>
             <Store size={48} color="var(--text-secondary)" style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
             <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' }}>No stalls found matching your criteria.</p>
             <button onClick={() => { setSelectedMarket('All'); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '700', marginTop: '1rem', cursor: 'pointer' }}>Clear all filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {filteredStores.map((store, idx) => {
              const isOpen = store.isOpen !== false;
              return (
                <Link 
                  key={store._id} 
                  to={`/store/${store._id}`}
                  className="animate-fade-in-up"
                  style={{ textDecoration: 'none', color: 'inherit', animationDelay: `${idx * 0.05}s` }}
                >
                    <div className="glass-card store-card">
                      <div className="store-img-wrapper">
                        <img 
                          src={getImageUrl(store.image)}
                          alt={store.name}
                          className="store-img"
                          style={{ opacity: isOpen ? 1 : 0.6 }}
                          loading="lazy"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60'; }}
                        />
                        {!isOpen && (
                          <div className="store-closed-overlay">
                            <span className="store-closed-text">CLOSED</span>
                          </div>
                        )}
                      
                        <div className="store-rating-badge">
                           <Star size={12} color="#f59e0b" fill="#f59e0b" />
                           <span>{store.rating || '5.0'}</span>
                        </div>
                        
                        <div className="store-market-badge">
                          <MapPin size={10} color="var(--primary)" />
                          <span>{store.market || 'Campus'}</span>
                        </div>
                    </div>

                    <div className="store-info-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{store.name}</h3>
                        <div className="store-desktop-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div className={`status-dot ${isOpen ? 'live' : 'offline'}`}></div>
                          <span style={{ fontSize: '0.625rem', fontWeight: '800', letterSpacing: '0.05em', color: isOpen ? '#10b981' : '#ef4444', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {isOpen ? 'Live' : 'Closed'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="store-mobile-meta">
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <span className="rating-text">{store.rating || '5.0'}</span>
                        <MapPin size={10} color="var(--primary)" />
                        <span className="market-text">{store.market || 'Campus'}</span>
                      </div>

                      <p className="store-category-text" style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        {store.category || 'General'}
                      </p>
                      
                       <div className="store-footer-row" style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600' }}>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShoppingBag size={14} /> {store.products?.length || 0}</span>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> 15m</span>
                            </div>
                            <div className="btn-circle" style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <ChevronRight size={14} />
                            </div>
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

