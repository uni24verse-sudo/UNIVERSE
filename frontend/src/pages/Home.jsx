import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
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
  <div className="glass-card store-card" style={{ height: '100%', minHeight: '380px' }}>
    <div className="store-img-wrapper skeleton skeleton-img" style={{ height: '200px', marginBottom: '1.25rem' }}></div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton skeleton-text" style={{ width: '60%', height: '1.25rem' }}></div>
        <div className="skeleton skeleton-circle" style={{ width: '16px', height: '16px' }}></div>
      </div>
      <div className="skeleton skeleton-text" style={{ width: '30%', height: '0.75rem' }}></div>
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="skeleton skeleton-text" style={{ width: '40px', height: '0.75rem' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '40px', height: '0.75rem' }}></div>
        </div>
        <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
      </div>
    </div>
  </div>
);

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
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

  const categories = ['All', 'Snacks', 'Meals', 'Beverages', 'Desserts', 'Other'];

  const filteredStores = stores
    .filter(store => {
      if (hubType === 'College') {
        return selectedMarket === 'All' || (store.market || 'BH1 Market') === selectedMarket;
      } else {
        return selectedCategory === 'All' || store.category === selectedCategory;
      }
    })
    .sort((a, b) => {
      const aOpen = a.isOpen !== false;
      const bOpen = b.isOpen !== false;
      if (aOpen === bOpen) return 0;
      return aOpen ? -1 : 1;
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

  const vendorStr = localStorage.getItem('vendor');
  let isSuperAdmin = false;
  try {
    isSuperAdmin = vendorStr && JSON.parse(vendorStr).role === 'superadmin';
  } catch(e) {}

  if (hubType === 'External' && !isSuperAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', position: 'relative', overflow: 'hidden' }}>
        <FloatingBackground />
        <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem 2rem', zIndex: 2 }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(239, 65, 35, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--error)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: '800' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            The external hub feature is currently undergoing maintenance. Only authorized administrators can access this view.
          </p>
          <button 
            onClick={() => { localStorage.removeItem('universe_location_id'); window.location.reload(); }}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Return to Campus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingBackground />

      {/* Hero Section */}
      <section className="hero-section animate-fade-in-up">
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(252, 175, 23, 0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        
        <div className="hero-badge pulse">
          <ChefHat size={14} /> Campus Favorites Delivered
        </div>

        <h1 className="hero-title">
          {hubType === 'College' ? (
            <>Your Campus, <span style={{ color: 'var(--primary)' }}>Digitized.</span></>
          ) : (
            <>Premium Dining, <span style={{ color: 'var(--primary)' }}>Delivered.</span></>
          )}
        </h1>
        
        {hubType === 'College' && (
          <div className="hero-tip-card">
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, var(--primary), var(--secondary))' }}></div>
            
            <div style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '14px', 
              background: 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Sparkles size={20} color="var(--primary)" />
            </div>

            <div style={{ flex: 1 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: '900', letterSpacing: '0.05em', color: 'var(--primary)', textTransform: 'uppercase', background: 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.08)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Expert Tip</span>
               </div>
               <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '700', margin: 0, lineHeight: '1.4' }}>
                  Order <span style={{ color: 'var(--primary)' }}>15 mins</span> ahead to skip the rush and eat fresh!
               </p>
            </div>
          </div>
        )}
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
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
              { id: 'All', name: 'All Shops', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Fork%20and%20Knife%20with%20Plate.png' },
              { id: 'Biryani', name: 'Biryani & Rice', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Curry%20Rice.png' },
              { id: 'Pizza', name: 'Pizzas', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Pizza.png' },
              { id: 'Burger', name: 'Burgers', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hamburger.png' },
              { id: 'Chinese', name: 'Chinese', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Bento%20Box.png' },
              { id: 'Desserts', name: 'Sweet Delights', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Shortcake.png' },
              { id: 'Healthy', name: 'Healthy Eats', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Green%20Salad.png' },
              { id: 'Beverages', name: 'Cold Sips', img: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Bubble%20Tea.png' }
            ].map(cat => (
              <div 
                key={cat.id} 
                className={`category-tile-premium ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <div className="tile-image-wrapper">
                  <img src={cat.img} alt={cat.name} className="tile-img-active" />
                  {selectedCategory === cat.id && <div className="live-pulse-dot"></div>}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
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
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}>
                            <span style={{ background: '#334155', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '100px', fontWeight: '800', fontSize: '0.625rem', letterSpacing: '0.1em' }}>CLOSED</span>
                          </div>
                        )}
                      
                        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '0.35rem 0.6rem', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                           <Star size={12} color="#f59e0b" fill="#f59e0b" />
                           <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>4.8</span>
                        </div>
                        
                        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', padding: '0.35rem 0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <MapPin size={10} color="var(--primary)" />
                          <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: 'var(--text-primary)' }}>{store.market || 'Campus'}</span>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{store.name}</h3>
                        {isOpen && <CheckCircle2 size={16} color="var(--secondary)" />}
                      </div>
                      
                      <p style={{ fontSize: '0.6875rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
                        {store.category || 'General'}
                      </p>
                      
                       <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Vendor CTA Section */}
      <section style={{ padding: '4rem 2rem 8rem 2rem', textAlign: 'center' }}>
        <div className="glass-card animate-fade-in-up" style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '4rem 2rem', 
          borderRadius: '48px', 
          background: 'linear-gradient(135deg, hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.05) 0%, rgba(255, 255, 255, 0.4) 100%)',
          border: '1px solid var(--surface-border)'
        }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 20px 40px var(--primary-shadow)' }}>
            <User size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Are you a stall owner?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem auto', fontWeight: '500', lineHeight: '1.6' }}>
            Transform your stall into a digital hub. Manage orders, accept digital payments, and grow your campus reach.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/vendor/login')}
            style={{ width: 'auto', padding: '1.25rem 3rem', borderRadius: '100px', fontSize: '1rem', fontWeight: '800' }}
          >
            Access Vendor Portal
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;

