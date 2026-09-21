import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Rocket, Sparkles, Store, ArrowRight, ShieldCheck, Tag, MapPin, Building2, GraduationCap } from 'lucide-react';

const CreateStore = () => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(() => localStorage.getItem('universe_location_id') || '');
  const [market, setMarket] = useState('');
  const [customMarket, setCustomMarket] = useState('');
  const [isCustomMarket, setIsCustomMarket] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token, vendor } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/locations/public`)
      .then(res => {
        setLocations(res.data);
        if (!selectedLocationId && res.data.length > 0) {
          setSelectedLocationId(res.data[0]._id || res.data[0].id);
        }
      })
      .catch(err => console.error('Failed to fetch locations in CreateStore', err));
  }, []);

  const activeLocation = locations.find(l => (l._id || l.id) === selectedLocationId);
  const isExternalLocation = activeLocation?.type === 'External';

  // Available markets for chosen location
  const locationMarkets = React.useMemo(() => {
    if (!activeLocation) return [];
    if (activeLocation.markets && activeLocation.markets.trim()) {
      return activeLocation.markets.split(',').map(m => m.trim()).filter(Boolean);
    }
    if (activeLocation.name?.toLowerCase().includes('lpu') || activeLocation.name?.toLowerCase().includes('lovely')) {
      return ['BH1 Market', 'Block34 Market', 'LIT Market', 'Mall Market', 'BH6 Market', 'Apartment Market'];
    }
    return [];
  }, [activeLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const finalMarket = isCustomMarket ? customMarket.trim() : market.trim();
      const payload = { 
        name, 
        category, 
        market: finalMarket || (isExternalLocation ? '' : 'General Campus'), 
        upiId, 
        telegramChatId,
        locationId: selectedLocationId 
      };
      
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/vendor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create store');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="auth-container" style={{ maxWidth: '540px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)' }}>
            <Rocket color="white" size={40} />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Welcome, {vendor?.name}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Let's launch your digital storefront.</p>
        </div>
        
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px' }}>
          <form onSubmit={handleSubmit}>
            {/* Campus / Location Selection */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <MapPin size={18} color="var(--primary)" /> Campus / Location Hub
              </label>
              <select 
                className="form-input" 
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setMarket('');
                  setIsCustomMarket(false);
                }}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.05rem', appearance: 'none', background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0 1rem', fontWeight: '600' }}
                required
              >
                <option value="" disabled>Select your University or Area</option>
                {locations.map(loc => (
                  <option key={loc._id || loc.id} value={loc._id || loc.id}>
                    {loc.type === 'College' ? '🎓 ' : '📍 '}{loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <Store size={18} color="var(--primary)" /> Store Name
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. The Gourmet Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem' }}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <Tag size={18} color="var(--primary)" /> Store Category
              </label>
              <select 
                className="form-input" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem', appearance: 'none', background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0 1rem' }}
                required
              >
                <option value="" disabled>Select Category</option>
                {isExternalLocation ? (
                  <>
                    <option value="Biryani">Biryani & Rice</option>
                    <option value="Pizza">Pizzas</option>
                    <option value="Burger">Burgers</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Desserts">Sweet Delights</option>
                    <option value="Healthy">Healthy Eats</option>
                    <option value="Beverages">Cold Sips</option>
                    <option value="Snacks">Snacks & Fast Food</option>
                    <option value="Meals">Full Meals</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Snacks">Snacks & Fast Food</option>
                    <option value="Meals">Full Meals</option>
                    <option value="Beverages">Beverages & Drinks</option>
                    <option value="Desserts">Desserts & Sweets</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>

            {/* Optional Market Location Selection */}
            {!isExternalLocation && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: '700' }}>
                    <Store size={18} color="var(--primary)" /> Campus Market / Zone <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)' }}>(Optional)</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setIsCustomMarket(!isCustomMarket); setMarket(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {isCustomMarket ? 'Pick from List' : '+ Custom Zone'}
                  </button>
                </div>

                {isCustomMarket ? (
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Block D Food Court / Tuck Shop"
                    value={customMarket}
                    onChange={(e) => setCustomMarket(e.target.value)}
                    style={{ height: '58px', borderRadius: '16px', fontSize: '1.05rem' }}
                  />
                ) : (
                  <select 
                    className="form-input" 
                    value={market}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomMarket(true);
                      } else {
                        setMarket(e.target.value);
                      }
                    }}
                    style={{ height: '58px', borderRadius: '16px', fontSize: '1.05rem', appearance: 'none', background: '#ffffff', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0 1rem' }}
                  >
                    <option value="">General Campus (or assign later)</option>
                    {locationMarkets.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="__custom__">+ Enter Custom Zone / Building</option>
                  </select>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Can be selected now or assigned later from your dashboard.
                </p>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <ShieldCheck size={18} color="var(--primary)" /> UPI ID for Payouts
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. mobile@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem' }}
                required 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                • Required for your monthly revenue settlements.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700' }}>
                <ShieldCheck size={18} color="#0088cc" /> Telegram Chat ID (Optional)
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 1080395706"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                • For instant order alerts via your Telegram Bot.
              </p>
            </div>

            {error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '58px', borderRadius: '16px', fontSize: '1.125rem', fontWeight: '800', marginTop: '1rem' }}>
              {isLoading ? 'Launching...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>Create My Store <ArrowRight size={20} /></span>}
            </button>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
               <ShieldCheck size={16} color="var(--secondary)" /> Secure & Encrypted Registration
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => navigate('/vendor/login')}>
          Not your account? <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Switch User</span>
        </p>
      </div>
    </div>
  );
};

export default CreateStore;

