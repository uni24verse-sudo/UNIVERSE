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

const TopPromoBanner = () => {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #ef4123 0%, #fcaf17 50%, #ef4123 100%)',
      backgroundSize: '200% auto',
      animation: 'gradientMove 3s linear infinite',
      padding: '0.75rem 1rem',
      textAlign: 'center',
      color: 'white',
      fontWeight: '800',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      boxShadow: '0 4px 15px rgba(239, 65, 35, 0.3)',
      position: 'relative',
      zIndex: 100,
      letterSpacing: '0.5px'
    }}>
      <Sparkles size={16} className="pulse" />
      <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
        ORDER 15 MIN EARLY. EAT FRESH.
      </span>
      <Zap size={16} className="pulse" />
      
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .pulse {
          animation: icon-pulse 2s infinite;
        }
        @keyframes icon-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const Home = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/all/list');
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
    .filter(store => 
      (selectedMarket === 'All' || (store.market || 'BH1 Market') === selectedMarket)
    )
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
    <div className="auth-wrapper">
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem' }}>Bringing you the best of your campus...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <TopPromoBanner />
      <FloatingBackground />

      {/* Hero Section */}
      <section className="hero-section" style={{ 
        padding: '6rem 2rem 4rem 2rem', 
        textAlign: 'center', 
        background: 'linear-gradient(180deg, rgba(239, 65, 35, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(239, 65, 35, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(252, 175, 23, 0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        
        <div className="hero-badge" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          padding: '0.5rem 1.25rem', 
          borderRadius: '99px', 
          background: 'rgba(239, 65, 35, 0.08)', 
          color: 'var(--primary)',
          fontSize: '0.875rem',
          fontWeight: '700',
          marginBottom: '2rem',
          border: '1px solid rgba(239, 65, 35, 0.2)'
        }}>
          <ChefHat size={16} /> Campus Favorites Delivered
        </div>

        <h1 className="hero-title" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '1.5rem', lineHeight: '1.1' }}>
          Your Campus, <span style={{ color: 'var(--primary)' }}>Digitized.</span>
        </h1>
        <div style={{ 
          maxWidth: '540px', 
          margin: '2.5rem auto', 
          padding: '1.25rem 1.5rem', 
          background: 'rgba(255, 255, 255, 0.4)', 
          backdropFilter: 'blur(20px)', 
          borderRadius: '28px', 
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
          animation: 'float 6s ease-in-out infinite, slideUp 0.8s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Accent decoration */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, var(--primary), var(--secondary))' }}></div>
          
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.1) 0%, rgba(252, 175, 23, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(239, 65, 35, 0.2)'
          }}>
            <Sparkles size={24} color="var(--primary)" />
          </div>

          <div style={{ flex: 1 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em', color: 'var(--primary)', textTransform: 'uppercase', background: 'rgba(239, 65, 35, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>Quick Tip</span>
             </div>
             <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600', margin: 0, lineHeight: '1.4' }}>
                Order <span style={{ color: 'var(--primary)' }}>15 mins</span> ahead to skip the rush and enjoy it piping hot!
             </p>
          </div>
        </div>
        {/* <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Browse fresh menus, skip the queue, and pay seamlessly. The smarter way to support your local stalls.
        </p> */}
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        {/* Market Navigation */}
        <div className="market-grid" style={{ marginBottom: '3.5rem' }}>
           {['All', 'BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market'].map(market => (
             <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className="market-btn"
              style={{
                width: '100%',
                padding: '1.25rem 0.5rem',
                borderRadius: '16px',
                background: selectedMarket === market ? 'rgba(239, 65, 35, 0.1)' : '#ffffff',
                color: selectedMarket === market ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${selectedMarket === market ? 'var(--primary)' : 'var(--surface-border)'}`,
                cursor: 'pointer',
                fontWeight: selectedMarket === market ? '700' : '600',
                fontSize: '0.9rem',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
                boxShadow: selectedMarket === market ? '0 4px 15px rgba(239, 65, 35, 0.2), inset 0 1px 5px rgba(239, 65, 35, 0.1)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (selectedMarket !== market) {
                   e.currentTarget.style.background = 'rgba(239, 65, 35, 0.05)';
                   e.currentTarget.style.color = 'var(--text-primary)';
                   e.currentTarget.style.borderColor = 'rgba(239, 65, 35, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMarket !== market) {
                   e.currentTarget.style.background = '#ffffff';
                   e.currentTarget.style.color = 'var(--text-secondary)';
                   e.currentTarget.style.borderColor = 'var(--surface-border)';
                }
              }}
             >
               {market === 'All' ? 'All Areas' : market.replace(' Market', '')}
             </button>
           ))}
        </div>

        <style>{`
          .market-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 1rem;
          }
          @media (max-width: 600px) {
            .market-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 0.75rem;
            }
            .market-btn {
              padding: 1rem 0 !important;
            }
            .hero-section {
              padding: 3rem 1rem 2rem 1rem !important;
            }
            .hero-badge {
              margin-bottom: 1rem !important;
            }
            .hero-title {
              margin-bottom: 1rem !important;
            }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>
              {selectedMarket === 'All' ? 'Campus Stalls' : `${selectedMarket} Stalls`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Discover unique tastes across the campus</p>
          </div>
        </div>

        {filteredStores.length === 0 ? (
          <div className="glass-card" style={{ padding: '6rem 2rem', textAlign: 'center', borderRadius: '40px', background: 'rgba(255,255,255,0.01)' }}>
             <Store size={48} color="var(--text-secondary)" style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>No stalls found matching your criteria.</p>
             <button onClick={() => { setSelectedMarket('All'); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '700', marginTop: '1rem', cursor: 'pointer' }}>Clear all filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
            {filteredStores.map(store => {
              const isOpen = store.isOpen !== false;
              return (
                <Link 
                  key={store._id} 
                  to={`/store/${store._id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    <div className="glass-card store-card" style={{ transition: 'var(--transition)', overflow: 'hidden', padding: '1.25rem', borderRadius: '24px', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                      <div style={{ position: 'relative', height: '200px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.25rem', background: '#f3f4f6' }}>
                        <img 
                          src={getImageUrl(store.image)}
                          alt={store.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isOpen ? 1 : 0.4 }}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60'; }}
                        />
                        {!isOpen && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                            <span style={{ background: 'var(--error)', color: 'white', padding: '0.6rem 2rem', borderRadius: '100px', fontWeight: '900', letterSpacing: '0.1em', fontSize: '0.75rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>CLOSED</span>
                          </div>
                        )}
                      
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.6rem', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                           <Star size={14} color="#f59e0b" fill="#f59e0b" />
                           <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>4.8</span>
                        </div>
                        
                        {/* Market Highlight Badge */}
                        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '0.4rem 0.8rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                          <MapPin size={12} color="var(--primary)" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>{store.market || 'Campus'}</span>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>{store.name}</h3>
                        {isOpen && <CheckCircle2 size={18} color="var(--secondary)" />}
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: '800', background: 'rgba(239, 65, 35, 0.08)', width: 'fit-content', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                           {store.category || 'General'}
                        </div>
                      </div>
                      
                       <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShoppingBag size={14} /> {store.products?.length || 0} Items</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> 15m</span>
                           </div>
                           <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 65, 35, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}>
                              <ChevronRight size={16} color="var(--text-primary)" />
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
        <div className="glass-card" style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '4rem 2rem', 
          borderRadius: '48px', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid var(--surface-border)'
        }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}>
            <User size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem' }}>Are you a stall owner?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem auto' }}>
            Transform your stall into a digital hub. Manage orders, accept digital payments, and grow your reach.
          </p>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/vendor/login')}
            style={{ width: 'auto', padding: '1rem 4rem', borderRadius: '20px', fontSize: '1.125rem', fontWeight: '800' }}
          >
            Access Vendor Portal
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;

