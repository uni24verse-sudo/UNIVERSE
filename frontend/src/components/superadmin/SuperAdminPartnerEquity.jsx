import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  PieChart, 
  TrendingUp, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Shield, 
  DollarSign, 
  Calendar, 
  Lock, 
  FileText, 
  RefreshCw, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const SuperAdminPartnerEquity = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partners, setPartners] = useState([]);
  const [capTable, setCapTable] = useState({ totalAllocatedEquity: 0, treasuryReserveEquity: 100, isFullyAllocated: false });
  const [poolInfo, setPoolInfo] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('partners'); // 'partners' | 'history'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Co-Founder',
    equityShare: '',
    upiId: '',
    bankAccount: { accountNumber: '', ifsc: '', bankName: '' }
  });

  // Distribution wizard state
  const [distributeConfig, setDistributeConfig] = useState({
    title: '',
    poolMode: 'net_profit', // Default strictly to pure platform profit (₹34.90)
    reservePercentage: 0,
    notes: '',
    partnerPayouts: []
  });
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // 2FA Equity Security Gate State (parthsharma240404@gmail.com)
  const [equityToken, setEquityToken] = useState(() => sessionStorage.getItem('universe_equity_token') || '');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [partnersRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/super-admin/partners`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/super-admin/partners/distribution/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPartners(partnersRes.data.partners || []);
      setCapTable(partnersRes.data.capTable || { totalAllocatedEquity: 0, treasuryReserveEquity: 100 });
      setPoolInfo(partnersRes.data.poolInfo || null);
      setHistoryRuns(historyRes.data || []);
    } catch (err) {
      console.error('Error fetching partner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Add Partner Modal
  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Co-Founder',
      equityShare: '',
      upiId: '',
      bankAccount: { accountNumber: '', ifsc: '', bankName: '' }
    });
    setShowAddModal(true);
  };

  // Open Edit Partner Modal
  const openEditModal = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      role: partner.role || 'Co-Founder',
      equityShare: partner.equityShare || '',
      upiId: partner.upiId || '',
      bankAccount: partner.bankAccount || { accountNumber: '', ifsc: '', bankName: '' },
      status: partner.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  // Request 2FA OTP
  const requestEquityOtp = async (actionToPerform = null) => {
    setOtpLoading(true);
    setOtpError('');
    if (actionToPerform) {
      setPendingAction(() => actionToPerform);
    }
    try {
      const res = await axios.post(`${API_URL}/api/super-admin/partners/auth/request-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOtpSentMessage(res.data.message || 'Verification code sent to parthsharma240404@gmail.com');
      setShowOtpModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify 2FA OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await axios.post(`${API_URL}/api/super-admin/partners/auth/verify-otp`, {
        code: otpCode.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.verified && res.data.token) {
        setEquityToken(res.data.token);
        sessionStorage.setItem('universe_equity_token', res.data.token);
        setShowOtpModal(false);
        setOtpCode('');
        
        if (pendingAction) {
          const action = pendingAction;
          setPendingAction(null);
          action(res.data.token);
        }
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Execute Save Partner with token
  const executeSavePartner = async (authToken) => {
    try {
      if (editingPartner) {
        await axios.put(`${API_URL}/api/super-admin/partners/${editingPartner.id}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'x-equity-auth': authToken
          }
        });
        setShowEditModal(false);
      } else {
        await axios.post(`${API_URL}/api/super-admin/partners`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'x-equity-auth': authToken
          }
        });
        setShowAddModal(false);
      }
      fetchData(true);
    } catch (err) {
      if (err.response?.data?.require2FA) {
        setEquityToken('');
        sessionStorage.removeItem('universe_equity_token');
        requestEquityOtp((validToken) => executeSavePartner(validToken));
        return;
      }
      alert(err.response?.data?.message || 'Failed to save partner');
    }
  };

  // Handle Save (Add or Edit)
  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!equityToken) {
      requestEquityOtp((validToken) => executeSavePartner(validToken));
      return;
    }
    executeSavePartner(equityToken);
  };

  // Execute Delete Partner with token
  const executeDeletePartner = async (partner, authToken) => {
    try {
      const res = await axios.delete(`${API_URL}/api/super-admin/partners/${partner.id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-equity-auth': authToken
        }
      });
      alert(res.data.message || 'Partner removed successfully');
      fetchData(true);
    } catch (err) {
      if (err.response?.data?.require2FA) {
        setEquityToken('');
        sessionStorage.removeItem('universe_equity_token');
        requestEquityOtp((validToken) => executeDeletePartner(partner, validToken));
        return;
      }
      alert(err.response?.data?.message || 'Failed to delete partner');
    }
  };

  // Handle Delete / Deactivate Partner
  const handleDeletePartner = async (partner) => {
    if (!window.confirm(`Are you sure you want to remove partner "${partner.name}"?`)) return;
    if (!equityToken) {
      requestEquityOtp((validToken) => executeDeletePartner(partner, validToken));
      return;
    }
    executeDeletePartner(partner, equityToken);
  };

  // Open Distribution Run Modal
  const openDistributeModal = async () => {
    const currentPool = poolInfo?.availableDistributablePool || 0;
    if (currentPool <= 0) {
      alert('There is currently no undistributed profit in the pool to distribute.');
      return;
    }
    const defaultTitle = `Profit Distribution - ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
    setDistributeConfig({
      title: defaultTitle,
      poolMode: 'net_profit',
      reservePercentage: 0,
      notes: '',
      partnerPayouts: []
    });
    setShowDistributeModal(true);
    fetchPreview('net_profit', 0);
  };

  // Fetch Preview Math
  const fetchPreview = async (poolMode, reservePercentage) => {
    setPreviewLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/super-admin/partners/distribution/preview?poolMode=${poolMode}&reservePercentage=${reservePercentage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewData(res.data);
      // Initialize UTR inputs for each partner payout
      const initialPayouts = (res.data.partnerAllocations || []).map(p => ({
        partnerId: p.partnerId,
        utrNumber: `UPI-${Date.now().toString().slice(-6)}-${p.name.slice(0, 3).toUpperCase()}`
      }));
      setDistributeConfig(prev => ({ ...prev, partnerPayouts: initialPayouts }));
    } catch (err) {
      console.error('Error fetching preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Execute Distribution Run with token
  const executeDistributionRun = async (authToken) => {
    setExecuting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/super-admin/partners/distribution/execute`,
        distributeConfig,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'x-equity-auth': authToken
          } 
        }
      );
      alert('✅ Profit distribution run executed and locked into the ledger!');
      setShowDistributeModal(false);
      fetchData(true);
      setActiveSubTab('history');
    } catch (err) {
      if (err.response?.data?.require2FA) {
        setEquityToken('');
        sessionStorage.removeItem('universe_equity_token');
        requestEquityOtp((validToken) => executeDistributionRun(validToken));
        return;
      }
      alert(err.response?.data?.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteDistribution = async () => {
    if (!window.confirm(`Confirm execution of this profit distribution run?\n\nThis will lock the profit snapshot into the immutable ledger and mark partner payouts as completed.`)) {
      return;
    }
    if (!equityToken) {
      requestEquityOtp((validToken) => executeDistributionRun(validToken));
      return;
    }
    executeDistributionRun(equityToken);
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block', color: 'var(--primary)' }} />
        <p style={{ fontWeight: '700' }}>Loading Partner Equity & Profit Ledger...</p>
      </div>
    );
  }

  const availablePoolAmount = poolInfo?.availableDistributablePool || 0;
  const maxAvailableEquity = editingPartner 
    ? (100 - (capTable.totalAllocatedEquity - editingPartner.equityShare)) 
    : (100 - capTable.totalAllocatedEquity);

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>
              ENTERPRISE LEDGER
            </span>
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle size={13} /> Full-Proof Dual Reconciliation
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Partner Profit & Equity Distribution</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Cap table equity shares, live dividend allocations, and immutable settlement runs.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', border: '1px solid var(--surface-border)',
              background: '#ffffff', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>

          {/* 2FA Security Status Pill */}
          {equityToken ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
              padding: '0.65rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800'
            }}>
              <Shield size={15} /> Authorized
            </div>
          ) : (
            <button
              onClick={() => requestEquityOtp()}
              type="button"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3',
                padding: '0.65rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              <Lock size={15} /> 2FA Protected
            </button>
          )}
          <button
            onClick={openAddModal}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: '12px', border: 'none',
              background: '#f1f5f9', color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Partner
          </button>
          <button
            onClick={openDistributeModal}
            style={{
              padding: '0.65rem 1.4rem', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #ef4123 0%, #ea580c 100%)',
              color: '#ffffff', fontWeight: '800', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
            }}
          >
            <Sparkles size={16} /> Run Distribution
          </button>
        </div>
      </header>

      {/* Executive Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Card 1: Available Distributable Pool */}
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(239, 65, 35, 0.05) 0%, rgba(245, 158, 11, 0.08) 100%)', borderRadius: '20px', border: '1.5px solid rgba(239, 65, 35, 0.25)', boxShadow: '0 4px 12px rgba(239, 65, 35, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Distributable Profit Pool
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: availablePoolAmount > 0 ? '#10b981' : '#64748b', color: '#fff', fontWeight: '800' }}>
              {availablePoolAmount > 0 ? 'READY' : 'SETTLED'}
            </span>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, color: 'var(--primary)' }}>
            ₹{availablePoolAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Net Platform Profit (3% Take + 4% Penalty • Excludes 2% Razorpay Fee)
          </p>
        </div>

        {/* Card 2: Cumulative Platform Deductions */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
            Total Platform Deductions
          </span>
          <h2 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
            ₹{(poolInfo?.totalPlatformDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            2% PG (₹{(poolInfo?.totalGatewayFee || 0).toFixed(2)}) + 3% Profit (₹{(poolInfo?.totalPlatformProfit || 0).toFixed(2)}) + 4% Penalty (₹{(poolInfo?.totalCancellationPenalty || 0).toFixed(2)})
          </p>
        </div>

        {/* Card 3: Cap Table Equity Status */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cap Table Allocation
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: capTable.isFullyAllocated ? '#10b981' : '#3b82f6', color: '#fff', fontWeight: '800' }}>
              {capTable.isFullyAllocated ? '100% ALLOCATED' : `${capTable.totalAllocatedEquity}% ALLOCATED`}
            </span>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, color: '#3b82f6' }}>
            {capTable.totalAllocatedEquity}%
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {capTable.treasuryReserveEquity > 0 ? `Unallocated ${capTable.treasuryReserveEquity}% stays in Company Treasury` : 'All equity distributed to partners'}
          </p>
        </div>

        {/* Card 4: Historical Distributions */}
        <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
            Settled to Date
          </span>
          <h2 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, color: '#10b981' }}>
            ₹{(poolInfo?.previouslyDistributed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
            Cleared across {poolInfo?.previousRunsCount || 0} distribution runs with UTRs
          </p>
        </div>
      </div>

      {/* Visual Cap Table Allocation Progress Bar */}
      <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} color="var(--primary)" /> Equity Distribution Cap Table
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
            {partners.filter(p => p.status === 'ACTIVE').length} Active Partners • {capTable.totalAllocatedEquity}% Claimed
          </span>
        </div>

        {/* Progress Bar Track */}
        <div style={{ height: '14px', width: '100%', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', display: 'flex', marginBottom: '1rem' }}>
          {partners.filter(p => p.status === 'ACTIVE').map((p, idx) => {
            const colors = ['#ef4123', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
            const color = colors[idx % colors.length];
            return (
              <div
                key={p.id}
                title={`${p.name} (${p.equityShare}%)`}
                style={{ width: `${p.equityShare}%`, background: color, height: '100%', transition: 'width 0.4s ease' }}
              />
            );
          })}
          {capTable.treasuryReserveEquity > 0 && (
            <div
              title={`Company Treasury Reserve (${capTable.treasuryReserveEquity}%)`}
              style={{ width: `${capTable.treasuryReserveEquity}%`, background: '#cbd5e1', height: '100%', transition: 'width 0.4s ease' }}
            />
          )}
        </div>

        {/* Badges Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {partners.filter(p => p.status === 'ACTIVE').map((p, idx) => {
            const colors = ['#ef4123', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
            const color = colors[idx % colors.length];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '700' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                <span>{p.name}: <strong style={{ color: 'var(--text-primary)' }}>{p.equityShare}%</strong></span>
              </div>
            );
          })}
          {capTable.treasuryReserveEquity > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '700' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Company Treasury: <strong>{capTable.treasuryReserveEquity}%</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveSubTab('partners')}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
            background: activeSubTab === 'partners' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'partners' ? '#fff' : 'var(--text-secondary)',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Users size={16} /> Partner Roster ({partners.length})
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
            background: activeSubTab === 'history' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'history' ? '#fff' : 'var(--text-secondary)',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <FileText size={16} /> Distribution History & UTRs ({historyRuns.length})
        </button>
      </div>

      {/* TAB 1: PARTNERS ROSTER */}
      {activeSubTab === 'partners' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {partners.map((partner, idx) => {
            const colors = ['#ef4123', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
            const accentColor = colors[idx % colors.length];

            return (
              <div 
                key={partner.id} 
                style={{ 
                  background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', 
                  padding: '1.5rem', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: accentColor }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                      {partner.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: '700' }}>
                        {partner.role}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', background: partner.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : '#f1f5f9', color: partner.status === 'ACTIVE' ? '#10b981' : '#64748b', fontWeight: '800' }}>
                        {partner.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: accentColor }}>
                      {partner.equityShare}%
                    </span>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>EQUITY SHARE</span>
                  </div>
                </div>

                {/* Live Dividend and Lifetime Earnings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Live Dividend</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#10b981', marginTop: '0.15rem' }}>
                      ₹{partner.liveUnclaimedDividend.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>From current pool</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Lifetime Paid</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      ₹{partner.totalPaid.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{partner.payoutsCount} runs</span>
                  </div>
                </div>

                {/* Payment Credentials */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: '600' }}>UPI ID:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                        {partner.upiId || 'Not set'}
                      </span>
                      {partner.upiId && (
                        <button
                          onClick={() => handleCopy(partner.upiId, partner.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedId === partner.id ? '#10b981' : 'var(--text-secondary)' }}
                          title="Copy UPI"
                        >
                          {copiedId === partner.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {partner.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '600' }}>Email:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{partner.email}</span>
                    </div>
                  )}
                  {partner.phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600' }}>Phone:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{partner.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                  <button
                    onClick={() => openEditModal(partner)}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)',
                      background: '#ffffff', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeletePartner(partner)}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fee2e2',
                      background: '#fff5f5', color: '#ef4444', fontWeight: '700', fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* If Cap table has unallocated equity, show Treasury Card */}
          {capTable.treasuryReserveEquity > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#475569', fontWeight: '800' }}>
                    COMPANY TREASURY
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#64748b' }}>
                    {capTable.treasuryReserveEquity}%
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', margin: '0 0 0.4rem 0', color: '#334155' }}>
                  UniVerse Platform Reserve
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Unallocated equity automatically vests in the platform treasury fund for tech maintenance, servers, and expansion.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', background: '#ffffff', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Treasury Live Share</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#475569' }}>
                  ₹{(((availablePoolAmount * capTable.treasuryReserveEquity) / 100) || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {partners.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)' }}>
              <Users size={48} color="var(--primary)" style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>No Partners Configured Yet</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.875rem' }}>
                Add your founding partners, investors, or co-founders with their equity shares to automatically distribute net platform profits.
              </p>
              <button
                onClick={openAddModal}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                  background: 'var(--primary)', color: '#ffffff', fontWeight: '800', fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                + Add First Partner
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISTRIBUTION HISTORY */}
      {activeSubTab === 'history' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0 }}>Settlement Runs Ledger</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Immutable historical snapshots locked with banking UTRs.</p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary)', background: 'rgba(239, 65, 35, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '8px' }}>
              {historyRuns.length} Settled Runs
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Run Details</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Gross Profit</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Reserve</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Net Distributed</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Partner Payouts & UTRs</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRuns.map(run => (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{run.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        ID: {run.id} • {new Date(run.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {run.notes && <div style={{ fontSize: '0.7rem', color: '#6366f1', marginTop: '0.2rem' }}>Note: {run.notes}</div>}
                    </td>
                    <td style={{ padding: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      ₹{run.grossPlatformProfit.toFixed(2)}
                    </td>
                    <td style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {run.reservePercentage > 0 ? `₹${run.reserveAmount.toFixed(2)} (${run.reservePercentage}%)` : '₹0 (0%)'}
                    </td>
                    <td style={{ padding: '1.25rem', fontWeight: '900', color: '#10b981', fontSize: '1rem' }}>
                      ₹{run.netDistributableAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(run.payouts || []).map(p => (
                          <div key={p.id} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{p.partnerName} ({p.sharePercentage}%):</span>
                            <span style={{ color: '#10b981', fontWeight: '800' }}>₹{p.amount.toFixed(2)}</span>
                            {p.utrNumber && (
                              <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                                UTR: {p.utrNumber}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                        <CheckCircle size={13} /> {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {historyRuns.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No distribution runs have been executed yet. Click "Run Distribution" to initiate the first payout.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT PARTNER MODAL */}
      {(showAddModal || showEditModal) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 0.5rem 0' }}>
              {editingPartner ? 'Edit Partner Details' : 'Add Equity Partner'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 1.5rem 0' }}>
              {editingPartner ? 'Update partner equity or payment credentials.' : 'Assign equity stake and UPI credentials for automated dividend settlement.'}
            </p>

            <form onSubmit={handleSavePartner}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>FULL NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>ROLE *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem', background: '#fff' }}
                  >
                    <option value="Co-Founder">Co-Founder</option>
                    <option value="Managing Partner">Managing Partner</option>
                    <option value="Angel Investor">Angel Investor</option>
                    <option value="Operating Partner">Operating Partner</option>
                    <option value="Advisor">Advisor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    EQUITY SHARE (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxAvailableEquity}
                    required
                    placeholder={`Max: ${maxAvailableEquity.toFixed(2)}%`}
                    value={formData.equityShare}
                    onChange={e => setFormData({ ...formData, equityShare: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                    Available: {maxAvailableEquity.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>UPI ID (PRIMARY PAYOUT)</label>
                <input
                  type="text"
                  placeholder="e.g. alex@okhdfcbank"
                  value={formData.upiId}
                  onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>EMAIL</label>
                  <input
                    type="email"
                    placeholder="partner@universe.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>PHONE</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {editingPartner && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>PARTNER STATUS</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)', fontSize: '0.875rem', background: '#fff' }}
                  >
                    <option value="ACTIVE">ACTIVE (Participates in profit distribution)</option>
                    <option value="INACTIVE">INACTIVE (Temporarily paused from pool)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--surface-border)', background: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  {editingPartner ? 'Save Changes' : 'Confirm Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISTRIBUTION RUN WIZARD MODAL */}
      {showDistributeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '800' }}>
                  STEP 1 OF 2
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0.4rem 0 0.2rem 0' }}>Execute Profit Distribution</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Review zero-leakage preview, set banking UTRs, and lock into ledger.</p>
              </div>
              <button
                onClick={() => setShowDistributeModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {/* Wizard Config */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.25rem', border: '1px solid var(--surface-border)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>DISTRIBUTION TITLE</label>
                <input
                  type="text"
                  value={distributeConfig.title}
                  onChange={e => setDistributeConfig({ ...distributeConfig, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>PROFIT POOL MODE</label>
                  <select
                    value={distributeConfig.poolMode}
                    onChange={e => {
                      const newMode = e.target.value;
                      setDistributeConfig({ ...distributeConfig, poolMode: newMode });
                      fetchPreview(newMode, distributeConfig.reservePercentage);
                    }}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="total_deductions">Total Deductions (₹{(poolInfo?.availableTotalDeductionsPool || 0).toFixed(2)})</option>
                    <option value="net_profit">Net Platform Margin (₹{(poolInfo?.availableNetProfitPool || 0).toFixed(2)})</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>COMPANY RESERVE (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={distributeConfig.reservePercentage}
                    onChange={e => {
                      const pct = parseFloat(e.target.value) || 0;
                      setDistributeConfig({ ...distributeConfig, reservePercentage: pct });
                      fetchPreview(distributeConfig.poolMode, pct);
                    }}
                    placeholder="e.g. 0% or 10%"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Real-time Math Preview Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Payout Matrix Preview
                </h4>
                {previewData && (
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981' }}>
                    Total Distributable: ₹{previewData.netDistributable.toFixed(2)}
                  </span>
                )}
              </div>

              {previewLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto', display: 'block' }} />
                </div>
              ) : (
                <div style={{ border: '1px solid var(--surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-border)' }}>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Partner</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Share</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Dividend</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Bank UTR / Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData?.partnerAllocations?.map((p, idx) => (
                        <tr key={p.partnerId} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: '800' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.upiId || 'No UPI'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>
                            {p.equityShare}%
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '900', color: '#10b981' }}>
                            ₹{p.amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input
                              type="text"
                              value={distributeConfig.partnerPayouts.find(item => item.partnerId === p.partnerId)?.utrNumber || ''}
                              onChange={e => {
                                const newUtr = e.target.value;
                                setDistributeConfig(prev => ({
                                  ...prev,
                                  partnerPayouts: prev.partnerPayouts.map(item =>
                                    item.partnerId === p.partnerId ? { ...item, utrNumber: newUtr } : item
                                  )
                                }));
                              }}
                              placeholder="Enter UTR / Ref"
                              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--surface-border)', fontSize: '0.75rem' }}
                            />
                          </td>
                        </tr>
                      ))}
                      {previewData?.treasuryRemainder > 0 && (
                        <tr style={{ background: '#f8fafc', fontWeight: '700', color: '#64748b' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>Company Treasury Float</td>
                          <td style={{ padding: '0.75rem 1rem' }}>Reserve</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>₹{previewData.treasuryRemainder.toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.7rem' }}>Retained in Platform</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>SETTLEMENT NOTES (OPTIONAL)</label>
              <textarea
                value={distributeConfig.notes}
                onChange={e => setDistributeConfig({ ...distributeConfig, notes: e.target.value })}
                placeholder="e.g. Paid via ICICI Corporate Banking to partner accounts."
                rows="2"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowDistributeModal(false)}
                disabled={executing}
                style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--surface-border)', background: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDistribution}
                disabled={executing || previewLoading}
                style={{
                  padding: '0.75rem 1.75rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4123 0%, #ea580c 100%)',
                  color: '#fff', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
                }}
              >
                {executing ? <RefreshCw size={16} className="spin" /> : <Lock size={16} />}
                {executing ? 'Freezing & Locking Run...' : 'Execute & Lock Payout Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA EQUITY SECURITY AUTHORIZATION MODAL */}
      {showOtpModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '460px',
            padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', textAlign: 'center',
            border: '1px solid var(--surface-border)'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(239, 65, 35, 0.1)', color: '#ef4123',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Shield size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Cap Table Security Verification
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
              Modifying partner equity, shares, or profit distributions requires 2FA authorization.
              A 6-digit verification code has been dispatched to:
              <br />
              <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>parthsharma240404@gmail.com</strong>
              <br />
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>📱 & WhatsApp (+91 7985397373)</span>
            </p>

            {otpSentMessage && (
              <div style={{
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.8rem', fontWeight: '600',
                marginBottom: '1.25rem'
              }}>
                ✓ {otpSentMessage}
              </div>
            )}

            {otpError && (
              <div style={{
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.8rem', fontWeight: '600',
                marginBottom: '1.25rem'
              }}>
                ⚠️ {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Enter 6-Digit Authorization Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  style={{
                    width: '100%', textAlign: 'center', fontSize: '1.8rem', fontWeight: '900',
                    letterSpacing: '0.3em', padding: '0.75rem', borderRadius: '12px',
                    border: '2px solid var(--primary)', outline: 'none', background: '#f8fafc',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowOtpModal(false); setPendingAction(null); }}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: '12px',
                    border: '1px solid var(--surface-border)', background: '#fff',
                    fontWeight: '700', cursor: 'pointer', color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  style={{
                    flex: 2, padding: '0.85rem', borderRadius: '12px',
                    border: 'none', background: 'var(--primary)', color: '#fff',
                    fontWeight: '800', cursor: (otpLoading || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                    opacity: (otpLoading || otpCode.length !== 6) ? 0.6 : 1
                  }}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Unlock'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                disabled={otpLoading}
                onClick={() => requestEquityOtp()}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Resend verification code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPartnerEquity;
