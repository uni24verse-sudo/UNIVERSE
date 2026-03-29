import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Phone, CheckCircle2, QrCode, RefreshCw, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const WhatsAppStatus = () => {
  const { vendor, token, updateVendor } = useContext(AuthContext);
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState(vendor?.whatsappNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/whatsapp/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.status);
      setQrCode(res.data.qrCode);
      if (res.data.status !== 'initializing') {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s for faster feedback
    return () => clearInterval(interval);
  }, []);

  const handleUpdateNumber = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await axios.put((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/update-profile', 
        { whatsappNumber },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      updateVendor(res.data.admin);
      alert('WhatsApp number updated successfully!');
    } catch (err) {
      alert('Failed to update number');
    } finally {
      setIsUpdating(false);
    }
  };

  const startWhatsApp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/whatsapp/re-initialize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(res.data.message);
      // Status will update via polling
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start browser');
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Phone size={20} color="var(--primary)" /> WhatsApp Alerts
        </h3>
        <div style={{ 
          padding: '0.3rem 0.8rem', 
          borderRadius: '99px', 
          fontSize: '0.7rem', 
          fontWeight: '800',
          background: status === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: status === 'connected' ? 'var(--secondary)' : '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          {status === 'initializing' && <Loader2 size={12} className="animate-spin" />}
          {status.toUpperCase().replace('_', ' ')}
        </div>
      </div>

      {status === 'connected' ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', padding: '1rem', borderRadius: '16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={24} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Smart Alerts Active</p>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Orders are automatically sent to your phone.</p>
            </div>
          </div>
        </div>
      ) : (status === 'qr_ready' || status === 'initializing') && qrCode ? (
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Scan the QR code below with your WhatsApp linked devices to finish setup.
          </p>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <img src={qrCode} alt="WhatsApp QR" style={{ width: '180px', height: '180px', display: 'block' }} />
          </div>
          <button onClick={fetchStatus} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
            <RefreshCw size={14} /> Refresh QR
          </button>
        </div>
      ) : status === 'initializing' ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
          </div>
          <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>Starting Browser Engine...</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>This may take 30-60 seconds on server launch.</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          {error && <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginBottom: '1rem' }}>⚠️ {error}</p>}
          <button 
            onClick={startWhatsApp} 
            className="btn btn-secondary" 
            disabled={loading && status !== 'disconnected'}
            style={{ width: 'auto', padding: '0.8rem 2rem', fontSize: '0.875rem', borderRadius: '14px' }}
          >
             Connect My WhatsApp
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>Scan a QR code from your phone to start receiving alerts.</p>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
        <form onSubmit={handleUpdateNumber}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>DESTINATION WHATSAPP NUMBER</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. 9876543210" 
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--surface-border)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <button 
              type="submit" 
              disabled={isUpdating}
              className="btn btn-primary"
              style={{
                width: 'auto',
                padding: '0 1.5rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                height: '46px'
              }}
            >
              {isUpdating ? 'Saving...' : 'SAVE'}
            </button>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertCircle size={10} /> Alerts will be sent to this number.
          </p>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppStatus;
