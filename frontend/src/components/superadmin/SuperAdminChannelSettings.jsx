import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Smartphone, 
  Mail, 
  QrCode, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  ShieldCheck, 
  Radio,
  Clock,
  Sparkles,
  Info,
  X
} from 'lucide-react';

const SuperAdminChannelSettings = ({ token, socket }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ whatsapp: { maxSlots: 5, slots: [] }, email: { accounts: [] } });
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'email'
  
  // WhatsApp QR Modal State
  const [qrModal, setQrModal] = useState({ open: false, slotIndex: null, qrBase64: null, loading: false, error: '' });
  
  // Nickname Edit State
  const [editingSlot, setEditingSlot] = useState(null);
  const [newNickname, setNewNickname] = useState('');
  
  // Email Account Modal State
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    nickname: '',
    senderLabel: 'UniVerse Campus',
    fromEmail: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpPass: ''
  });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  // Test Email Modal
  const [testModal, setTestModal] = useState({ open: false, accountId: null, targetEmail: '', sending: false, message: '' });

  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/channels/summary`, { headers });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch channel summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  // Socket listener for live QR & connection status
  useEffect(() => {
    if (!socket) return;

    const handleQr = ({ slotIndex, qrBase64 }) => {
      setQrModal(prev => {
        if (prev.open && prev.slotIndex === slotIndex) {
          return { ...prev, qrBase64, loading: false };
        }
        return prev;
      });
    };

    const handleStatus = ({ slotIndex, status, phoneNumber, pushName }) => {
      setData(prev => {
        const updatedSlots = prev.whatsapp.slots.map(s => {
          if (s.slotIndex === slotIndex) {
            return { ...s, status, phoneNumber: phoneNumber || s.phoneNumber, pushName: pushName || s.pushName };
          }
          return s;
        });
        return { ...prev, whatsapp: { ...prev.whatsapp, slots: updatedSlots } };
      });

      // Auto close QR modal if this slot just connected
      if (status === 'connected') {
        setQrModal(prev => prev.slotIndex === slotIndex ? { ...prev, open: false } : prev);
      }
    };

    socket.on('superadmin:whatsapp_qr', handleQr);
    socket.on('superadmin:whatsapp_status', handleStatus);

    return () => {
      socket.off('superadmin:whatsapp_qr', handleQr);
      socket.off('superadmin:whatsapp_status', handleStatus);
    };
  }, [socket]);

  // Auto-poll status every 2.5s while QR modal is active to guarantee instant catch
  useEffect(() => {
    if (!qrModal.open || !qrModal.slotIndex) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/super-admin/channels/summary`, { headers });
        if (res.data.success) {
          const currentSlot = res.data.whatsapp.slots.find(s => s.slotIndex === qrModal.slotIndex);
          if (currentSlot?.status === 'connected') {
            setQrModal({ open: false, slotIndex: null, qrBase64: null, loading: false, error: '' });
            fetchSummary();
          }
        }
      } catch (e) {
        // Silent poll
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [qrModal.open, qrModal.slotIndex]);

  // Request QR code for a slot
  const handleOpenQR = async (slotIndex) => {
    setQrModal({ open: true, slotIndex, qrBase64: null, loading: true, error: '' });
    try {
      const res = await axios.get(`${apiUrl}/api/super-admin/channels/whatsapp/qr/${slotIndex}`, { headers });
      if (res.data.status === 'already_connected') {
        setQrModal({ open: false, slotIndex: null, qrBase64: null, loading: false, error: '' });
        fetchSummary();
        alert(`Slot ${slotIndex} is already connected.`);
        return;
      }
      setQrModal(prev => ({
        ...prev,
        qrBase64: res.data.qrBase64,
        loading: !res.data.qrBase64,
        error: res.data.qrBase64 ? '' : 'Generating QR code, please wait a moment...'
      }));
    } catch (err) {
      setQrModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'Failed to request QR code.'
      }));
    }
  };

  // Disconnect Slot
  const handleDisconnect = async (slotIndex) => {
    if (!window.confirm(`Are you sure you want to disconnect WhatsApp Slot ${slotIndex}?`)) return;
    try {
      await axios.post(`${apiUrl}/api/super-admin/channels/whatsapp/disconnect/${slotIndex}`, {}, { headers });
      fetchSummary();
    } catch (err) {
      alert('Failed to disconnect: ' + (err.response?.data?.message || err.message));
    }
  };

  // Save Nickname
  const handleSaveNickname = async (slotIndex) => {
    if (!newNickname.trim()) return;
    try {
      await axios.post(`${apiUrl}/api/super-admin/channels/whatsapp/update-nickname/${slotIndex}`, { nickname: newNickname }, { headers });
      setEditingSlot(null);
      fetchSummary();
    } catch (err) {
      alert('Failed to update nickname: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add Email Sender
  const handleCreateEmail = async (e) => {
    e.preventDefault();
    setEmailSubmitting(true);
    setEmailError('');
    try {
      await axios.post(`${apiUrl}/api/super-admin/channels/email/create`, emailForm, { headers });
      setEmailModal(false);
      setEmailForm({
        nickname: '',
        senderLabel: 'UniVerse Campus',
        fromEmail: '',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpPass: ''
      });
      fetchSummary();
    } catch (err) {
      setEmailError(err.response?.data?.message || err.message || 'Failed to verify and add SMTP sender.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Delete Email
  const handleDeleteEmail = async (accountId) => {
    if (!window.confirm('Delete this email sender profile?')) return;
    try {
      await axios.delete(`${apiUrl}/api/super-admin/channels/email/${accountId}`, { headers });
      fetchSummary();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTestModal(prev => ({ ...prev, sending: true, message: '' }));
    try {
      await axios.post(`${apiUrl}/api/super-admin/channels/email/test/${testModal.accountId}`, { targetEmail: testModal.targetEmail }, { headers });
      setTestModal(prev => ({ ...prev, sending: false, message: '✅ Test email sent successfully! Check your inbox.' }));
    } catch (err) {
      setTestModal(prev => ({ ...prev, sending: false, message: '❌ Failed: ' + (err.response?.data?.message || err.message) }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'connected':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Connected</span>;
      case 'pairing':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Pairing QR Active</span>;
      case 'disconnected':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Disconnected</span>;
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></span> Empty Slot</span>;
    }
  };

  // Guarantee exactly 5 distinct slots (1..5) with zero duplicate cards
  const uniqueWhatsappSlots = React.useMemo(() => {
    const map = new Map();
    (data.whatsapp.slots || []).forEach(slot => {
      if (slot.slotIndex >= 1 && slot.slotIndex <= 5 && !map.has(slot.slotIndex)) {
        map.set(slot.slotIndex, slot);
      }
    });
    const result = [];
    for (let i = 1; i <= 5; i++) {
      if (map.has(i)) {
        result.push(map.get(i));
      } else {
        result.push({
          id: `wa_slot_${i}`,
          _id: `wa_slot_${i}`,
          slotIndex: i,
          nickname: `WhatsApp Slot ${i}`,
          status: 'empty',
          phoneNumber: '',
          pushName: ''
        });
      }
    }
    return result;
  }, [data.whatsapp.slots]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* HEADER BAR */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', background: 'rgba(239, 65, 35, 0.08)', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={14} /> SuperAdmin Exclusive Gateway Hub
          </div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.03em', color: '#0f172a' }}>
            Channels & Multi-Device Hub
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage up to 5 WhatsApp Baileys accounts and multiple Gmail SMTP senders with dedicated isolation.
          </p>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '16px' }}>
          <button
            onClick={() => setActiveTab('whatsapp')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem',
              borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'whatsapp' ? '#ffffff' : 'transparent',
              color: activeTab === 'whatsapp' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'whatsapp' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Smartphone size={18} color="#25D366" />
            WhatsApp Hub (Max 5)
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '100px', background: activeTab === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : '#e2e8f0', color: activeTab === 'whatsapp' ? '#16a34a' : '#64748b' }}>
              {uniqueWhatsappSlots.filter(s => s.status === 'connected').length}/5 Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem',
              borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
              background: activeTab === 'email' ? '#ffffff' : 'transparent',
              color: activeTab === 'email' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Mail size={18} color="#ea4335" />
            Gmail SMTP Senders
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '100px', background: activeTab === 'email' ? 'rgba(234, 67, 53, 0.15)' : '#e2e8f0', color: activeTab === 'email' ? '#ea4335' : '#64748b' }}>
              {data.email.accounts.length}
            </span>
          </button>
        </div>
      </header>

      {/* WHATSAPP 5-SLOT GRID */}
      {activeTab === 'whatsapp' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {uniqueWhatsappSlots.map((slot) => {
              const isConnected = slot.status === 'connected';
              const isPairing = slot.status === 'pairing';

              return (
                <div 
                  key={slot.slotIndex}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: isConnected ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--surface-border)',
                    boxShadow: isConnected ? '0 10px 30px rgba(16, 185, 129, 0.06)' : '0 4px 12px rgba(0,0,0,0.02)',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Row: Slot Badge & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '12px',
                          background: isConnected ? 'rgba(37, 211, 102, 0.12)' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isConnected ? '#16a34a' : '#64748b',
                          fontWeight: '900', fontSize: '0.9rem'
                        }}>
                          #{slot.slotIndex}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Slot #{slot.slotIndex} of 5
                          </span>
                        </div>
                      </div>

                      {getStatusBadge(slot.status)}
                    </div>

                    {/* Nickname & Editable Title */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      {editingSlot === slot.slotIndex ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type="text" 
                            value={newNickname} 
                            onChange={e => setNewNickname(e.target.value)}
                            placeholder="e.g. UniVerse Promos"
                            style={{
                              flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--primary)',
                              fontSize: '0.9rem', fontWeight: '700'
                            }}
                          />
                          <button 
                            onClick={() => handleSaveNickname(slot.slotIndex)}
                            style={{ padding: '0.5rem 0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingSlot(null)}
                            style={{ padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{slot.nickname}</h3>
                          <button 
                            onClick={() => { setEditingSlot(slot.slotIndex); setNewNickname(slot.nickname); }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            title="Edit Nickname"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Connected Details / Empty Placeholder */}
                    {isConnected ? (
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#64748b' }}>Phone Number:</span>
                          <span style={{ fontWeight: '800', color: '#0f172a' }}>
                            {slot.phoneNumber ? `+${slot.phoneNumber}` : (slot.isSandbox ? 'Simulated (Sandbox)' : 'Linked')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#64748b' }}>WhatsApp Name:</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {slot.pushName || (slot.isSandbox ? 'UniVerse Simulator' : 'UniVerse Bot')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                          <span>Session:</span>
                          <span>Isolated Path ({slot.slotIndex})</span>
                        </div>
                        {slot.isSandbox && (
                          <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.6rem', borderRadius: '8px', background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>🧪</span>
                            <span>Sandbox Simulation. Click Unlink to pair your real phone.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <Smartphone size={28} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                          {isPairing ? 'QR pairing in progress...' : 'Ready for device connection'}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scan QR from WhatsApp Linked Devices</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div>
                    {isConnected ? (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleDisconnect(slot.slotIndex)}
                          style={{
                            flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontWeight: '800', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer'
                          }}
                        >
                          <LogOut size={16} /> Unlink / Disconnect Slot
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenQR(slot.slotIndex)}
                        style={{
                          width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white', fontWeight: '800', fontSize: '0.9rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'
                        }}
                      >
                        <QrCode size={18} /> {isPairing ? 'View Active QR Code' : 'Pair WhatsApp Device'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMAIL SMTP SENDERS LIST */}
      {activeTab === 'email' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Add verified Gmail sender accounts using 16-character App Passwords.
            </p>
            <button
              onClick={() => setEmailModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '0.75rem 1.25rem',
                background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px',
                fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Add Gmail Sender
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {data.email.accounts.map(acc => (
              <div 
                key={acc._id}
                style={{
                  background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)',
                  padding: '1.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(234, 67, 53, 0.1)', color: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mail size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{acc.nickname}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{acc.emailConfig?.senderLabel}</span>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                      <CheckCircle size={12} /> Verified
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ color: '#64748b' }}>From Email:</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>{acc.emailConfig?.fromEmail}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                      <span>Host:</span>
                      <span>{acc.emailConfig?.smtpHost}:{acc.emailConfig?.smtpPort}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setTestModal({ open: true, accountId: acc._id, targetEmail: '', sending: false, message: '' })}
                    style={{
                      flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--surface-border)',
                      background: '#ffffff', color: '#0f172a', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Send size={14} /> Send Test Email
                  </button>
                  <button
                    onClick={() => handleDeleteEmail(acc._id)}
                    style={{
                      padding: '0.7rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)',
                      background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WHATSAPP QR PAIRING MODAL */}
      {qrModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', maxWidth: '440px', width: '100%',
            padding: '2rem', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            <button
              onClick={() => setQrModal({ open: false, slotIndex: null, qrBase64: null, loading: false, error: '' })}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(37, 211, 102, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <QrCode size={24} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '0 0 0.5rem', color: '#0f172a' }}>
              Pair WhatsApp Slot #{qrModal.slotIndex}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Open WhatsApp on your phone ➔ <strong>Settings</strong> ➔ <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong> and point your camera here.
            </p>

            <div style={{
              background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', marginBottom: '1.5rem'
            }}>
              {qrModal.loading ? (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={32} className="spin" style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700' }}>Initializing WhatsApp Engine...</p>
                </div>
              ) : qrModal.qrBase64 ? (
                <img 
                  src={qrModal.qrBase64} 
                  alt="WhatsApp QR Code" 
                  style={{ width: '220px', height: '220px', borderRadius: '12px' }} 
                />
              ) : (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{qrModal.error || 'Waiting for QR refresh...'}</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handleOpenQR(qrModal.slotIndex)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={14} /> Refresh QR
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-connects upon scan</span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EMAIL MODAL */}
      {emailModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '28px', maxWidth: '480px', width: '100%', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setEmailModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '0 0 0.5rem', color: '#0f172a' }}>Add Gmail Sender</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Use your Google Account 16-character <strong>App Password</strong>.
            </p>

            {emailError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem' }}>
                {emailError}
              </div>
            )}

            <form onSubmit={handleCreateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Nickname / Profile Label</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. UniVerse Promos & Deals"
                  value={emailForm.nickname}
                  onChange={e => setEmailForm({ ...emailForm, nickname: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Sender Display Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. UniVerse Campus"
                  value={emailForm.senderLabel}
                  onChange={e => setEmailForm({ ...emailForm, senderLabel: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Gmail Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. deals@universeapp.in or name@gmail.com"
                  value={emailForm.fromEmail}
                  onChange={e => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>16-Digit App Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={emailForm.smtpPass}
                  onChange={e => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>Generated from Google Account Security ➔ 2-Step Verification ➔ App passwords.</span>
              </div>

              <button
                type="submit"
                disabled={emailSubmitting}
                style={{
                  marginTop: '0.5rem', padding: '0.9rem', background: 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: '12px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', opacity: emailSubmitting ? 0.7 : 1
                }}
              >
                {emailSubmitting ? 'Verifying SMTP Connection...' : 'Verify & Add Sender'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TEST EMAIL MODAL */}
      {testModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '28px', maxWidth: '400px', width: '100%', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setTestModal({ open: false, accountId: null, targetEmail: '', sending: false, message: '' })}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '0 0 0.5rem', color: '#0f172a' }}>Send Test Email</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Verify this sender delivers directly to an inbox.
            </p>

            {testModal.message && (
              <div style={{ padding: '0.75rem', background: testModal.message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: testModal.message.startsWith('✅') ? '#10b981' : '#ef4444', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem' }}>
                {testModal.message}
              </div>
            )}

            <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Recipient Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="your.email@example.com"
                  value={testModal.targetEmail}
                  onChange={e => setTestModal({ ...testModal, targetEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={testModal.sending}
                style={{
                  padding: '0.85rem', background: 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', opacity: testModal.sending ? 0.7 : 1
                }}
              >
                {testModal.sending ? 'Sending...' : 'Send Live Test Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminChannelSettings;
