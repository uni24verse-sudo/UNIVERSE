import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Send, CheckCircle2, Info, Key } from 'lucide-react';

const VendorNotifications = ({ store }) => {
  const { vendor, token, updateVendor } = useContext(AuthContext);
  const [telegramChatId, setTelegramChatId] = useState(store?.telegramChatId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
 
  // Update local state when store prop changes
  React.useEffect(() => {
    setTelegramChatId(store?.telegramChatId || '');
  }, [store]);
 
  const isActive = !!telegramChatId;
 
  const handleSave = async (e) => {
    e.preventDefault();
    if (!store) return;
    setIsUpdating(true);
    try {
      // Save to STORE level
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/${store._id}/update-details`,
        { telegramChatId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Also update the global admin if needed (optional fallback)
      // but we focus on store-level now. 
      // The parent component (Dashboard) handles the store state update via its own fetch or state management
      // For instant feedback, we can alert.
      alert(`Telegram settings saved for ${store.name}!`);
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setIsUpdating(false);
    }
  };
 
  const sendTestAlert = async () => {
    if (!store) return;
    setTestStatus('sending');
    try {
      await axios.post(
        (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/whatsapp/test-telegram',
        { storeId: store._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 5000);
    } catch (err) {
      setTestStatus('error');
      const telegramErr = err.response?.data?.telegramError;
      const msg = telegramErr
        ? `Telegram says: ${JSON.stringify(telegramErr)}`
        : err.response?.data?.message || 'Test failed.';
      alert('❌ ' + msg);
      setTimeout(() => setTestStatus(null), 3000);
    }
  };
 
  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--surface-border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={20} color="#0088cc" /> Order Alerts
        </h3>
        <div style={{
          padding: '0.3rem 0.8rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '800',
          background: isActive ? 'rgba(0, 136, 204, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isActive ? '#0088cc' : 'var(--error)',
        }}>
          {isActive ? 'TELEGRAM ACTIVE' : 'SETUP REQUIRED'}
        </div>
      </div>
 
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: '600' }}>
         Configure alerts for: <span style={{ color: 'var(--primary)' }}>{store?.name || 'Loading...'}</span>
      </p>
 
      {/* Active state */}
      {isActive && (
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', color: 'var(--secondary)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={24} />
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Automation Ready</p>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Orders trigger an instant Telegram notification.</p>
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
 
      {/* Setup guide */}
      {!isActive && (
        <div style={{ background: 'rgba(0,136,204,0.05)', border: '1px solid rgba(0,136,204,0.2)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0088cc' }}>
            <Info size={14} /> 30-Second Telegram Setup
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li>Open Telegram → search <strong style={{ color: 'white' }}>@userinfobot</strong></li>
            <li>Send <strong style={{ color: 'white' }}>/start</strong> — it replies with your <strong style={{ color: 'white' }}>Id</strong></li>
            <li>Search for <strong style={{ color: 'white' }}>your bot</strong> (created via @BotFather) and send <strong style={{ color: 'white' }}>/start</strong></li>
            <li>Paste the Id below and save!</li>
          </ol>
        </div>
      )}
 
      {/* Input form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Key size={12} /> YOUR TELEGRAM CHAT ID
          </label>
          <input
            type="text"
            placeholder="e.g. 1080395706"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)',
              borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.9rem', outline: 'none'
            }}
          />
          {telegramChatId && telegramChatId.includes(':') && (
            <p style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '0.5rem', fontWeight: '800' }}>
              ⚠️ Bot Token detected! Please use your numeric <b>Chat ID</b> instead.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isUpdating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem' }}
        >
          {isUpdating ? 'Saving...' : 'SAVE SETTINGS'}
        </button>
      </form>
    </div>
  );
};

export default VendorNotifications;
