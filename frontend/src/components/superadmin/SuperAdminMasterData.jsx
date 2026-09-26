import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Database, 
  Users, 
  Search, 
  Download, 
  Upload, 
  Plus, 
  RefreshCw, 
  Smartphone, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Filter, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  ExternalLink,
  Trash2
} from 'lucide-react';

const SuperAdminMasterData = ({ token }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reachabilityFilter, setReachabilityFilter] = useState('all'); // all, whatsapp, email, both
  const [sourceFilter, setSourceFilter] = useState('all'); // all, Customer 360, Upload
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalContacts: 0,
    whatsappReady: 0,
    emailReady: 0,
    bothReady: 0,
    customer360Count: 0,
    uploadedCount: 0
  });

  // Action states
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State: Add Single Contact
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCampus, setNewContactCampus] = useState('Lovely Professional University');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Upload Modal State
  const [uploadFile, setUploadFile] = useState(null);
  const [parsedUploadContacts, setParsedUploadContacts] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessStats, setUploadSuccessStats] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/master-data`, {
        headers,
        params: {
          search,
          page,
          limit: 25,
          reachability: reachabilityFilter,
          source: sourceFilter
        }
      });

      if (res.data.success) {
        setContacts(res.data.contacts || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.pages || 1);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load Master Data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [token, page, reachabilityFilter, sourceFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchMasterData();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Copy Phone Helper
  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const toggleSelectContact = (id) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllContacts = () => {
    const pageContactIds = contacts.map(c => c.id || c._id);
    const allSelected = pageContactIds.length > 0 && pageContactIds.every(id => selectedContactIds.includes(id));
    if (allSelected) {
      setSelectedContactIds(prev => prev.filter(id => !pageContactIds.includes(id)));
    } else {
      setSelectedContactIds(prev => [...new Set([...prev, ...pageContactIds])]);
    }
  };

  const handleDeleteSingleContact = async (contactId, name) => {
    if (!window.confirm(`Are you sure you want to delete contact "${name || contactId}"?`)) return;

    try {
      await axios.delete(`${apiUrl}/api/super-admin/master-data/contact/${contactId}`, { headers });
      setSelectedContactIds(prev => prev.filter(id => id !== contactId));
      fetchMasterData();
      alert('Contact deleted successfully.');
    } catch (err) {
      alert('Failed to delete contact: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContactIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedContactIds.length} selected contacts? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${apiUrl}/api/super-admin/master-data/bulk-delete`, 
        { ids: selectedContactIds }, 
        { headers }
      );
      setSelectedContactIds([]);
      fetchMasterData();
      alert('Selected contacts deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync Customer 360
  const handleSyncCustomer360 = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await axios.post(`${apiUrl}/api/super-admin/master-data/sync-customer360`, {}, { headers });
      if (res.data.success) {
        setSyncMessage(`Synced ${res.data.syncedCount} Customer 360 contacts!`);
        fetchMasterData();
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (err) {
      alert('Sync failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  // Download Sample Template
  const handleDownloadSampleTemplate = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/super-admin/master-data/sample-template`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'universe_master_contacts_template.csv');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      window.open(`${apiUrl}/api/super-admin/master-data/sample-template`, '_blank');
    }
  };

  // Export Master CSV with SuperAdmin Authentication
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/master-data/export`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `universe_master_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error, using fallback query token:', err);
      window.open(`${apiUrl}/api/super-admin/master-data/export?token=${token}`, '_blank');
    } finally {
      setExporting(false);
    }
  };

  // Save Single Contact
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) {
      return alert('Name and Phone Number are required.');
    }

    setSavingContact(true);
    try {
      const res = await axios.post(`${apiUrl}/api/super-admin/master-data/contact`, {
        name: newContactName,
        phone: newContactPhone,
        email: newContactEmail,
        campus: newContactCampus,
        notes: newContactNotes
      }, { headers });

      if (res.data.success) {
        setShowAddModal(false);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactEmail('');
        setNewContactNotes('');
        fetchMasterData();
      }
    } catch (err) {
      alert('Failed to save contact: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingContact(false);
    }
  };

  // Client-side CSV/Text file parser for upload modal
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadError('');
    setUploadSuccessStats(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const rows = text.split(/\r\n|\n/).filter(r => r.trim());
        if (rows.length < 2) {
          setUploadError('File appears empty or does not contain a header row.');
          return;
        }

        const headerLine = rows[0].toLowerCase();
        const headersArr = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        const phoneIdx = headersArr.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
        const nameIdx = headersArr.findIndex(h => h.includes('name'));
        const emailIdx = headersArr.findIndex(h => h.includes('email') || h.includes('mail'));
        const campusIdx = headersArr.findIndex(h => h.includes('campus') || h.includes('college') || h.includes('hostel'));

        if (phoneIdx === -1) {
          setUploadError('CSV must include a "phone" or "mobile" column.');
          return;
        }

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const phone = cols[phoneIdx];
          const name = nameIdx !== -1 ? cols[nameIdx] : 'Recipient';
          const email = emailIdx !== -1 ? cols[emailIdx] : '';
          const campus = campusIdx !== -1 ? cols[campusIdx] : 'UniVerse Campus';

          if (phone && phone.replace(/\D/g, '').length >= 7) {
            parsed.push({ phone, name: name || 'Recipient', email: email || '', campus: campus || 'UniVerse Campus' });
          }
        }

        if (parsed.length === 0) {
          setUploadError('No valid contacts with phone numbers found.');
        } else {
          setParsedUploadContacts(parsed);
        }
      } catch (err) {
        setUploadError('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Submit Bulk Upload
  const handleBulkUploadSubmit = async () => {
    if (parsedUploadContacts.length === 0) return;
    setUploading(true);
    setUploadError('');

    try {
      const res = await axios.post(`${apiUrl}/api/super-admin/master-data/upload`, {
        contacts: parsedUploadContacts,
        sourceLabel: `CSV Upload: ${uploadFile?.name || 'Dataset'}`
      }, { headers });

      if (res.data.success) {
        setUploadSuccessStats(res.data.stats);
        fetchMasterData();
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            <ShieldCheck size={14} /> SuperAdmin Exclusive • De-Duplicated Single Source of Truth
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Master Audience & Data Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
            Central repository of all campus members, customer 360 profiles, and uploaded audiences. Automatically deduplicated on unique phone numbers.
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncCustomer360}
            disabled={syncing}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <RefreshCw size={15} className={syncing ? "spin" : ""} color="#6366f1" />
            {syncing ? 'Syncing...' : 'Sync Customer 360'}
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <Upload size={15} color="#059669" />
            Upload Document
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: exporting ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <Download size={15} color="#0284c7" className={exporting ? "spin" : ""} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4123, #ea580c)',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
            }}
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </header>

      {/* Sync Success Notification */}
      {syncMessage && (
        <div style={{
          padding: '0.9rem 1.2rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          color: '#059669',
          fontWeight: '700',
          fontSize: '0.88rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} /> {syncMessage}
        </div>
      )}

      {/* 6 Key Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <Database size={15} color="#6366f1" /> Total Contacts
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>
            {summary.totalContacts.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>100% deduplicated</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <Smartphone size={15} color="#25D366" /> WhatsApp Ready
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>
            {summary.whatsappReady.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Valid Mobile Number</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <Mail size={15} color="#ea4335" /> Email Ready
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>
            {summary.emailReady.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Verified Email Address</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <Sparkles size={15} color="#8b5cf6" /> Both Reachable
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#8b5cf6' }}>
            {summary.bothReady.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Omnichannel Reach</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <Users size={15} color="#f59e0b" /> Customer 360
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>
            {summary.customer360Count.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Campus Food App</span>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--surface-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
            <FileText size={15} color="#0284c7" /> Uploaded Datasets
          </div>
          <p style={{ margin: 0, fontSize: '1.85rem', fontWeight: '900', color: '#0f172a' }}>
            {summary.uploadedCount.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>CSV / Excel Sourced</span>
        </div>
      </div>

      {/* Main Card with Search, Filter & Data Table */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        
        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search by name, phone (+91), email, or campus..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 1rem 0.7rem 2.6rem',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Reachability:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'whatsapp', label: 'WhatsApp Only' },
              { id: 'email', label: 'Email Only' },
              { id: 'both', label: 'Both' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setReachabilityFilter(f.id); setPage(1); }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '100px',
                  border: '1px solid',
                  borderColor: reachabilityFilter === f.id ? 'var(--primary)' : '#e2e8f0',
                  background: reachabilityFilter === f.id ? 'rgba(239, 65, 35, 0.08)' : '#ffffff',
                  color: reachabilityFilter === f.id ? 'var(--primary)' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: reachabilityFilter === f.id ? '800' : '600',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Source:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'Customer 360', label: 'Customer 360' },
              { id: 'Upload', label: 'Uploaded' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => { setSourceFilter(s.id); setPage(1); }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '100px',
                  border: '1px solid',
                  borderColor: sourceFilter === s.id ? '#6366f1' : '#e2e8f0',
                  background: sourceFilter === s.id ? 'rgba(99, 102, 241, 0.08)' : '#ffffff',
                  color: sourceFilter === s.id ? '#6366f1' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: sourceFilter === s.id ? '800' : '600',
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <RefreshCw size={24} className="spin" color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Fetching Master Contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <Database size={36} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ margin: '0 0 0.25rem', color: '#0f172a', fontSize: '1.1rem', fontWeight: '800' }}>No Contacts Found</h4>
            <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
              No contacts match the current query or filters. Click below to synchronize all Customer 360 records or upload an audience file.
            </p>
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleSyncCustomer360}
                disabled={syncing}
                style={{ padding: '0.65rem 1.2rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.85rem', cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={syncing ? "spin" : ""} />
                {syncing ? 'Syncing...' : 'Sync Customer 360 Now'}
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{ padding: '0.65rem 1.2rem', borderRadius: '10px', background: '#059669', color: '#fff', border: 'none', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Upload Audience File
              </button>
              <button
                onClick={handleDownloadSampleTemplate}
                style={{ padding: '0.65rem 1.2rem', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download Sample CSV
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* BULK ACTION BAR */}
            {selectedContactIds.length > 0 && (
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
                    {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedContactIds([])}
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
                  onClick={handleBulkDeleteContacts}
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
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
                    opacity: isDeleting ? 0.7 : 1
                  }}
                >
                  <Trash2 size={14} />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedContactIds.length})`}
                </button>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)', color: '#64748b' }}>
                    <th style={{ width: '48px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={contacts.length > 0 && contacts.every(c => selectedContactIds.includes(c.id || c._id))}
                        onChange={toggleSelectAllContacts}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                        title="Select All Contacts on this page"
                      />
                    </th>
                    <th style={{ padding: '0.85rem 1rem' }}>Contact Name</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Phone Number</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Email Address</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Campus / Location</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Source</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Activity</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Added Date</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, idx) => (
                    <tr key={c.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Row Checkbox */}
                      <td style={{ width: '48px', padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedContactIds.includes(c.id || c._id)}
                          onChange={() => toggleSelectContact(c.id || c._id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                        />
                      </td>

                      {/* Contact Name */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.85rem'
                          }}>
                            {(c.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: '800', color: '#0f172a', display: 'block' }}>{c.name}</span>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {c.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                            +91 {c.phone}
                          </span>
                          <button
                            onClick={() => handleCopyPhone(c.phone)}
                            title="Copy Phone"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedPhone === c.phone ? '#10b981' : '#94a3b8' }}
                          >
                            {copiedPhone === c.phone ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <span title="WhatsApp Reachable" style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(37, 211, 102, 0.1)', color: '#16a34a', fontSize: '0.65rem', fontWeight: '800' }}>
                            WA
                          </span>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {c.email ? (
                          <span style={{ color: '#0284c7', fontWeight: '600' }}>{c.email}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>No email recorded</span>
                        )}
                      </td>

                      {/* Campus */}
                      <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#94a3b8" />
                          <span>{c.campus || 'UniVerse Campus'}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          background: c.source?.includes('Customer 360') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                          color: c.source?.includes('Customer 360') ? '#b45309' : '#6366f1'
                        }}>
                          {c.source || 'Customer 360'}
                        </span>
                      </td>

                      {/* Activity */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {c.orderCount > 0 ? (
                          <div>
                            <span style={{ fontWeight: '800', color: '#10b981' }}>{c.orderCount} Orders</span>
                            <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>₹{Number(c.totalSpent).toFixed(0)} spent</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Prospect / 0 orders</span>
                        )}
                      </td>

                      {/* Added Date */}
                      <td style={{ padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'Auto-synced'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteSingleContact(c.id || c._id, c.name)}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="Delete Contact"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {contacts.length} of {totalCount.toLocaleString()} total verified contacts
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD SINGLE CONTACT */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>Add Master Contact</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.82rem', color: '#64748b' }}>
              Add a verified recipient to the platform Master Data. Phone number will be checked for deduplication automatically.
            </p>

            <form onSubmit={handleAddContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Full Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Phone Number * (10 Digits)</label>
                <input 
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Email Address (Optional)</label>
                <input 
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Campus / Location</label>
                <input 
                  type="text"
                  value={newContactCampus}
                  onChange={e => setNewContactCampus(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Notes / Segment Tags</label>
                <input 
                  type="text"
                  placeholder="e.g. Faculty, VIP, Food Court Fan"
                  value={newContactNotes}
                  onChange={e => setNewContactNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  {savingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT (CSV / EXCEL / TXT) */}
      {showUploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '540px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button
              onClick={() => { setShowUploadModal(false); setUploadSuccessStats(null); }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '900', color: '#0f172a' }}>Upload Contacts Dataset</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
              Upload any CSV or document containing contacts. All contacts are ingested into Master Data with duplicate elimination by phone number.
            </p>

            {/* Template Download Prompt */}
            <div style={{ padding: '0.9rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', display: 'block' }}>Need the format?</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Columns: name (req), phone (req), email, campus</span>
              </div>
              <button
                onClick={handleDownloadSampleTemplate}
                style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--primary)', background: '#ffffff', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={13} /> Sample CSV
              </button>
            </div>

            {/* File Dropzone */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', marginBottom: '1.25rem', background: '#fcfcfc' }}>
              <Upload size={32} color="#6366f1" style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                Choose a CSV or text document to upload
              </p>
              <input 
                type="file"
                accept=".csv, .txt, .tsv"
                onChange={handleFileChange}
                style={{ fontSize: '0.8rem', color: '#64748b' }}
              />
            </div>

            {uploadError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ⚠️ {uploadError}
              </div>
            )}

            {parsedUploadContacts.length > 0 && !uploadSuccessStats && (
              <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669', display: 'block' }}>
                  ✓ Ready to Ingest: {parsedUploadContacts.length} valid contacts extracted
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Duplicates will be removed or merged automatically by unique phone number.
                </span>
              </div>
            )}

            {uploadSuccessStats && (
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', marginBottom: '1.25rem', textAlign: 'center' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ margin: '0 0 0.25rem', color: '#065f46', fontSize: '1.05rem', fontWeight: '900' }}>Upload Successful!</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                  {uploadSuccessStats.validCount} contacts processed. {uploadSuccessStats.newCount} new contacts inserted, {uploadSuccessStats.updatedCount} existing contacts refreshed, and {uploadSuccessStats.batchDuplicatesRemoved} duplicates filtered out.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowUploadModal(false); setUploadSuccessStats(null); }}
                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
              >
                {uploadSuccessStats ? 'Done' : 'Cancel'}
              </button>
              {!uploadSuccessStats && (
                <button
                  onClick={handleBulkUploadSubmit}
                  disabled={uploading || parsedUploadContacts.length === 0}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '800', cursor: uploading ? 'not-allowed' : 'pointer', opacity: parsedUploadContacts.length === 0 ? 0.6 : 1 }}
                >
                  {uploading ? 'Ingesting...' : `Ingest ${parsedUploadContacts.length} Contacts`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMasterData;
