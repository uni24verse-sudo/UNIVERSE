import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Plus,
  FileText,
  Upload,
  Download,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Radio,
  Sliders,
  Database,
  Filter,
  Search,
  Hash,
  Trash2
} from 'lucide-react';

const SuperAdminBroadcasting = ({ token, socket }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [channelData, setChannelData] = useState({ whatsapp: { slots: [] }, email: { accounts: [] } });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [liveProgress, setLiveProgress] = useState(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topBarTarget, setTopBarTarget] = useState(null);

  useEffect(() => {
    setTopBarTarget(document.getElementById('superadmin-topbar-actions'));
  }, []);

  // Wizard Modal State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 to 7

  // Step 1: Broadcast Identity & Channels
  const [broadcastName, setBroadcastName] = useState('');
  const [broadcastChannel, setBroadcastChannel] = useState('whatsapp'); // 'whatsapp', 'email', 'both'

  // Step 2: Templates
  const [selectedWhatsAppTemplateId, setSelectedWhatsAppTemplateId] = useState('');
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');

  // Step 3: Senders
  const [selectedWhatsAppAccountId, setSelectedWhatsAppAccountId] = useState('');
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('');

  // Step 4: Target Audience (Master Data & Upload)
  const [audienceSource, setAudienceSource] = useState('master_data'); // 'master_data' or 'upload'
  const [mdSource, setMdSource] = useState('all'); // 'all', 'Customer 360', 'Upload', 'Manual'
  const [mdReachability, setMdReachability] = useState('all'); // 'all', 'whatsapp', 'email', 'both'
  const [mdCampus, setMdCampus] = useState('All');
  const [mdSearch, setMdSearch] = useState('');
  const [mdLimit, setMdLimit] = useState(''); // Record count/limit: '', '50', '100', '250', '500'
  const [campusList, setCampusList] = useState([]);
  const [mdPreviewContacts, setMdPreviewContacts] = useState([]);
  const [loadingAudience, setLoadingAudience] = useState(false);
  
  // Upload audience state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedContacts, setParsedContacts] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [estimatedAudienceCount, setEstimatedAudienceCount] = useState(0);

  // Step 5: Pacing & Delivery
  const [pacingMode, setPacingMode] = useState('safe'); // 'safe' (3-5s), 'express' (0.5-1s)
  const [scheduleMode, setScheduleMode] = useState('now'); // 'now', 'later'
  const [scheduledDateTime, setScheduledDateTime] = useState('');

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

      // Pre-select first connected account & template if available
      if (chanRes.data.success) {
        const firstConnected = chanRes.data.whatsapp.slots.find(s => s.status === 'connected');
        if (firstConnected) setSelectedWhatsAppAccountId(firstConnected._id);
        if (chanRes.data.email.accounts.length > 0) {
          setSelectedEmailAccountId(chanRes.data.email.accounts[0]._id);
        }
      }

      const waTpl = templRes.data.find(t => t.channel === 'whatsapp');
      if (waTpl) setSelectedWhatsAppTemplateId(waTpl._id);
      const emTpl = templRes.data.find(t => t.channel === 'email');
      if (emTpl) setSelectedEmailTemplateId(emTpl._id);

      // Load campuses for filter
      axios.get(`${apiUrl}/api/super-admin/locations/public`)
        .then(locRes => {
          if (Array.isArray(locRes.data)) setCampusList(locRes.data);
        })
        .catch(() => {});

    } catch (err) {
      console.error('Failed to load broadcasting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Estimate audience count & sample records from Master Data
  useEffect(() => {
    if (audienceSource === 'master_data') {
      setLoadingAudience(true);
      const params = {
        limit: mdLimit ? parseInt(mdLimit) : 5,
        source: mdSource,
        reachability: mdReachability,
        search: mdSearch
      };
      if (mdCampus !== 'All') params.campus = mdCampus;

      axios.get(`${apiUrl}/api/super-admin/master-data`, { headers, params })
        .then(res => {
          if (res.data.success) {
            const totalMatching = res.data.total || 0;
            const cappedCount = mdLimit ? Math.min(totalMatching, parseInt(mdLimit)) : totalMatching;
            setEstimatedAudienceCount(cappedCount);
            setMdPreviewContacts(res.data.contacts ? res.data.contacts.slice(0, 5) : []);
          }
        })
        .catch(err => {
          console.warn('[Broadcast] Audience estimate error:', err);
        })
        .finally(() => setLoadingAudience(false));
    } else {
      setEstimatedAudienceCount(parsedContacts.length);
    }
  }, [audienceSource, mdSource, mdReachability, mdCampus, mdSearch, mdLimit, parsedContacts.length, token]);

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

  // Polling fallback while dispatching
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

  // Helper to render WhatsApp Markdown (*bold*, _italic_, dynamic tags {{1}}, {{2}}, {{3}}, links)
  const renderWhatsAppFormattedText = (rawText) => {
    if (!rawText) return null;
    return rawText.split('\n').map((line, lineIdx) => {
      // Substitute dynamic variable tags with sample values for realistic preview
      let displayLine = line
        .replace(/\{\{1\}\}/g, 'Aman Kumar')
        .replace(/\{\{name\}\}/gi, 'Aman Kumar')
        .replace(/\{\{2\}\}/g, 'Lovely Professional University')
        .replace(/\{\{detail\}\}/gi, 'Lovely Professional University')
        .replace(/\{\{campus\}\}/gi, 'Lovely Professional University')
        .replace(/\{\{3\}\}/g, 'https://universeorder.co.in')
        .replace(/\{\{link\}\}/gi, 'https://universeorder.co.in')
        .replace(/\{\{code\}\}/gi, 'UNIVERSE20')
        .replace(/\{\{discount_code\}\}/gi, 'UNIVERSE20');

      const parts = displayLine.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+)/g);
      return (
        <div key={lineIdx} style={{ minHeight: '1.3em', marginBottom: displayLine === '' ? '0.5em' : '0' }}>
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

  // Filter templates & senders
  const waTemplates = templates.filter(t => t.channel === 'whatsapp');
  const emTemplates = templates.filter(t => t.channel === 'email');
  const waAccounts = channelData.whatsapp.slots.filter(s => s.status === 'connected');
  const emAccounts = channelData.email.accounts;

  const selectedWaTemplate = templates.find(t => t._id === selectedWhatsAppTemplateId);
  const selectedEmTemplate = templates.find(t => t._id === selectedEmailTemplateId);

  // Parse document upload (CSV/TXT/TSV)
  const handleAudienceFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const rows = text.split(/\r\n|\n/).filter(r => r.trim());
        if (rows.length < 2) {
          setUploadError('Document appears empty or contains no headers.');
          return;
        }

        const headersArr = rows[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const phoneIdx = headersArr.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
        const nameIdx = headersArr.findIndex(h => h.includes('name'));
        const emailIdx = headersArr.findIndex(h => h.includes('email') || h.includes('mail'));
        const campusIdx = headersArr.findIndex(h => h.includes('campus') || h.includes('college'));
        const notesIdx = headersArr.findIndex(h => h.includes('note') || h.includes('detail') || h.includes('remark') || h.includes('tag'));

        if (phoneIdx === -1) {
          setUploadError('Document must contain a "phone" or "mobile" column.');
          return;
        }

        const seenPhones = new Set();
        const extracted = [];

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const rawPhone = cols[phoneIdx] || '';
          let cleanPhone = rawPhone.replace(/\D/g, '');
          if (cleanPhone.startsWith('91') && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);
          if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = cleanPhone.slice(1);

          if (cleanPhone && cleanPhone.length >= 7 && !seenPhones.has(cleanPhone)) {
            seenPhones.add(cleanPhone);
            extracted.push({
              phone: cleanPhone,
              name: nameIdx !== -1 ? (cols[nameIdx] || 'Recipient') : 'Recipient',
              email: emailIdx !== -1 ? (cols[emailIdx] || '') : '',
              campus: campusIdx !== -1 ? (cols[campusIdx] || 'UniVerse Campus') : 'UniVerse Campus',
              notes: notesIdx !== -1 ? (cols[notesIdx] || '') : ''
            });
          }
        }

        if (extracted.length === 0) {
          setUploadError('No valid contacts with phone numbers found in document.');
        } else {
          setParsedContacts(extracted);
        }
      } catch (err) {
        setUploadError('Failed to parse document: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Download Sample Template (Direct blob generation & server fallback)
  const handleDownloadSampleTemplate = () => {
    try {
      const csvData = [
        'name,phone,email,campus,notes',
        'Arjun Mehta,9876543210,arjun.mehta@example.com,Lovely Professional University,Food Court Regular',
        'Priya Sharma,9812345678,priya.sharma@example.com,Lovely Professional University,Hostel Block 4',
        'Sneha Kapoor,9123456789,,Lovely Professional University,Veg Only',
        'Rohan Verma,9988776655,rohan.v@example.com,Lovely Professional University,Pre-Order Member'
      ].join('\n');

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'universe_broadcast_audience_sample.csv');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      window.open(`${apiUrl}/api/super-admin/master-data/sample-template`, '_blank');
    }
  };

  // Submit & Trigger Broadcast
  const handleTriggerBroadcast = async () => {
    // Validation
    if (!broadcastName.trim()) {
      alert('Please enter a campaign name in Step 1.');
      setWizardStep(1);
      return;
    }

    if (broadcastChannel === 'whatsapp' || broadcastChannel === 'both') {
      if (!selectedWhatsAppAccountId) {
        alert('Please select a connected WhatsApp sender account in Step 3.');
        setWizardStep(3);
        return;
      }
      if (!selectedWhatsAppTemplateId) {
        alert('Please select a WhatsApp Master Template in Step 2.');
        setWizardStep(2);
        return;
      }
    }

    if (broadcastChannel === 'email' || broadcastChannel === 'both') {
      if (!selectedEmailAccountId) {
        alert('Please select a configured Email sender account in Step 3.');
        setWizardStep(3);
        return;
      }
      if (!selectedEmailTemplateId) {
        alert('Please select an Email Master Template in Step 2.');
        setWizardStep(2);
        return;
      }
    }

    if (audienceSource === 'upload' && parsedContacts.length === 0) {
      alert('Please upload a document with valid contacts or choose Master Data in Step 4.');
      setWizardStep(4);
      return;
    }

    setDispatching(true);
    setLiveProgress({ total: 1, sentCount: 0, deliveredCount: 0, failedCount: 0, progressPercent: 0 });
    setShowWizard(false);

    try {
      const payload = {
        name: broadcastName.trim(),
        channel: broadcastChannel,
        channelAccountId: broadcastChannel === 'whatsapp' ? selectedWhatsAppAccountId : selectedEmailAccountId,
        masterTemplateId: broadcastChannel === 'whatsapp' ? selectedWhatsAppTemplateId : selectedEmailTemplateId,
        whatsappAccountId: selectedWhatsAppAccountId,
        emailAccountId: selectedEmailAccountId,
        whatsappTemplateId: selectedWhatsAppTemplateId,
        emailTemplateId: selectedEmailTemplateId,
        targetAudience: audienceSource === 'upload' 
          ? `Uploaded Document (${parsedContacts.length} recipients)` 
          : `Master Data (${mdSource === 'all' ? 'All Sources' : mdSource} • ${mdReachability.toUpperCase()})`,
        uploadedAudience: audienceSource === 'upload' ? parsedContacts : null,
        audienceFilters: audienceSource === 'master_data' ? { 
          source: mdSource, 
          reachability: mdReachability, 
          campus: mdCampus, 
          search: mdSearch,
          limit: mdLimit 
        } : null,
        pacing: pacingMode
      };

      const res = await axios.post(`${apiUrl}/api/super-admin/broadcasting/dispatch`, payload, { headers });
      if (res.data.success) {
        setLiveProgress(prev => ({
          ...prev,
          campaignId: res.data.campaignId,
          total: res.data.totalRecipients || 1
        }));
      }
    } catch (err) {
      alert('Broadcast dispatch failed: ' + (err.response?.data?.message || err.message));
      setDispatching(false);
      setLiveProgress(null);
    }
  };

  // Open Wizard Helper
  const handleOpenWizard = () => {
    setWizardStep(1);
    setBroadcastName(`Broadcast ${new Date().toLocaleDateString('en-IN')}`);
    setShowWizard(true);
  };

  const toggleSelectCampaign = (id) => {
    setSelectedCampaignIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCampaigns = () => {
    const allIds = campaigns.map(c => c._id || c.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedCampaignIds.includes(id));
    if (allSelected) {
      setSelectedCampaignIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedCampaignIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleDeleteSingleCampaign = async (campaignId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete broadcast campaign "${name || campaignId}"?`)) return;

    try {
      await axios.delete(`${apiUrl}/api/super-admin/broadcasting/campaigns/${campaignId}`, { headers });
      setSelectedCampaignIds(prev => prev.filter(id => id !== campaignId));
      fetchData();
      alert('Campaign deleted successfully.');
    } catch (err) {
      alert('Failed to delete campaign: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDeleteCampaigns = async () => {
    if (selectedCampaignIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedCampaignIds.length} selected broadcast campaigns? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${apiUrl}/api/super-admin/broadcasting/campaigns/bulk-delete`, 
        { ids: selectedCampaignIds }, 
        { headers }
      );
      setSelectedCampaignIds([]);
      fetchData();
      alert('Selected campaigns deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Topbar Action Portal */}
      {topBarTarget && createPortal(
        <button
          onClick={handleOpenWizard}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.9rem',
            background: 'linear-gradient(135deg, #ef4123, #ea580c)', color: '#ffffff',
            border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.78rem',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(239, 65, 35, 0.25)'
          }}
        >
          <Plus size={14} /> Create Broadcast
        </button>,
        topBarTarget
      )}

      {/* 4 Stat Overview Tiles (Sticky) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#f8fafc',
        paddingTop: '0.25rem',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>
            <Radio size={16} color="var(--primary)" /> Total Broadcasts
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>{campaigns.length}</p>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>Dispatched via Studio</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>
            <Smartphone size={16} color="#25D366" /> Connected WhatsApp Senders
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>{waAccounts.length} / 5</p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active Multi-Device Slots</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>
            <Mail size={16} color="#ea4335" /> Active Email Senders
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>{emAccounts.length}</p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Configured SMTP / SES</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '20px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>
            <FileText size={16} color="#6366f1" /> Master Templates
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>{templates.length}</p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Pre-approved messaging designs</span>
        </div>
      </div>
    </div>

      {/* Live Dispatch Progress Monitor */}
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
                  Pacing active • Multi-device background engine
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

          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', marginBottom: '1.1rem' }}>
            <div style={{
              width: `${liveProgress.progressPercent || 0}%`,
              height: '100%',
              background: liveProgress.failedCount > 0 ? 'linear-gradient(90deg, #ef4123, #ef4444)' : 'linear-gradient(90deg, #ef4123, #10b981)',
              transition: 'width 0.3s ease'
            }} />
          </div>

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
        </div>
      )}

      {/* PAST CAMPAIGNS LOG */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>
          Broadcast Dispatch History
        </h3>

        {campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <Radio size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No broadcast campaigns dispatched yet. Click "Create Broadcast" above to send your first message.</p>
          </div>
        ) : (
          <div>
            {/* BULK ACTION BAR */}
            {selectedCampaignIds.length > 0 && (
              <div style={{
                marginBottom: '1rem',
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
                    {selectedCampaignIds.length} campaign{selectedCampaignIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedCampaignIds([])}
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
                  onClick={handleBulkDeleteCampaigns}
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
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCampaignIds.length})`}
                </button>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)', color: '#64748b' }}>
                    <th style={{ width: '48px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={campaigns.length > 0 && campaigns.every(c => selectedCampaignIds.includes(c._id || c.id))}
                        onChange={toggleSelectAllCampaigns}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e11d48' }}
                      />
                    </th>
                    <th style={{ padding: '0.75rem 1rem' }}>Campaign</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Channel / Sender</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Audience</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Stats</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ width: '80px', padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const cid = c._id || c.id;
                    const isSelected = selectedCampaignIds.includes(cid);
                    return (
                      <tr key={cid} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(254, 242, 242, 0.6)' : 'transparent' }}>
                        <td style={{ width: '48px', padding: '1rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCampaign(cid)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e11d48' }}
                          />
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '800', color: '#0f172a' }}>{c.name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                            {c.channel === 'whatsapp' && <Smartphone size={14} color="#25D366" />}
                            {c.channel === 'email' && <Mail size={14} color="#ea4335" />}
                            {c.channel === 'both' && <Sparkles size={14} color="#8b5cf6" />}
                            <span style={{ textTransform: 'capitalize' }}>{c.channel}</span>
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
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteSingleCampaign(cid, c.name)}
                            title="Delete campaign"
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 7-STEP CREATE BROADCAST MODAL WIZARD */}
      {showWizard && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '840px',
            maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative'
          }}>
            {/* Modal Header & Steps Bar */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Step {wizardStep} of 7
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                  {wizardStep === 1 && '1. Campaign Identity & Delivery Channels'}
                  {wizardStep === 2 && '2. Master Template Selection'}
                  {wizardStep === 3 && '3. Sender Device & Account'}
                  {wizardStep === 4 && '4. Target Audience & Ingestion'}
                  {wizardStep === 5 && '5. Anti-Ban Pacing & Scheduling'}
                  {wizardStep === 6 && '6. Live Dynamic Message Preview'}
                  {wizardStep === 7 && '7. Review & Launch Broadcast'}
                </h2>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div style={{ display: 'flex', background: '#f8fafc', padding: '0.75rem 2rem', borderBottom: '1px solid #e2e8f0', gap: '6px', overflowX: 'auto' }}>
              {[
                { n: 1, label: 'Channels' },
                { n: 2, label: 'Templates' },
                { n: 3, label: 'Senders' },
                { n: 4, label: 'Audience' },
                { n: 5, label: 'Pacing' },
                { n: 6, label: 'Preview' },
                { n: 7, label: 'Launch' }
              ].map(s => (
                <button
                  key={s.n}
                  onClick={() => s.n < wizardStep && setWizardStep(s.n)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '100px',
                    border: 'none',
                    background: wizardStep === s.n ? 'var(--primary)' : (wizardStep > s.n ? '#10b981' : '#e2e8f0'),
                    color: (wizardStep === s.n || wizardStep > s.n) ? '#ffffff' : '#64748b',
                    fontWeight: '800',
                    fontSize: '0.72rem',
                    cursor: s.n < wizardStep ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {wizardStep > s.n ? <Check size={12} /> : s.n} {s.label}
                </button>
              ))}
            </div>

            {/* Modal Body: STEP CONTENT */}
            <div style={{ padding: '2rem', flex: 1 }}>

              {/* STEP 1: IDENTITY & CHANNELS */}
              {wizardStep === 1 && (
                <div>
                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                      Broadcast Campaign Name *
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Campus Night Canteen 20% Flash Deal"
                      value={broadcastName}
                      onChange={e => setBroadcastName(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      Used to identify this campaign in reports and Master Data import logs.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
                      Select Delivery Channel *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {/* WhatsApp Card */}
                      <div 
                        onClick={() => setBroadcastChannel('whatsapp')}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '16px',
                          border: '2px solid',
                          borderColor: broadcastChannel === 'whatsapp' ? '#25D366' : '#e2e8f0',
                          background: broadcastChannel === 'whatsapp' ? 'rgba(37, 211, 102, 0.06)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                          <Smartphone size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>WhatsApp</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Instant phone notification with media & interactive quick buttons
                        </p>
                      </div>

                      {/* Email Card */}
                      <div 
                        onClick={() => setBroadcastChannel('email')}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '16px',
                          border: '2px solid',
                          borderColor: broadcastChannel === 'email' ? '#ea4335' : '#e2e8f0',
                          background: broadcastChannel === 'email' ? 'rgba(234, 67, 53, 0.06)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(234, 67, 53, 0.12)', color: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                          <Mail size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>Email</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Formatted rich HTML newsletters with hero banners & action links
                        </p>
                      </div>

                      {/* Both Card */}
                      <div 
                        onClick={() => setBroadcastChannel('both')}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '16px',
                          border: '2px solid',
                          borderColor: broadcastChannel === 'both' ? '#8b5cf6' : '#e2e8f0',
                          background: broadcastChannel === 'both' ? 'rgba(139, 92, 246, 0.06)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                          <Sparkles size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>Both (Omnichannel)</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Max reach: Dispatches via WhatsApp & Email simultaneously
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: TEMPLATE SELECTION */}
              {wizardStep === 2 && (
                <div>
                  <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    Choose pre-designed templates from your <strong>Master Templates</strong> catalog. Templates will populate dynamic tags like <code>{'{{name}}'}</code> and <code>{'{{campus}}'}</code> automatically.
                  </p>

                  {(broadcastChannel === 'whatsapp' || broadcastChannel === 'both') && (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                        <Smartphone size={16} color="#25D366" /> WhatsApp Master Template *
                      </label>
                      <select
                        value={selectedWhatsAppTemplateId}
                        onChange={e => setSelectedWhatsAppTemplateId(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                      >
                        <option value="">-- Choose WhatsApp Template --</option>
                        {waTemplates.map(t => (
                          <option key={t._id} value={t._id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>

                      {selectedWaTemplate && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>Template Body:</span> {selectedWaTemplate.body}
                        </div>
                      )}
                    </div>
                  )}

                  {(broadcastChannel === 'email' || broadcastChannel === 'both') && (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                        <Mail size={16} color="#ea4335" /> Email Master Template *
                      </label>
                      <select
                        value={selectedEmailTemplateId}
                        onChange={e => setSelectedEmailTemplateId(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                      >
                        <option value="">-- Choose Email Template --</option>
                        {emTemplates.map(t => (
                          <option key={t._id} value={t._id}>
                            {t.name} — {t.subject || 'No Subject'} ({t.category})
                          </option>
                        ))}
                      </select>

                      {selectedEmTemplate && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>Subject:</span> {selectedEmTemplate.subject || selectedEmTemplate.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SENDER CONFIGURATION */}
              {wizardStep === 3 && (
                <div>
                  <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    Select the sending accounts or devices configured on your platform to dispatch this broadcast.
                  </p>

                  {(broadcastChannel === 'whatsapp' || broadcastChannel === 'both') && (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                        <Smartphone size={16} color="#25D366" /> WhatsApp Sender Device *
                      </label>
                      {waAccounts.length === 0 ? (
                        <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', color: '#dc2626', fontSize: '0.82rem', fontWeight: '700' }}>
                          ⚠️ No connected WhatsApp devices found. Please navigate to "Channels & Devices" tab to scan QR.
                        </div>
                      ) : (
                        <select
                          value={selectedWhatsAppAccountId}
                          onChange={e => setSelectedWhatsAppAccountId(e.target.value)}
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                        >
                          <option value="">-- Choose WhatsApp Sender --</option>
                          {waAccounts.map(acc => (
                            <option key={acc._id} value={acc._id}>
                              [Slot #{acc.slotIndex}] {acc.nickname} (+{acc.phoneNumber}) • Active
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {(broadcastChannel === 'email' || broadcastChannel === 'both') && (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                        <Mail size={16} color="#ea4335" /> Email Sender Account *
                      </label>
                      {emAccounts.length === 0 ? (
                        <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', color: '#dc2626', fontSize: '0.82rem', fontWeight: '700' }}>
                          ⚠️ No email accounts configured. Navigate to "Channels & Devices" to setup SMTP / AWS SES.
                        </div>
                      ) : (
                        <select
                          value={selectedEmailAccountId}
                          onChange={e => setSelectedEmailAccountId(e.target.value)}
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                        >
                          <option value="">-- Choose Email Sender --</option>
                          {emAccounts.map(acc => (
                            <option key={acc._id} value={acc._id}>
                              {acc.nickname} &lt;{acc.emailConfig?.fromEmail || acc.email}&gt;
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: TARGET AUDIENCE & INGESTION */}
              {wizardStep === 4 && (
                <div>
                  {/* Audience Source Toggle */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setAudienceSource('master_data')}
                      style={{
                        flex: 1, padding: '1rem', borderRadius: '14px', border: '2px solid',
                        borderColor: audienceSource === 'master_data' ? 'var(--primary)' : '#e2e8f0',
                        background: audienceSource === 'master_data' ? 'rgba(239, 65, 35, 0.06)' : '#ffffff',
                        color: audienceSource === 'master_data' ? 'var(--primary)' : '#64748b',
                        fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      <Database size={18} /> Master Data Contacts
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudienceSource('upload')}
                      style={{
                        flex: 1, padding: '1rem', borderRadius: '14px', border: '2px solid',
                        borderColor: audienceSource === 'upload' ? '#6366f1' : '#e2e8f0',
                        background: audienceSource === 'upload' ? 'rgba(99, 102, 241, 0.06)' : '#ffffff',
                        color: audienceSource === 'upload' ? '#6366f1' : '#64748b',
                        fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      <Upload size={18} /> Upload Document (CSV / Excel / PDF)
                    </button>
                  </div>

                  {audienceSource === 'master_data' ? (
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                        {/* 1. Source Filter */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                            <Database size={13} /> Data Source Filter
                          </label>
                          <select
                            value={mdSource}
                            onChange={e => setMdSource(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                          >
                            <option value="all">All Sources (Complete Master Data)</option>
                            <option value="Customer 360">Customer 360 (App Users & Orders)</option>
                            <option value="Upload">Uploaded Data (CSV & Ingestion Batches)</option>
                            <option value="Manual">Manual Entry</option>
                          </select>
                        </div>

                        {/* 2. Contact & Mail Filter (Reachability) */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                            <Filter size={13} /> Contact & Mail Filter
                          </label>
                          <select
                            value={mdReachability}
                            onChange={e => setMdReachability(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                          >
                            <option value="all">All Contacts</option>
                            <option value="whatsapp">💬 WhatsApp / Contact Phone Ready</option>
                            <option value="email">📧 Email / Mail Ready</option>
                            <option value="both">⚡ Both Phone & Mail Ready</option>
                          </select>
                        </div>

                        {/* 3. Campus Location Filter */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                            Target Campus
                          </label>
                          <select
                            value={mdCampus}
                            onChange={e => setMdCampus(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                          >
                            <option value="All">All Campuses</option>
                            {campusList.map(c => (
                              <option key={c._id || c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Sr.No / Recipient Count Filter */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                            <Hash size={13} /> Sr.No / Volume Limit
                          </label>
                          <select
                            value={mdLimit}
                            onChange={e => setMdLimit(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                          >
                            <option value="">All Matching Contacts</option>
                            <option value="25">First 25 Contacts (Sr.No 1-25)</option>
                            <option value="50">First 50 Contacts (Sr.No 1-50)</option>
                            <option value="100">First 100 Contacts (Sr.No 1-100)</option>
                            <option value="250">First 250 Contacts (Sr.No 1-250)</option>
                            <option value="500">First 500 Contacts (Sr.No 1-500)</option>
                            <option value="1000">First 1000 Contacts (Sr.No 1-1000)</option>
                          </select>
                        </div>
                      </div>

                      {/* Search / Contact & Mail Keyword Filter */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input 
                            type="text"
                            placeholder="Filter by contact name, phone, or mail keyword..."
                            value={mdSearch}
                            onChange={e => setMdSearch(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#fff' }}
                          />
                        </div>
                      </div>

                      {/* Recipient Count Bar */}
                      <div style={{ padding: '0.85rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Database size={15} color="var(--primary)" /> Target Master Data Audience:
                        </span>
                        <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#10b981' }}>
                          {loadingAudience ? 'Calculating...' : `~${estimatedAudienceCount} recipients`}
                        </span>
                      </div>

                      {/* Sample Contacts Live Preview */}
                      {mdPreviewContacts.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Sample Target Contacts Preview (First {mdPreviewContacts.length} recipients):
                          </div>
                          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 10px' }}>Sr.No</th>
                                  <th style={{ padding: '6px 10px' }}>Name</th>
                                  <th style={{ padding: '6px 10px' }}>Contact</th>
                                  <th style={{ padding: '6px 10px' }}>Mail</th>
                                  <th style={{ padding: '6px 10px' }}>Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mdPreviewContacts.map((c, cIdx) => (
                                  <tr key={c._id || c.id || cIdx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 10px', color: '#94a3b8', fontWeight: '700' }}>#{cIdx + 1}</td>
                                    <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>{c.name}</td>
                                    <td style={{ padding: '6px 10px', color: '#25D366', fontWeight: '800' }}>+{c.phone}</td>
                                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{c.email || '—'}</td>
                                    <td style={{ padding: '6px 10px' }}>
                                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: c.source?.includes('Upload') ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 65, 35, 0.1)', color: c.source?.includes('Upload') ? '#6366f1' : 'var(--primary)', fontWeight: '700' }}>
                                        {c.source || 'Master Data'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Download Template Banner */}
                      <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', display: 'block' }}>
                            Download Required CSV/Excel Template
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Fields: <strong>name</strong> (required), <strong>phone</strong> (required), email, campus, notes.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadSampleTemplate}
                          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid var(--primary)', background: '#ffffff', color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={14} /> Download Sample CSV
                        </button>
                      </div>

                      {/* Dropzone */}
                      <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', background: '#fcfcfc', marginBottom: '1rem' }}>
                        <Upload size={32} color="#6366f1" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>
                          Upload Document (.csv, .txt, .tsv)
                        </p>
                        <input 
                          type="file"
                          accept=".csv, .txt, .tsv"
                          onChange={handleAudienceFileUpload}
                          style={{ fontSize: '0.8rem', color: '#64748b' }}
                        />
                      </div>

                      {uploadError && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                          ⚠️ {uploadError}
                        </div>
                      )}

                      {parsedContacts.length > 0 && (
                        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#059669' }}>
                              ✓ {parsedContacts.length} verified unique contacts extracted
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '100px', fontWeight: '800' }}>
                              Auto-Saved to Master Data
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            All contacts from this file will be automatically added to your Master Data page and deduplicated by phone number.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: PACING & DELIVERY */}
              {wizardStep === 5 && (
                <div>
                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
                      Anti-Ban Dispatch Pacing *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div 
                        onClick={() => setPacingMode('safe')}
                        style={{
                          padding: '1.25rem', borderRadius: '16px', border: '2px solid',
                          borderColor: pacingMode === 'safe' ? '#10b981' : '#e2e8f0',
                          background: pacingMode === 'safe' ? 'rgba(16, 185, 129, 0.06)' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '100px', background: '#10b981', color: '#fff', fontSize: '0.68rem', fontWeight: '800', marginBottom: '6px' }}>
                          RECOMMENDED
                        </span>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Standard Safe Pacing</h4>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          3-5s random jitter between messages. Zero risk of account bans or rate-limiting.
                        </p>
                      </div>

                      <div 
                        onClick={() => setPacingMode('express')}
                        style={{
                          padding: '1.25rem', borderRadius: '16px', border: '2px solid',
                          borderColor: pacingMode === 'express' ? '#f59e0b' : '#e2e8f0',
                          background: pacingMode === 'express' ? 'rgba(245, 158, 11, 0.06)' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '100px', background: '#f59e0b', color: '#fff', fontSize: '0.68rem', fontWeight: '800', marginBottom: '6px' }}>
                          FAST
                        </span>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Express Mode</h4>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          0.5-1s per message. Best for campus flash emergency announcements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
                      Dispatch Execution Timing *
                    </label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => setScheduleMode('now')}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1.5px solid',
                          borderColor: scheduleMode === 'now' ? 'var(--primary)' : '#e2e8f0',
                          background: scheduleMode === 'now' ? 'rgba(239, 65, 35, 0.08)' : '#fff',
                          color: scheduleMode === 'now' ? 'var(--primary)' : '#64748b',
                          fontWeight: '800', cursor: 'pointer'
                        }}
                      >
                        Dispatch Immediately
                      </button>

                      <button
                        type="button"
                        onClick={() => setScheduleMode('later')}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1.5px solid',
                          borderColor: scheduleMode === 'later' ? 'var(--primary)' : '#e2e8f0',
                          background: scheduleMode === 'later' ? 'rgba(239, 65, 35, 0.08)' : '#fff',
                          color: scheduleMode === 'later' ? 'var(--primary)' : '#64748b',
                          fontWeight: '800', cursor: 'pointer'
                        }}
                      >
                        Schedule for Later Date
                      </button>
                    </div>

                    {scheduleMode === 'later' && (
                      <input 
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={e => setScheduledDateTime(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: DYNAMIC LIVE PREVIEW */}
              {wizardStep === 6 && (
                <div>
                  <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                    Previewing message appearance across selected channels. Tags are substituted with sample member data.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: broadcastChannel === 'both' ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
                    {/* WhatsApp Bubble Preview */}
                    {(broadcastChannel === 'whatsapp' || broadcastChannel === 'both') && (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#16a34a', marginBottom: '6px' }}>
                          WhatsApp Screen Simulator
                        </span>
                        <div style={{ background: '#e5ddd5', backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 1px)', backgroundSize: '16px 16px', padding: '1.25rem', borderRadius: '18px' }}>
                          <div style={{ background: '#ffffff', borderRadius: '12px', borderTopLeftRadius: '3px', padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                            {selectedWaTemplate?.headerMediaUrl && (
                              <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                <img src={selectedWaTemplate.headerMediaUrl} alt="Header Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}
                            <div style={{ fontSize: '0.85rem', color: '#111b21', lineHeight: 1.5 }}>
                              {renderWhatsAppFormattedText(selectedWaTemplate?.body || 'Hello Rahul, check out today’s flash deals at BH1 Food Court!')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                              <span style={{ fontSize: '0.68rem', color: '#8696a0', fontStyle: 'italic' }}>{selectedWaTemplate?.footer || 'UniVerse Campus'}</span>
                              <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>12:45 PM</span>
                            </div>
                          </div>

                          {/* WhatsApp Interactive Action Buttons Preview */}
                          {selectedWaTemplate?.buttons && selectedWaTemplate.buttons.length > 0 && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {selectedWaTemplate.buttons.map((btn, bIdx) => (
                                <div key={bIdx} style={{
                                  background: '#ffffff',
                                  border: '1px solid #d1d7db',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  textAlign: 'center',
                                  color: '#00a884',
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                  {btn.type === 'URL' && '🔗'}
                                  {btn.type === 'PHONE_NUMBER' && '📞'}
                                  {btn.type === 'OTP' && '🔑'}
                                  {(btn.type === 'QUICK_REPLY' || !btn.type) && '💬'}
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Email Card Preview */}
                    {(broadcastChannel === 'email' || broadcastChannel === 'both') && (
                      <div>
                        <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#ea4335', marginBottom: '6px' }}>
                          Email Inbox Simulator
                        </span>
                        <div style={{ background: '#0f172a', borderRadius: '18px', padding: '1.25rem', color: '#f8fafc' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Subject:</span>
                          <h4 style={{ margin: '2px 0 0.75rem', fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
                            {selectedEmTemplate?.subject || selectedEmTemplate?.name || 'Exclusive Campus Offer for You'}
                          </h4>
                          {selectedEmTemplate?.emailHeroImageUrl && (
                            <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                              <img src={selectedEmTemplate.emailHeroImageUrl} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                            {selectedEmTemplate?.body || 'Hi Rahul, special discount waiting for you at UniVerse.'}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '6px 18px', background: '#ef4123', color: 'white', borderRadius: '100px', fontSize: '0.78rem', fontWeight: '800' }}>
                              {selectedEmTemplate?.emailCtaText || 'Open UniVerse App'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 7: REVIEW & LAUNCH */}
              {wizardStep === 7 && (
                <div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                    Pre-Flight Dispatch Summary
                  </h3>

                  <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Campaign Name:</span>
                      <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{broadcastName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Delivery Channels:</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>{broadcastChannel}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Target Audience:</span>
                      <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                        {audienceSource === 'upload' 
                          ? `Uploaded Document (${parsedContacts.length} contacts)` 
                          : `Master Data (${mdSource === 'all' ? 'All Sources' : mdSource} • ${mdReachability.toUpperCase()})`}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Pacing Mode:</span>
                      <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                        {pacingMode === 'safe' ? 'Standard Safe (3-5s anti-ban)' : 'Express Fast (0.5s)'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Master Data Auto-Sync:</span>
                      <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>Enabled (Deduplicated on Phone)</strong>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(239, 65, 35, 0.08)', borderRadius: '14px', border: '1px solid rgba(239, 65, 35, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="var(--primary)" />
                    <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: '700' }}>
                      Ready to launch. Clicking "Trigger Broadcast Now" will initiate dispatching in background pacing.
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer: Navigation Controls */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: wizardStep === 1 ? 'not-allowed' : 'pointer',
                  opacity: wizardStep === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>

              {wizardStep < 7 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => Math.min(7, s + 1))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(239, 65, 35, 0.25)'
                  }}
                >
                  Next Step <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerBroadcast}
                  disabled={dispatching}
                  style={{
                    padding: '0.85rem 1.75rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <Send size={18} /> Trigger Broadcast Now
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminBroadcasting;
