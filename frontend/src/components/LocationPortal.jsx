import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, GraduationCap, Building2, ChevronRight, Sparkles } from 'lucide-react';
import logoFull from '../assets/logo-full.png';
import './LocationPortal.css';

const LocationPortal = ({ onLocationSelect }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('College');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 1. Fetch all locations
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/super-admin/locations/public`);
        setLocations(res.data);
      } catch (err) {
        console.error('Failed to fetch locations', err);
        // Fallback or retry
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const filteredLocations = locations.filter(loc => 
    loc.type === activeType && 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !loc.isHidden
  );

  const handleSelect = (location) => {
    localStorage.setItem('universe_location_id', location._id);
    localStorage.setItem('universe_location_name', location.name);
    localStorage.setItem('universe_location_type', location.type);
    onLocationSelect(location);
  };

  return (
    <div className="location-portal-overlay">
      {/* 1. MESH BACKGROUND LAYER */}
      <div className="portal-bg-layer">
        <div className="portal-bg-blob blob-1"></div>
        <div className="portal-bg-blob blob-2"></div>
      </div>


      {/* 2. SELECTION SCREEN */}
      <div className="portal-selection-screen">
        <header className="portal-header">
          <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: 'rgba(239, 65, 35, 0.08)', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem', gap: '0.5rem', alignItems: 'center' }}>
            <Sparkles size={14} /> NEW HUB EXPERIENCE
          </div>
          <h2>Where are you?</h2>
          <p>Select your location to discover stores near you.</p>
        </header>

        <div className="location-type-toggle">
          <button 
            className={`type-btn ${activeType === 'College' ? 'active' : ''}`}
            onClick={() => { setActiveType('College'); setSearchQuery(''); }}
          >
            <GraduationCap size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Universities
          </button>
          <button 
            className={`type-btn ${activeType === 'External' ? 'active' : ''}`}
            onClick={() => { setActiveType('External'); setSearchQuery(''); }}
          >
            <Building2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> External Areas
          </button>
        </div>

        <div className="portal-search-wrapper">
          <Search className="portal-search-icon" size={18} />
          <input 
            type="text" 
            placeholder={`Search ${activeType === 'College' ? 'universities' : 'areas'}...`}
            className="portal-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="location-results">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="location-card skeleton" style={{ height: '80px', opacity: 0.5 }}></div>
            ))
          ) : (
            filteredLocations.map(loc => (
              <div 
                key={loc._id} 
                className="location-card"
                onClick={() => handleSelect(loc)}
              >
                <div className="location-icon">
                  {loc.type === 'College' ? <GraduationCap size={22} /> : <MapPin size={22} />}
                </div>
                <div className="location-info">
                  <h4>{loc.name}</h4>
                  <p>{loc.city || 'Available Hub'}</p>
                </div>
                <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: 0.3 }} />
              </div>
            ))
          )}

          {!loading && filteredLocations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>No locations found matching your search.</p>
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default LocationPortal;
