import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Send, CheckCircle2, Copy, ExternalLink, AlertCircle, Info, Key, Phone } from 'lucide-react';

const VendorNotifications = () => {
  const { vendor, token, updateVendor } = useContext(AuthContext);
  const [telegramChatId, setTelegramChatId] = useState(vendor?.telegramChatId || '');
  const [whatsappNumber, setWhatsappNumber] = useState(vendor?.whatsappNumber || '');
  const [whatsappApiKey, setWhatsappApiKey] = useState(vendor?.whatsappApiKey || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const isTelegramActive = vendor?.telegramChatId;
  const isWhatsappActive = vendor?.whatsappNumber && vendor?.whatsappApiKey;
  const [testStatus, setTestStatus] = useState(null);

  const handleUpdateNotifications = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await axios.put((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/update-profile', 
        { telegramChatId, whatsappNumber, whatsappApiKey },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      updateVendor(res.data.admin);
      alert('Notification settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const sendTestAlert = async () => {
    setTestStatus('sending');
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/whatsapp/test-telegram', {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 5000);
    } catch (err) {
      setTestStatus('error');
      const telegramErr = err.response?.data?.telegramError;
      const msg = telegramErr 
        ? `Telegram says: ${JSON.stringify(telegramErr)}` 
        : err.response?.data?.message || 'Test failed. Check Render logs.';
      alert('❌ ' + msg);
      setTimeout(() => setTestStatus(null), 3000);
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
          <Send size={20} color="#0088cc" /> Order Alerts
        </h3>
        <div style={{ 
          padding: '0.3rem 0.8rem', 
          borderRadius: '99px', 
          fontSize: '0.7rem', 
          fontWeight: '800',
          background: isTelegramActive ? 'rgba(0, 136, 204, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isTelegramActive ? '#0088cc' : 'var(--error)',
        }}>
          {isTelegramActive ? 'TELEGRAM ACTIVE' : 'NO ALERTS'}
        </div>
      </div>

      {/* Telegram Setup */}
      {!isTelegramActive && (
        <div style={{ background: 'rgba(0,136,204,0.05)', border: '1px solid rgba(0,136,204,0.2)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0088cc' }}>
            <Info size={14} /> Official Telegram Setup
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              Open Telegram and search for: <strong style={{ color: 'white' }}>@userinfobot</strong>
            </li>
            <li>
              Send <strong style={{color:'white'}}>/start</strong> to that bot.
            </li>
            <li>It will reply with your <strong style={{color:'white'}}>Id</strong> (a number). Paste it below!</li>
          </ol>
        </div>
      )}

      {isTelegramActive && (
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', color: 'var(--secondary)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={24} />
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Automation Ready</p>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Your orders will be sent to Telegram instantly.</p>
            </div>
          </div>
          <button 
            onClick={sendTestAlert}
            disabled={testStatus === 'sending'}
            style={{ 
              width: '100%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--secondary)', borderRadius: '10px', padding: '0.5rem 1rem',
              fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer'
            }}
          >
            {testStatus === 'sending' ? '📤 Sending...' : testStatus === 'success' ? '✅ Sent! Check Telegram' : '🧪 Send Test Alert'}
          </button>
        </div>
      )}

      <form onSubmit={handleUpdateNotifications} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>YOUR TELEGRAM CHAT ID</label>
          <input 
            type="text" 
            placeholder="e.g. 123456789" 
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
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
          {isUpdating ? 'Saving...' : 'UPDATE NOTIFICATIONS'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Phone size={14} /> Alternative: WhatsApp Alerts
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
           <input 
              type="text" 
              placeholder="WhatsApp Number" 
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.6rem 1rem', color: 'white', fontSize: '0.8rem' }}
           />
           <input 
              type="text" 
              placeholder="WhatsApp API Key (CallMeBot)" 
              value={whatsappApiKey}
              onChange={(e) => setWhatsappApiKey(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.6rem 1rem', color: 'white', fontSize: '0.8rem' }}
           />
        </div>
      </div>
    </div>
  );
};

export default VendorNotifications;
