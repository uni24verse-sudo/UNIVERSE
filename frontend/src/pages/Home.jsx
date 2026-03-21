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
  Star
} from 'lucide-react';

const Home = () => {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
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
      (selectedCategory === 'All' || store.category === selectedCategory) &&
      store.name.toLowerCase().includes(search.toLowerCase())
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '6rem 2rem 4rem 2rem', 
        textAlign: 'center', 
        background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          padding: '0.5rem 1.25rem', 
          borderRadius: '99px', 
          background: 'rgba(99, 102, 241, 0.1)', 
          color: 'var(--primary)',
          fontSize: '0.875rem',
          fontWeight: '700',
          marginBottom: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <ChefHat size={16} /> Campus Favorites Delivered
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '1.5rem', lineHeight: '1.1' }}>
          Your Campus, <span style={{ color: 'var(--primary)' }}>Digitized.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3.5rem auto', lineHeight: '1.6' }}>
          Browse fresh menus, skip the queue, and pay seamlessly. The smarter way to support your local stalls.
        </p>

        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
          <div className="glass-card" style={{ padding: '0.5rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '0 1rem' }}><Search size={24} color="var(--primary)" /></div>
            <input 
              type="text" 
              placeholder="Search for stalls..." 
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '1rem 0', fontSize: '1.1rem', outline: 'none' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" style={{ width: 'auto', borderRadius: '18px', padding: '0.8rem 2rem' }}>Explore</button>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 6rem 2rem' }}>
        {/* Category Navigation */}
        {/* <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0', marginBottom: '3.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}> */}
           {/* {categories.map(cat => ( */}
             {/* <button  */}
              {/* key={cat} */}
              {/* onClick={() => setSelectedCategory(cat)} */}
              {/* style={{  */}
                {/* padding: '0.75rem 1.75rem',  */}
                {/* borderRadius: '100px',  */}
                {/* background: selectedCategory === cat ? 'var(--primary)' : 'var(--glass-bg)',  */}
                {/* color: selectedCategory === cat ? 'white' : 'var(--text-secondary)', */}
                {/* border: `1px solid ${selectedCategory === cat ? 'var(--primary)' : 'var(--surface-border)'}`, */}
                {/* cursor: 'pointer', */}
                {/* whiteSpace: 'nowrap', */}
                {/* fontWeight: '700', */}
                {/* fontSize: '0.9rem', */}
                {/* transition: 'var(--transition)', */}
                {/* boxShadow: selectedCategory === cat ? '0 10px 20px rgba(99, 102, 241, 0.2)' : 'none' */}
              {/* }} */}
             {/* > */}
               {/* {cat} */}
             {/* </button> */}
           {/* ))} */}
        {/* </div> */}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>
              {selectedCategory === 'All' ? 'Available Stalls' : `${selectedCategory}`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Discover unique tastes across the campus</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>
            <MapPin size={16} color="var(--primary)" /> Campus Common
          </div>
        </div>

        {filteredStores.length === 0 ? (
          <div className="glass-card" style={{ padding: '6rem 2rem', textAlign: 'center', borderRadius: '40px', background: 'rgba(255,255,255,0.01)' }}>
             <Search size={48} color="var(--text-secondary)" style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>No stalls found matching your criteria.</p>
             <button onClick={() => { setSearch(''); setSelectedCategory('All'); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '700', marginTop: '1rem', cursor: 'pointer' }}>Clear all filters</button>
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
                  <div className="glass-card store-card" style={{ transition: 'var(--transition)', overflow: 'hidden', padding: '1.5rem', borderRadius: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', height: '200px', borderRadius: '24px', overflow: 'hidden', marginBottom: '1.5rem', background: 'rgba(15,23,42,0.8)' }}>
                      <img 
                        src={getImageUrl(store.image)}
                        alt={store.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isOpen ? 0.8 : 0.3 }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60'; }}
                      />
                      {!isOpen && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                          <span style={{ background: 'var(--error)', color: 'white', padding: '0.6rem 2rem', borderRadius: '100px', fontWeight: '900', letterSpacing: '0.1em', fontSize: '0.75rem' }}>CLOSED</span>
                        </div>
                      )}
                      
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '0.5rem 0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <Star size={14} color="#fbbf24" fill="#fbbf24" />
                         <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white' }}>4.8</span>
                      </div>

                      {store.category && (
                        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                          <Tag size={14} color="white" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white' }}>{store.category}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>{store.name}</h3>
                        {isOpen && <CheckCircle2 size={18} color="var(--secondary)" />}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                         By {store.admin?.name || 'Academic Plaza'}
                      </p>
                      
                      <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShoppingBag size={14} /> {store.products?.length || 0} Items</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> 15m</span>
                         </div>
                         <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <ChevronRight size={18} />
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

