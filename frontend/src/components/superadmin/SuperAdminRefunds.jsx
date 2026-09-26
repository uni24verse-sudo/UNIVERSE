import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  QrCode, 
  Smartphone, 
  Search, 
  Settings, 
  Users, 
  MessageCircle, 
  X, 
  Edit3, 
  Sparkles, 
  Zap,
  TrendingUp,
  CreditCard,
  Trash2
} from 'lucide-react';

const SuperAdminRefunds = ({ token, socket }) => {
  const [activeSubTab, setActiveSubTab] = useState('queue'); // 'queue' | 'history'
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [historyRefunds, setHistoryRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyTotal, setHistoryTotal] = useState(0);

  // Dynamic QR Code Modal
  const [qrModalData, setQrModalData] = useState(null);

  // Settlement Form State per card
  const [utrInputs, setUtrInputs] = useState({});

  // Edit UTR Modal State
  const [editUtrModal, setEditUtrModal] = useState(null); // { refundId, orderNumber, currentUtr }
  const [editUtrValue, setEditUtrValue] = useState('');
  const [isUpdatingUtr, setIsUpdatingUtr] = useState(false);

  // Alert Settings Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Copy Feedback Tracking
  const [copiedId, setCopiedId] = useState(null);

  // Bulk / Single Delete State
  const [selectedRefundIds, setSelectedRefundIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const toggleSelectRefund = (id) => {
    setSelectedRefundIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRefunds = (items) => {
    const allIds = items.map(r => r._id || r.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedRefundIds.includes(id));
    if (allSelected) {
      setSelectedRefundIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedRefundIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleDeleteSingleRefund = async (refundId, label = 'this refund') => {
    if (!window.confirm(`Are you sure you want to permanently delete refund entry (${label})? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/api/super-admin/refunds/${refundId}`, authConfig);
      setSelectedRefundIds(prev => prev.filter(id => id !== refundId));
      fetchPendingRefunds(true);
      fetchRefundHistory(true);
      alert('Refund entry deleted successfully.');
    } catch (err) {
      alert('Failed to delete refund: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDeleteRefunds = async () => {
    if (selectedRefundIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedRefundIds.length} selected refund entries? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${API_URL}/api/super-admin/refunds/bulk-delete`, 
        { ids: selectedRefundIds }, 
        authConfig
      );
      setSelectedRefundIds([]);
      fetchPendingRefunds(true);
      fetchRefundHistory(true);
      alert('Selected refund entries deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch pending refunds, history count, and alert config on mount
  useEffect(() => {
    fetchPendingRefunds();
    fetchRefundHistory();
    fetchRefundConfig();
  }, []);

  // Fetch history when searching
  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchRefundHistory();
    }
  }, [searchQuery]);

  // Real-time Socket Listeners for new refund requests & settlement events
  useEffect(() => {
    if (!socket) return;

    const handleNewRefund = (data) => {
      console.log('⚡ [Socket] New Refund Request Received:', data);
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
      fetchPendingRefunds(true);
      fetchRefundHistory(true);
    };

    const handleRefundSettled = (data) => {
      console.log('✅ [Socket] Refund Settled Event:', data);
      fetchPendingRefunds(true);
      fetchRefundHistory(true);
    };

    socket.on('new_refund_request', handleNewRefund);
    socket.on('refund_settled', handleRefundSettled);

    return () => {
      socket.off('new_refund_request', handleNewRefund);
      socket.off('refund_settled', handleRefundSettled);
    };
  }, [socket]);

  const fetchPendingRefunds = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/refunds/pending`, authConfig);
      setPendingRefunds(res.data || []);
    } catch (err) {
      console.error('Error fetching pending refunds:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchRefundHistory = async (silent = false) => {
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/refunds/history?search=${encodeURIComponent(searchQuery)}`, authConfig);
      setHistoryRefunds(res.data?.refunds || []);
      setHistoryTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Error fetching refund history:', err);
    }
  };

  const fetchRefundConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/refunds/config`, authConfig);
      setAlertConfig(res.data);
    } catch (err) {
      console.error('Error fetching refund config:', err);
    }
  };

  const openConfigModal = async () => {
    setShowConfigModal(true);
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/refunds/whatsapp-groups`, authConfig);
      setWhatsappGroups(res.data || []);
    } catch (err) {
      console.error('Error fetching whatsapp groups:', err);
    }
  };

  const saveAlertConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await axios.post(`${API_URL}/api/super-admin/refunds/config`, alertConfig, authConfig);
      if (res.data?.success) {
        setAlertConfig(res.data.config);
        setShowConfigModal(false);
      }
    } catch (err) {
      alert('Failed to save configuration: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSettle = async (refundId) => {
    const utr = (utrInputs[refundId] || '').trim();
    if (!utr) {
      alert('Bank UTR / Transaction Reference number is strictly required to mark this refund as settled.');
      return;
    }
    setActionLoading(refundId);
    try {
      const res = await axios.post(`${API_URL}/api/super-admin/refunds/${refundId}/settle`, { utr }, authConfig);
      if (res.data?.success) {
        // Remove settled refund from pending state
        setPendingRefunds(prev => prev.filter(r => r._id !== refundId));
        setUtrInputs(prev => {
          const next = { ...prev };
          delete next[refundId];
          return next;
        });
        if (qrModalData?.refundId === refundId) {
          setQrModalData(null);
        }
      }
    } catch (err) {
      alert('Failed to settle refund: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEditedUtr = async (e) => {
    e.preventDefault();
    if (!editUtrModal) return;
    setIsUpdatingUtr(true);
    try {
      const res = await axios.put(`${API_URL}/api/super-admin/refunds/${editUtrModal.refundId}/utr`, {
        utr: editUtrValue
      }, authConfig);
      if (res.data?.success) {
        setHistoryRefunds(prev => prev.map(r => r._id === editUtrModal.refundId ? { ...r, utr: editUtrValue } : r));
        setEditUtrModal(null);
      }
    } catch (err) {
      alert('Failed to update UTR: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingUtr(false);
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Build UPI Deep Link for 1-Tap Mobile Payment
  const getUpiDeepLink = (refund) => {
    const upiId = refund.customerUpiId || refund.orderId?.customerUpiId || '';
    const studentName = (refund.customerName || refund.orderId?.customerName || 'UniVerse Student').replace(/[^a-zA-Z0-9 ]/g, '');
    const amount = (refund.amount || refund.orderId?.totalAmount || 0).toFixed(2);
    const orderNumber = refund.orderId?.orderNumber || 'REFUND';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=UniVerse${orderNumber}&cu=INR`;
  };

  // Metrics Calculations
  const pendingTotalAmount = pendingRefunds.reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div>
      {/* Header & Controls */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 20, 
        background: '#f8fafc', 
        paddingTop: '0.25rem', 
        paddingBottom: '1.25rem', 
        marginBottom: '1.5rem', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)' }}>
              <RotateCcw size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>Instant Direct Refunds</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Direct UPI fulfillment desk with 1-tap mobile payment & WhatsApp alerts</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={openConfigModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: '12px', background: '#ffffff', border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <Settings size={16} color="var(--primary)" /> Team Alert Settings
          </button>
          <button 
            onClick={() => { fetchPendingRefunds(); if (activeSubTab === 'history') fetchRefundHistory(); }}
            style={{
              padding: '0.65rem 1rem', borderRadius: '12px', background: '#ffffff',
              border: '1px solid var(--surface-border)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Queue</span>
            {pendingRefunds.length > 0 ? (
              <span style={{ fontSize: '0.7rem', fontWeight: '900', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                ACTION REQUIRED
              </span>
            ) : (
              <span style={{ fontSize: '0.7rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                ALL CLEAR
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', margin: 0, color: pendingRefunds.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {pendingRefunds.length}
          </h2>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Total value: ₹{pendingTotalAmount.toFixed(2)}
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
            Average Turnaround
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', margin: 0, color: '#10b981' }}>
            &lt; 3 mins
          </h2>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Zero bank delays via direct P2P UPI
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
            WhatsApp Alert Channel
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: alertConfig?.groupJid ? '#10b981' : '#f59e0b' }}></div>
            <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>
              {alertConfig?.groupName || (alertConfig?.groupJid ? 'WhatsApp Group Connected' : 'Admin Phone Numbers')}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Instant notifications sent upon cancellation
          </p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveSubTab('queue')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
            fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: activeSubTab === 'queue' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'queue' ? '2.5px solid var(--primary)' : '2.5px solid transparent'
          }}
        >
          <Zap size={16} /> Active Queue ({pendingRefunds.length})
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          style={{
            background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
            fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: activeSubTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'history' ? '2.5px solid var(--primary)' : '2.5px solid transparent'
          }}
        >
          <Clock size={16} /> Settled History ({historyTotal})
        </button>
      </div>

      {/* TAB 1: PENDING REFUND QUEUE */}
      {activeSubTab === 'queue' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="pulse-container"><div className="pulse-dot"></div></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Checking pending refund requests...</p>
            </div>
          ) : pendingRefunds.length === 0 ? (
            <div style={{ padding: '4rem 2rem', background: '#ffffff', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--surface-border)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0 }}>Refund Queue is Empty!</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto 0', fontSize: '0.9rem' }}>
                All student cancellations have been fulfilled. Whenever a new order is cancelled, it will appear here in real time.
              </p>
            </div>
          ) : (
            <div>
              {/* BULK ACTION BAR */}
              {selectedRefundIds.length > 0 && (
                <div style={{
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1.25rem',
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '800', color: '#e11d48', fontSize: '0.9rem' }}>
                      {selectedRefundIds.length} refund{selectedRefundIds.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedRefundIds([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Clear selection
                    </button>
                  </div>
                  <button
                    onClick={handleBulkDeleteRefunds}
                    disabled={isDeleting}
                    style={{
                      padding: '0.5rem 1.1rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#e11d48',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)'
                    }}
                  >
                    <Trash2 size={15} />
                    {isDeleting ? 'Deleting...' : `Delete Selected (${selectedRefundIds.length})`}
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {pendingRefunds.map(refund => {
                  const order = refund.orderId || {};
                  const upiId = refund.customerUpiId || order.customerUpiId || order.payerUpiId || '';
                  const deepLink = getUpiDeepLink(refund);
                  const isSelected = selectedRefundIds.includes(refund._id);

                  return (
                    <div key={refund._id} style={{
                      background: isSelected ? 'rgba(254, 242, 242, 0.6)' : '#ffffff',
                      borderRadius: '24px', border: isSelected ? '2px solid #e11d48' : '1.5px solid rgba(239, 68, 68, 0.25)',
                      padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}>
                      <div>
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRefund(refund._id)}
                              style={{ width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer', accentColor: '#e11d48' }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)' }}>Order #{order.orderNumber || 'N/A'}</span>
                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontWeight: '800' }}>
                                  PENDING
                                </span>
                              </div>
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {order.store?.name || 'Counter'} • {new Date(refund.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--secondary)' }}>
                              ₹{(refund.amount || order.totalAmount || 0).toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleDeleteSingleRefund(refund._id, `Order #${order.orderNumber || refund._id}`)}
                              title="Delete refund entry"
                              style={{
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                color: '#e11d48',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                      {/* Customer Details */}
                      <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--surface-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Student:</span>
                          <span style={{ fontWeight: '800' }}>{refund.customerName || order.customerName || 'Student'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                          <a 
                            href={`https://wa.me/91${(refund.customerPhone || order.customerPhone || '').replace(/\D/g, '').slice(-10)}`}
                            target="_blank" 
                            rel="noreferrer"
                            style={{ color: '#10b981', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <MessageCircle size={14} /> {refund.customerPhone || order.customerPhone}
                          </a>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Reason:</span>
                          <span style={{ fontWeight: '600', color: '#ef4444', fontSize: '0.75rem', maxWidth: '200px', textAlign: 'right' }}>
                            {refund.reason || 'Order cancelled'}
                          </span>
                        </div>
                      </div>

                      {/* UPI ID Target Box with Copy */}
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02))',
                        border: '1px dashed var(--primary)', borderRadius: '14px', padding: '0.85rem', marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                          Target Student UPI ID:
                        </span>
                        {upiId ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                              {upiId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(upiId, `upi_${refund._id}`)}
                              style={{
                                background: '#ffffff', border: '1px solid var(--surface-border)',
                                color: copiedId === `upi_${refund._id}` ? '#10b981' : 'var(--text-primary)',
                                borderRadius: '8px', padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.3rem'
                              }}
                            >
                              {copiedId === `upi_${refund._id}` ? <Check size={12} /> : <Copy size={12} />}
                              {copiedId === `upi_${refund._id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: '700' }}>
                            ⏳ Waiting for student to input UPI ID on tracker
                          </span>
                        )}
                      </div>

                      {/* ⚡ Fast 1-Tap Payment Triggers */}
                      {upiId && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                          <a
                            href={deepLink}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                              padding: '0.75rem 0.5rem', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#ffffff', fontWeight: '800', fontSize: '0.8rem', textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', textAlign: 'center'
                            }}
                          >
                            <Smartphone size={16} /> Pay on UPI App
                          </a>
                          <button
                            onClick={() => setQrModalData({
                              refundId: refund._id,
                              orderNumber: order.orderNumber,
                              amount: refund.amount || order.totalAmount,
                              studentName: refund.customerName || order.customerName,
                              upiId,
                              deepLink
                            })}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                              padding: '0.75rem 0.5rem', borderRadius: '12px', background: '#ffffff',
                              border: '1px solid var(--surface-border)', color: 'var(--text-primary)',
                              fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                            }}
                          >
                            <QrCode size={16} color="var(--primary)" /> Scan QR Code
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Settle Action Bar */}
                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: utrInputs[refund._id]?.trim() ? '#10b981' : '#ef4444' }}>
                            Bank UTR / Ref Number * {utrInputs[refund._id]?.trim() ? '✓' : '(Required)'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter 12-digit Bank UTR / Ref (Mandatory)"
                          value={utrInputs[refund._id] || ''}
                          onChange={(e) => setUtrInputs({ ...utrInputs, [refund._id]: e.target.value })}
                          style={{
                            width: '100%', height: '40px', padding: '0 0.75rem', borderRadius: '10px',
                            border: utrInputs[refund._id]?.trim() ? '1.5px solid #10b981' : '1.5px solid #f87171',
                            background: utrInputs[refund._id]?.trim() ? '#f0fdf4' : '#fff5f5',
                            fontSize: '0.825rem', outline: 'none', fontWeight: '600'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleSettle(refund._id)}
                        disabled={actionLoading === refund._id || !upiId || !utrInputs[refund._id]?.trim()}
                        style={{
                          width: '100%', height: '44px', borderRadius: '12px',
                          background: (upiId && utrInputs[refund._id]?.trim()) ? 'linear-gradient(135deg, #10b981, #059669)' : '#d1d5db',
                          color: '#ffffff', border: 'none', fontWeight: '800', fontSize: '0.875rem',
                          cursor: (upiId && utrInputs[refund._id]?.trim()) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '0.5rem',
                          boxShadow: (upiId && utrInputs[refund._id]?.trim()) ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                      >
                        {actionLoading === refund._id ? (
                          'Settling & Notifying Student...'
                        ) : (
                          <>
                            <Check size={16} /> Mark as Refunded & Notify Student
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      )}

      {/* TAB 2: SETTLED REFUND HISTORY */}
      {activeSubTab === 'history' && (
        <div>
          {/* BULK ACTION BAR */}
          {selectedRefundIds.length > 0 && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.85rem 1.25rem',
              background: '#fff1f2',
              border: '1.5px solid #fecdd3',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: '800', color: '#e11d48', fontSize: '0.9rem' }}>
                  {selectedRefundIds.length} refund{selectedRefundIds.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedRefundIds([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear selection
                </button>
              </div>
              <button
                onClick={handleBulkDeleteRefunds}
                disabled={isDeleting}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)'
                }}
              >
                <Trash2 size={15} />
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedRefundIds.length})`}
              </button>
            </div>
          )}

          {/* Search Header */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search history by Order #, Student Name, Phone, UPI ID, or UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '46px', paddingLeft: '2.8rem', paddingRight: '1rem',
                  borderRadius: '12px', border: '1px solid var(--surface-border)', background: '#ffffff',
                  fontSize: '0.9rem', outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
            {historyRefunds.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No settled refunds matching your criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={historyRefunds.length > 0 && historyRefunds.every(r => selectedRefundIds.includes(r._id))}
                          onChange={() => toggleSelectAllRefunds(historyRefunds)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e11d48' }}
                        />
                      </th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Order Details</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Student & UPI</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Amount</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Bank Ref / UTR</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Settled At & By</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRefunds.map(refund => {
                      const order = refund.orderId || {};
                      const isSelected = selectedRefundIds.includes(refund._id);
                      return (
                        <tr key={refund._id} style={{ borderBottom: '1px solid var(--surface-border)', background: isSelected ? 'rgba(254, 242, 242, 0.6)' : 'transparent' }}>
                          <td style={{ width: '48px', padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRefund(refund._id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e11d48' }}
                            />
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>Order #{order.orderNumber || 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{order.store?.name || 'Counter'}</div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: '700' }}>{refund.customerName || order.customerName || 'Student'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>{refund.customerUpiId || 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{refund.customerPhone || order.customerPhone}</div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ fontWeight: '900', color: '#10b981', fontSize: '1rem' }}>
                              ₹{(refund.amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {refund.utr ? (
                              <button
                                onClick={() => copyToClipboard(refund.utr, `utr_${refund._id}`)}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#059669',
                                  padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                }}
                              >
                                {copiedId === `utr_${refund._id}` ? <Check size={12} /> : <Copy size={12} />}
                                {refund.utr}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '800' }}>
                                UTR Missing
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                              {new Date(refund.settledAt || refund.processedAt || refund.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>By: {refund.settledBy || 'Super Admin'}</div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditUtrModal({
                                    refundId: refund._id,
                                    orderNumber: order.orderNumber,
                                    currentUtr: refund.utr || ''
                                  });
                                  setEditUtrValue(refund.utr || '');
                                }}
                                style={{
                                  background: '#ffffff', border: '1px solid var(--surface-border)',
                                  color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '8px',
                                  fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', gap: '0.3rem'
                                }}
                              >
                                <Edit3 size={12} /> {refund.utr ? 'Edit UTR' : 'Add UTR'}
                              </button>
                              <button
                                onClick={() => handleDeleteSingleRefund(refund._id, `Order #${order.orderNumber || refund._id}`)}
                                title="Delete settled refund record"
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#e11d48',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DYNAMIC UPI QR CODE MODAL (For Desktop Admin Scanning) */}
      {qrModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '2rem',
            width: '100%', maxWidth: '420px', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button
              onClick={() => setQrModalData(null)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 0.25rem 0' }}>
              Scan & Pay via UPI App
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
              Point phone camera, GPay, or PhonePe scanner at screen
            </p>

            <div style={{
              padding: '1.5rem', background: '#ffffff', border: '2px dashed var(--surface-border)',
              borderRadius: '20px', display: 'inline-block', marginBottom: '1.5rem'
            }}>
              <QRCodeSVG value={qrModalData.deepLink} size={200} level="H" includeMargin={true} />
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
                <span style={{ fontWeight: '900', color: 'var(--secondary)', fontSize: '1.1rem' }}>₹{qrModalData.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Recipient:</span>
                <span style={{ fontWeight: '800' }}>{qrModalData.studentName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>UPI ID:</span>
                <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{qrModalData.upiId}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: utrInputs[qrModalData.refundId]?.trim() ? '#10b981' : '#ef4444', marginBottom: '0.35rem' }}>
                Bank UTR / Ref Number * {utrInputs[qrModalData.refundId]?.trim() ? '✓' : '(Required)'}
              </label>
              <input
                type="text"
                placeholder="Enter 12-digit UTR from your UPI app"
                value={utrInputs[qrModalData.refundId] || ''}
                onChange={(e) => setUtrInputs({ ...utrInputs, [qrModalData.refundId]: e.target.value })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '10px',
                  border: utrInputs[qrModalData.refundId]?.trim() ? '1.5px solid #10b981' : '1.5px solid #f87171',
                  background: utrInputs[qrModalData.refundId]?.trim() ? '#f0fdf4' : '#fff5f5',
                  fontSize: '0.85rem', outline: 'none', fontWeight: '600'
                }}
              />
            </div>

            <button
              onClick={() => handleSettle(qrModalData.refundId)}
              disabled={actionLoading === qrModalData.refundId || !utrInputs[qrModalData.refundId]?.trim()}
              style={{
                width: '100%', height: '48px', borderRadius: '12px',
                background: utrInputs[qrModalData.refundId]?.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#d1d5db',
                color: 'white', border: 'none', fontWeight: '800', fontSize: '0.95rem',
                cursor: utrInputs[qrModalData.refundId]?.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {actionLoading === qrModalData.refundId ? 'Settling...' : (
                <>
                  <Check size={18} /> Done! Mark Order as Refunded
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* EDIT UTR MODAL */}
      {editUtrModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '2rem',
            width: '100%', maxWidth: '400px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button
              onClick={() => setEditUtrModal(null)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 0.5rem 0' }}>
              Update Bank Ref / UTR
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              Order #{editUtrModal.orderNumber}
            </p>

            <form onSubmit={handleSaveEditedUtr}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                  12-Digit Bank UTR / Transaction Reference:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 429817293847"
                  value={editUtrValue}
                  onChange={(e) => setEditUtrValue(e.target.value)}
                  required
                  style={{
                    width: '100%', height: '44px', padding: '0 0.75rem', borderRadius: '10px',
                    border: '1px solid var(--surface-border)', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditUtrModal(null)}
                  style={{
                    flex: 1, height: '44px', borderRadius: '10px', background: '#f1f5f9',
                    border: 'none', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUtr}
                  style={{
                    flex: 1, height: '44px', borderRadius: '10px', background: 'var(--primary)',
                    color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  {isUpdatingUtr ? 'Saving...' : 'Save UTR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP TEAM ALERT CONFIGURATION MODAL */}
      {showConfigModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '2rem',
            width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button
              onClick={() => setShowConfigModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>
                Team WhatsApp Alert Settings
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
              Configure where instant refund alerts are routed when an order is cancelled
            </p>

            <form onSubmit={saveAlertConfig}>
              {/* Option 1: WhatsApp Group Dropdown */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                  Target WhatsApp Group:
                </label>
                <select
                  value={alertConfig?.groupJid || ''}
                  onChange={(e) => {
                    const selected = whatsappGroups.find(g => g.id === e.target.value);
                    setAlertConfig({
                      ...alertConfig,
                      groupJid: e.target.value,
                      groupName: selected?.subject || alertConfig?.groupName || ''
                    });
                  }}
                  style={{
                    width: '100%', height: '46px', padding: '0 0.75rem', borderRadius: '12px',
                    border: '1px solid var(--surface-border)', fontSize: '0.85rem', background: '#ffffff', outline: 'none'
                  }}
                >
                  <option value="">-- Select from your WhatsApp Groups --</option>
                  {whatsappGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.subject} ({group.participantsCount} members)
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
                  Ensure your connected WhatsApp number is a member of this group.
                </span>
              </div>

              {/* Or Manual Group JID */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                  Or Paste Group JID manually:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 120363xxxxxx@g.us"
                  value={alertConfig?.groupJid || ''}
                  onChange={(e) => setAlertConfig({ ...alertConfig, groupJid: e.target.value })}
                  style={{
                    width: '100%', height: '40px', padding: '0 0.75rem', borderRadius: '10px',
                    border: '1px solid var(--surface-border)', fontSize: '0.8rem', outline: 'none'
                  }}
                />
              </div>

              {/* Option 2: Direct Admin Phone Numbers */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                  Admin Phone Numbers (comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="7985397373, 8295886832"
                  value={(alertConfig?.phoneNumbers || []).join(', ')}
                  onChange={(e) => setAlertConfig({
                    ...alertConfig,
                    phoneNumbers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  style={{
                    width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '10px',
                    border: '1px solid var(--surface-border)', fontSize: '0.85rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    flex: 1, height: '44px', borderRadius: '12px', background: '#f1f5f9',
                    border: 'none', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  style={{
                    flex: 1, height: '44px', borderRadius: '12px', background: 'var(--primary)',
                    color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRefunds;
