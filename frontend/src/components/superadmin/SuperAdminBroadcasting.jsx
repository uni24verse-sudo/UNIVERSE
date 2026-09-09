import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, 
  Smartphone, 
  Mail, 
  Users, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Eye,
  ShieldCheck,
  Zap,
  TrendingUp,
  X
} from 'lucide-react';

const SuperAdminBroadcasting = ({ token, socket }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [channelData, setChannelData] = useState({ whatsapp: { slots: [] }, email: { accounts: [] } });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetAudience, setTargetAudience] = useState('Specific Phone Numbers / Custom');
  const [customNumbersInput, setCustomNumbersInput] = useState('');
  const [dispatching, setDispatching] = useState(false);
  
  // Live Dispatch Progress State
  const [liveProgress, setLiveProgress] = useState(null); // { campaignId, sentCount, deliveredCount, failedCount, total, progressPercent }

  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, chanRes, templRes] = await Promise.all([
        axios.get(`${apiUrl}/api/super-admin/broadcasting/campaigns`, { headers }),
        axios.get(`${apiUrl}/api/super-admin/channels/summary`, { headers }),
        axios.get(`${apiUrl}/api/super-admin/master-templates`, { headers })
      ]);

      setCampaigns(campRes.data);
      if (chanRes.data.success) {
        setChannelData(chanRes.data);
      }
      setTemplates(templRes.data);

      // Auto select first connected account & first template
      if (chanRes.data.success) {
        const firstConnected = chanRes.data.whatsapp.slots.find(s => s.status === 'connected');
        if (firstConnected) setSelectedAccountId(firstConnected._id);
      }
      if (templRes.data.length > 0) {
        setSelectedTemplateId(templRes.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load broadcasting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Socket listener for live broadcast progress
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (progress) => {
      setLiveProgress(progress);
      if (progress.progressPercent >= 100 || progress.status === 'Completed') {
        setTimeout(() => {
          fetchData();
          setDispatching(false);
        }, 1500);
      }
    };

    socket.on('superadmin:broadcast_progress', handleProgress);
    return () => socket.off('superadmin:broadcast_progress', handleProgress);
  }, [socket]);

  // Active polling fallback while dispatching is true
  useEffect(() => {
    if (!dispatching || !liveProgress?.campaignId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/super-admin/broadcasting/campaigns/${liveProgress.campaignId}/status`, { headers });
        if (res.data) {
          setLiveProgress(prev => ({
            ...prev,
            ...res.data.stats,
            total: res.data.stats?.totalRecipients || prev.total,
            progressPercent: res.data.progressPercent
          }));

          if (res.data.status === 'Completed' || res.data.progressPercent >= 100) {
            clearInterval(pollInterval);
            setTimeout(() => {
              fetchData();
              setDispatching(false);
            }, 1200);
          }
        }
      } catch (e) {
        // Silent poll error
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [dispatching, liveProgress?.campaignId]);

  // Helper to render WhatsApp Markdown (*bold*, _italic_, links)
  const renderWhatsAppFormattedText = (rawText) => {
    if (!rawText) return null;

    return rawText.split('\n').map((line, lineIdx) => {
      // Split by *bold*, _italic_, and URLs
      const parts = line.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+)/g);

      return (
        <div key={lineIdx} style={{ minHeight: '1.3em', marginBottom: line === '' ? '0.5em' : '0' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return <strong key={pIdx} style={{ color: '#111b21', fontWeight: '800' }}>{part.slice(1, -1)}</strong>;
            }
            if (part.startsWith('_') && part.endsWith('_')) {
              return <em key={pIdx} style={{ fontStyle: 'italic', color: '#475569' }}>{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('http://') || part.startsWith('https://')) {
              return <a key={pIdx} href={part} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>{part}</a>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  // Filter accounts and templates based on selected channel
  const availableAccounts = channel === 'whatsapp' 
    ? channelData.whatsapp.slots.filter(s => s.status === 'connected')
    : channelData.email.accounts;

  const availableTemplates = templates.filter(t => t.channel === channel);
  const selectedTemplate = templates.find(t => t._id === selectedTemplateId);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) {
      return alert(`Please select an active ${channel === 'whatsapp' ? 'WhatsApp device' : 'Email account'}.`);
    }
    if (!selectedTemplateId) {
      return alert('Please select a Master Template.');
    }

    setDispatching(true);
    setLiveProgress({ total: 1, sentCount: 0, deliveredCount: 0, failedCount: 0, progressPercent: 0 });

    try {
      const customNumbers = customNumbersInput.split(',').map(n => n.trim()).filter(Boolean);

      const payload = {
        name: name || `Broadcast ${new Date().toLocaleDateString('en-IN')}`,
        channel,
        channelAccountId: selectedAccountId,
        masterTemplateId: selectedTemplateId,
        targetAudience,
        customNumbers
      };

      const res = await axios.post(`${apiUrl}/api/super-admin/broadcasting/dispatch`, payload, { headers });
      if (res.data.success) {
        setName('');
        setLiveProgress(prev => ({
          ...prev,
          campaignId: res.data.campaignId,
          total: res.data.totalRecipients || 1
        }));
      }
    } catch (err) {
      alert('Broadcast failed to initiate: ' + (err.response?.data?.message || err.message));
      setDispatching(false);
      setLiveProgress(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 65, 35, 0.08)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          <Zap size={14} /> Multi-Device Campus Messaging
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>Broadcasting Studio</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
          Deploy announcements, flash deals, and campus updates across student & vendor segments via connected WhatsApp devices & Email.
        </p>
      </header>

      {/* Live Dispatch Progress Banner (Clean Enterprise Design) */}
      {liveProgress && (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.4rem 1.6rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          border: '1.5px solid #e2e8f0',
          position: 'relative'
        }}>
          <button
            onClick={() => setLiveProgress(null)}
            title="Dismiss Monitor"
            style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <X size={14} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', paddingRight: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <RefreshCw size={18} className={dispatching ? "spin" : ""} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>
                  {dispatching ? 'Broadcast Dispatch in Progress' : (liveProgress.failedCount > 0 ? 'Broadcast Dispatch Finished with Errors' : 'Broadcast Dispatch Completed')}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Anti-ban pacing active • Sending via AWS EC2
                </p>
              </div>
            </div>
            
            <div style={{
              fontSize: '0.82rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px',
              background: liveProgress.failedCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: liveProgress.failedCount > 0 ? '#dc2626' : '#059669'
            }}>
              {liveProgress.progressPercent || 0}%
            </div>
          </div>

          {/* Progress Track */}
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', marginBottom: '1.1rem' }}>
            <div style={{
              width: `${liveProgress.progressPercent || 0}%`,
              height: '100%',
              background: liveProgress.failedCount > 0 ? 'linear-gradient(90deg, #ef4123, #ef4444)' : 'linear-gradient(90deg, #ef4123, #10b981)',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* 4 Clean Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Total</span>
              <p style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>{liveProgress.total || 0}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Processed</span>
              <p style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: '900', color: '#0284c7' }}>{liveProgress.sentCount || 0}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Delivered</span>
              <p style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: '900', color: '#10b981' }}>{liveProgress.deliveredCount || 0}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Failed</span>
              <p style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: '900', color: liveProgress.failedCount > 0 ? '#ef4444' : '#64748b' }}>{liveProgress.failedCount || 0}</p>
            </div>
          </div>

          {/* Diagnostic Error Note if Failed */}
          {liveProgress.lastError && (
            <div style={{
              marginTop: '0.9rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>⚠️ <strong>Dispatch Diagnostics:</strong> {liveProgress.lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* COMPOSER GRID: Form on Left, Live Simulator on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        {/* Left: Campaign Configuration Form */}
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>
            Compose Broadcast
          </h3>

          <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Campaign Name */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Campaign Name</label>
              <input 
                type="text"
                placeholder="e.g. Saturday Evening Flash Deals"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Channel Selection */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Delivery Channel</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setChannel('whatsapp'); setSelectedAccountId(''); }}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px solid',
                    borderColor: channel === 'whatsapp' ? '#25D366' : '#e2e8f0',
                    background: channel === 'whatsapp' ? 'rgba(37, 211, 102, 0.08)' : '#ffffff',
                    color: channel === 'whatsapp' ? '#16a34a' : '#64748b',
                    fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Smartphone size={16} /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => { setChannel('email'); setSelectedAccountId(''); }}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px solid',
                    borderColor: channel === 'email' ? '#ea4335' : '#e2e8f0',
                    background: channel === 'email' ? 'rgba(234, 67, 53, 0.08)' : '#ffffff',
                    color: channel === 'email' ? '#ea4335' : '#64748b',
                    fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>

            {/* SENDER DEVICE SELECTOR */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Sender Account / Device
              </label>
              {availableAccounts.length === 0 ? (
                <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700' }}>
                  No active {channel === 'whatsapp' ? 'WhatsApp devices connected. Go to Channel Hub to pair.' : 'Email senders configured.'}
                </div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="">-- Select Sender Device --</option>
                  {availableAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {channel === 'whatsapp' 
                        ? `[Slot #${acc.slotIndex}] ${acc.nickname} (+${acc.phoneNumber})` 
                        : `${acc.nickname} <${acc.emailConfig?.fromEmail}>`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* MASTER TEMPLATE PICKER */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Master Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">-- Select Master Template --</option>
                {availableTemplates.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            {/* TARGET AUDIENCE */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="Specific Phone Numbers / Custom">Specific Test Number (Safe Mode)</option>
                <option value="All Students">All Registered Students</option>
                <option value="All Vendors">All Food Vendors</option>
                <option value="Campus Zone Users">Campus Food Court Active Users</option>
              </select>
            </div>

            {/* Custom Numbers input if chosen */}
            {targetAudience === 'Specific Phone Numbers / Custom' && (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Target Phone Numbers (Comma Separated)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 9876543210, 9123456789"
                  value={customNumbersInput}
                  onChange={e => setCustomNumbersInput(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Enter destination mobile numbers with or without country code.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={dispatching || availableAccounts.length === 0}
              style={{
                marginTop: '0.5rem', padding: '1rem', background: 'linear-gradient(135deg, #ef4123, #ea580c)', color: 'white',
                border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 65, 35, 0.3)', opacity: dispatching ? 0.7 : 1
              }}
            >
              <Send size={18} /> {dispatching ? 'Dispatching...' : 'Dispatch Broadcast Now'}
            </button>
          </form>
        </div>

        {/* Right: Live Simulated Recipient Preview */}
        <div>
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
                Live Message Preview
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Dynamic Tag Simulator
              </span>
            </div>

            {selectedTemplate ? (
              channel === 'whatsapp' ? (
                /* WhatsApp Bubble Simulation */
                <div style={{ background: '#e5ddd5', backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 1px)', backgroundSize: '16px 16px', padding: '1.5rem', borderRadius: '20px' }}>
                  <div style={{ background: '#ffffff', borderRadius: '14px', borderTopLeftRadius: '4px', padding: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    {selectedTemplate.headerType === 'IMAGE' && selectedTemplate.headerMediaUrl && (
                      <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                        <img src={selectedTemplate.headerMediaUrl} alt="Header Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* WhatsApp Body Formatted */}
                    <div style={{ fontSize: '0.875rem', color: '#111b21', lineHeight: 1.5 }}>
                      {renderWhatsAppFormattedText(selectedTemplate.body)}
                    </div>

                    {/* Formatted Actions / Buttons inside bubble */}
                    {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                      <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                        {selectedTemplate.buttons.map((btn, idx) => (
                          <div key={idx} style={{ color: '#00a884', fontWeight: '700' }}>
                            {btn.type === 'URL' && <span>🔗 <u>{btn.text}</u>: <a href={btn.value} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{btn.value}</a></span>}
                            {btn.type === 'PHONE_NUMBER' && <span>📞 {btn.text}: {btn.value}</span>}
                            {btn.type === 'QUICK_REPLY' && <span>👉 [ {btn.text} ]</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#8696a0', fontStyle: 'italic' }}>{selectedTemplate.footer}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>Just now</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Email Preview Simulation */
                <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.5rem', color: '#f8fafc' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Subject:</span>
                  <h4 style={{ margin: '4px 0 1rem 0', fontSize: '1rem', fontWeight: '900', color: '#f8fafc' }}>
                    {selectedTemplate.subject || selectedTemplate.name}
                  </h4>

                  {selectedTemplate.emailHeroImageUrl && (
                    <div style={{ width: '100%', height: '140px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
                      <img src={selectedTemplate.emailHeroImageUrl} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
                    {selectedTemplate.body}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '8px 24px', background: '#ef4123', color: 'white', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '800' }}>
                      {selectedTemplate.emailCtaText || 'Open App'}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                <Layers size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Select a Master Template on the left to preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAST CAMPAIGNS LOG */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>
          Broadcast Dispatch History
        </h3>

        {campaigns.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', margin: 0 }}>No broadcast campaigns dispatched yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Campaign</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Channel / Sender</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Audience</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Stats</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: '800', color: '#0f172a' }}>{c.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                        {c.channel === 'whatsapp' ? <Smartphone size={14} color="#25D366" /> : <Mail size={14} color="#ea4335" />}
                        {c.channelAccountId?.nickname || 'Default Sender'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{c.targetAudience}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: '#10b981', fontWeight: '800' }}>{c.stats?.deliveredCount || 0}</span> / {c.stats?.totalRecipients || 0}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                        background: c.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 65, 35, 0.15)',
                        color: c.status === 'Completed' ? '#10b981' : '#ef4123'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBroadcasting;
