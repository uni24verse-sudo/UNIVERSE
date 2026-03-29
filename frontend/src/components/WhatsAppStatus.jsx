import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Phone, CheckCircle2, Copy, ExternalLink, AlertCircle, Info, Key } from 'lucide-react';

const WhatsAppStatus = () => {
  const { vendor, token, updateVendor } = useContext(AuthContext);
  const [whatsappNumber, setWhatsappNumber] = useState(vendor?.whatsappNumber || '');
  const [whatsappApiKey, setWhatsappApiKey] = useState(vendor?.whatsappApiKey || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isActive = vendor?.whatsappNumber && vendor?.whatsappApiKey;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await axios.put((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/update-profile', 
        { whatsappNumber, whatsappApiKey },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      updateVendor(res.data.admin);
      alert('WhatsApp settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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
          background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isActive ? 'var(--secondary)' : 'var(--error)',
        }}>
          {isActive ? 'ACTIVE' : 'SETUP REQUIRED'}
        </div>
      </div>

      {!isActive && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} color="var(--primary)" /> 30-Second Setup Guide
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              Save this number: <strong style={{ color: 'white' }}>+34 621 07 30 13</strong>
            </li>
            <li style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              Send this message: 
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.6rem', borderRadius: '6px', color: 'var(--primary)', fontSize: '0.7rem' }}>
                  I allow callmebot to send me messages
                </code>
                <button onClick={() => copyToClipboard('I allow callmebot to send me messages')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Copy size={12} />
                </button>
              </div>
            </li>
            <li>You will receive an <strong>API Key</strong>. Paste it below!</li>
          </ol>
        </div>
      )}

      {isActive && (
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', color: 'var(--secondary)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={24} />
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Automation Ready</p>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Your orders will be sent to WhatsApp instantly.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>DESTINATION WHATSAPP NUMBER</label>
          <input 
            type="text" 
            placeholder="e.g. 919876543210" 
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--surface-border)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'white',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Key size={12} /> YOUR CALLMEBOT API KEY
          </label>
          <input 
            type="text" 
            placeholder="Enter the key received from the bot" 
            value={whatsappApiKey}
            onChange={(e) => setWhatsappApiKey(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--surface-border)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'white',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isUpdating}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {isUpdating ? 'Saving...' : 'SAVE SETTINGS'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', textAlign: 'center' }}>
         <a href="https://wa.me/34621073013?text=I%20allow%20callmebot%20to%20send%20me%20messages" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            Get API Key on WhatsApp <ExternalLink size={10} />
         </a>
      </div>
    </div>
  );
};

export default WhatsAppStatus;
