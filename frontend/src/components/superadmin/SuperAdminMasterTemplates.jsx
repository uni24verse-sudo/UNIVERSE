import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  FileText, 
  Plus, 
  Smartphone, 
  Mail, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  Sparkles, 
  Tag, 
  Image as ImageIcon, 
  Layers,
  X,
  Eye,
  Upload,
  AlertCircle,
  Key,
  MessageSquare,
  Video,
  FileDown,
  CheckCheck,
  RefreshCw,
  Zap,
  Globe
} from 'lucide-react';

const SuperAdminMasterTemplates = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('all'); // 'all' | 'whatsapp' | 'email'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topBarTarget, setTopBarTarget] = useState(null);

  useEffect(() => {
    setTopBarTarget(document.getElementById('superadmin-topbar-actions'));
  }, []);
  
  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'whatsapp',
    category: 'Marketing',
    language: 'en_US',
    senderAccount: '+91 87968 19922 (FinMantra)',
    headerType: 'NONE', // 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    headerMediaUrl: '',
    headerText: '',
    body: '',
    footer: 'Reply STOP to opt out',
    buttons: [],
    subject: '',
    emailPreheader: '',
    emailHeroImageUrl: '',
    emailCtaText: 'Open UniVerse',
    emailCtaUrl: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'
  });
  
  const [buttonMode, setButtonMode] = useState('none'); // 'none' | 'cta' | 'replies' | 'otp'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fileInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const categories = [
    'all',
    'Marketing',
    'Utility',
    'Authentication',
    'Marketing & Offers',
    'Order Lifecycle',
    'Campus Announcements',
    'General'
  ];

  const languages = [
    { code: 'en_US', label: 'English (US) [en_US]' },
    { code: 'en_GB', label: 'English (UK) [en_GB]' },
    { code: 'hi', label: 'Hindi [hi]' },
    { code: 'es', label: 'Spanish [es]' },
    { code: 'ta', label: 'Tamil [ta]' },
    { code: 'te', label: 'Telugu [te]' }
  ];

  const senderAccounts = [
    '+91 87968 19922 (FinMantra)',
    '+91 91100 48821 (UniVerse Official)',
    '+91 98765 43210 (Campus Dining Bot)',
    'Default System Sender'
  ];

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/super-admin/master-templates`, {
        headers,
        params: {
          channel: selectedChannel,
          category: selectedCategory,
          search: searchQuery
        }
      });
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to fetch master templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token, selectedChannel, selectedCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      channel: 'whatsapp',
      category: 'Marketing',
      language: 'en_US',
      senderAccount: '+91 87968 19922 (FinMantra)',
      headerType: 'NONE',
      headerMediaUrl: '',
      headerText: '',
      body: '',
      footer: 'Reply STOP to opt out',
      buttons: [],
      subject: '',
      emailPreheader: '',
      emailHeroImageUrl: '',
      emailCtaText: 'Open UniVerse',
      emailCtaUrl: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'
    });
    setButtonMode('none');
    setUploadError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingId(t._id);
    const btns = t.buttons && Array.isArray(t.buttons) ? t.buttons : [];
    let bMode = 'none';
    if (btns.length > 0) {
      if (btns.some(b => b.type === 'OTP')) bMode = 'otp';
      else if (btns.some(b => b.type === 'QUICK_REPLY')) bMode = 'replies';
      else if (btns.some(b => b.type === 'URL' || b.type === 'PHONE_NUMBER')) bMode = 'cta';
    }

    setFormData({
      name: t.name || '',
      channel: t.channel || 'whatsapp',
      category: t.category || 'Marketing',
      language: t.language || 'en_US',
      senderAccount: t.senderAccount || '+91 87968 19922 (FinMantra)',
      headerType: t.headerType || 'NONE',
      headerMediaUrl: t.headerMediaUrl || '',
      headerText: t.headerText || '',
      body: t.body || '',
      footer: t.footer !== undefined ? t.footer : 'Reply STOP to opt out',
      buttons: btns,
      subject: t.subject || '',
      emailPreheader: t.emailPreheader || '',
      emailHeroImageUrl: t.emailHeroImageUrl || '',
      emailCtaText: t.emailCtaText || 'Open UniVerse',
      emailCtaUrl: t.emailCtaUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in')
    });
    setButtonMode(bMode);
    setUploadError('');
    setModalOpen(true);
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to insert dynamic tags and markdown formatting at current cursor position
  const insertDynamicTag = (tagText) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setFormData(prev => ({
        ...prev,
        body: prev.body ? `${prev.body} ${tagText} ` : `${tagText} `
      }));
      return;
    }

    const start = textarea.selectionStart ?? formData.body.length;
    const end = textarea.selectionEnd ?? formData.body.length;
    const currentText = formData.body || '';
    
    let insertVal = tagText;
    if (tagText === '*Bold*' && start !== end) {
      insertVal = `*${currentText.substring(start, end)}*`;
    } else if (tagText === '*Bold*') {
      insertVal = '*bold text*';
    } else if (tagText === '_Italic_' && start !== end) {
      insertVal = `_${currentText.substring(start, end)}_`;
    } else if (tagText === '_Italic_') {
      insertVal = '_italic text_';
    }

    const before = currentText.substring(0, start);
    const after = currentText.substring(end);
    const addSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const addSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');
    
    const spacerPrefix = addSpaceBefore ? ' ' : '';
    const spacerSuffix = addSpaceAfter ? ' ' : ' ';
    
    const nextBody = `${before}${spacerPrefix}${insertVal}${spacerSuffix}${after}`;
    setFormData(prev => ({ ...prev, body: nextBody }));

    setTimeout(() => {
      textarea.focus();
      const newPos = start + spacerPrefix.length + insertVal.length + spacerSuffix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Cloudinary Direct Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Image size exceeds maximum limit of 25MB.');
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError('');

      const uploadData = new FormData();
      uploadData.append('image', file);

      const res = await axios.post(`${apiUrl}/api/super-admin/master-templates/upload-image`, uploadData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      const url = res.data?.imageUrl || res.data?.url;
      if (url) {
        setFormData(prev => ({
          ...prev,
          headerType: 'IMAGE',
          headerMediaUrl: url
        }));
      } else {
        setUploadError('Upload succeeded but no image URL was returned.');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload image. Please check file size or enter a direct URL.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Button Mode Handlers
  const handleSelectButtonMode = (mode) => {
    setButtonMode(mode);
    if (mode === 'none') {
      setFormData(prev => ({ ...prev, buttons: [] }));
    } else if (mode === 'cta') {
      setFormData(prev => {
        const hasUrl = prev.buttons.some(b => b.type === 'URL' || b.type === 'PHONE_NUMBER');
        if (hasUrl) return prev;
        return {
          ...prev,
          buttons: [...prev.buttons, { type: 'URL', text: 'Visit Website', value: 'https://universeorder.co.in' }].slice(0, 3)
        };
      });
    } else if (mode === 'replies') {
      setFormData(prev => {
        const hasReply = prev.buttons.some(b => b.type === 'QUICK_REPLY');
        if (hasReply) return prev;
        return {
          ...prev,
          buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: 'Confirm Order', value: 'CONFIRM' }].slice(0, 3)
        };
      });
    } else if (mode === 'otp') {
      setFormData(prev => {
        const hasOtp = prev.buttons.some(b => b.type === 'OTP');
        if (hasOtp) return prev;
        return {
          ...prev,
          buttons: [...prev.buttons, { type: 'OTP', text: 'Copy Code', value: 'UNIVERSE2026' }].slice(0, 3)
        };
      });
    }
  };

  const addButton = (defaultType = 'URL') => {
    if (formData.buttons.length >= 3) {
      alert('Maximum 3 interactive buttons allowed for WhatsApp templates.');
      return;
    }
    let newBtn = { type: defaultType, text: 'Action Button', value: '' };
    if (defaultType === 'URL') newBtn = { type: 'URL', text: 'Open Link', value: 'https://universeorder.co.in' };
    else if (defaultType === 'QUICK_REPLY') newBtn = { type: 'QUICK_REPLY', text: 'Quick Reply', value: '' };
    else if (defaultType === 'PHONE_NUMBER') newBtn = { type: 'PHONE_NUMBER', text: 'Call Us', value: '+91 98765 43210' };
    else if (defaultType === 'OTP') newBtn = { type: 'OTP', text: 'Copy Code', value: 'UNIVERSE2026' };

    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, newBtn]
    }));
  };

  const updateButton = (index, field, value) => {
    const updated = [...formData.buttons];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, buttons: updated }));
  };

  const removeButton = (index) => {
    setFormData(prev => {
      const remaining = prev.buttons.filter((_, i) => i !== index);
      if (remaining.length === 0) setButtonMode('none');
      return { ...prev, buttons: remaining };
    });
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Please enter a Template Name.');
    if (!formData.body.trim()) return alert('Please enter Template Body Content.');

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`${apiUrl}/api/super-admin/master-templates/${editingId}`, formData, { headers });
      } else {
        await axios.post(`${apiUrl}/api/super-admin/master-templates`, formData, { headers });
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) {
      alert('Error saving template: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this master template?')) return;
    try {
      await axios.delete(`${apiUrl}/api/super-admin/master-templates/${id}`, { headers });
      setSelectedTemplateIds(prev => prev.filter(x => x !== id));
      fetchTemplates();
    } catch (err) {
      alert('Failed to archive template: ' + err.message);
    }
  };

  const toggleSelectTemplate = (id) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTemplates = () => {
    const pageTemplateIds = templates.map(t => t._id);
    const allSelected = pageTemplateIds.length > 0 && pageTemplateIds.every(id => selectedTemplateIds.includes(id));
    if (allSelected) {
      setSelectedTemplateIds(prev => prev.filter(id => !pageTemplateIds.includes(id)));
    } else {
      setSelectedTemplateIds(prev => [...new Set([...prev, ...pageTemplateIds])]);
    }
  };

  const handleBulkDeleteTemplates = async () => {
    if (selectedTemplateIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete / archive ${selectedTemplateIds.length} selected templates? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await axios.post(`${apiUrl}/api/super-admin/master-templates/bulk-delete`, 
        { ids: selectedTemplateIds }, 
        { headers }
      );
      setSelectedTemplateIds([]);
      fetchTemplates();
      alert('Selected templates deleted successfully.');
    } catch (err) {
      alert('Bulk delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // WhatsApp Formatted Text Renderer (Markdown & Variable tags)
  const renderWhatsAppFormattedText = (rawText) => {
    if (!rawText) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Message body preview...</span>;

    return rawText.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+|\{\{[a-zA-Z0-9_]+\}\})/g);

      return (
        <div key={lineIdx} style={{ minHeight: '1.3em', marginBottom: line === '' ? '0.5em' : '0', wordBreak: 'break-word' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('{{') && part.endsWith('}}')) {
              const inner = part.slice(2, -2);
              let label = part;
              if (inner === '1') label = '{{1}} Name';
              else if (inner === '2') label = '{{2}} Detail';
              else if (inner === '3') label = '{{3}} Link/Code';

              return (
                <span 
                  key={pIdx} 
                  style={{ 
                    background: 'rgba(239, 65, 35, 0.14)', 
                    color: '#ef4123', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontWeight: '800',
                    fontSize: '0.88em',
                    border: '1px solid rgba(239, 65, 35, 0.25)',
                    display: 'inline-block',
                    margin: '0 1px'
                  }}
                >
                  {label}
                </span>
              );
            }
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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Topbar Action Portal */}
      {topBarTarget && createPortal(
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.9rem',
            background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px',
            fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer',
            transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(239, 65, 35, 0.2)'
          }}
        >
          <Plus size={14} /> Create Master Template
        </button>,
        topBarTarget
      )}

      {/* Filter Bar (Sticky) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#f8fafc',
        paddingTop: '0.25rem',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Channel Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '14px' }}>
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'whatsapp', label: '💬 WhatsApp', color: '#25D366' },
            { id: 'email', label: '📧 Email', color: '#ea4335' }
          ].map(ch => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                background: selectedChannel === ch.id ? '#ffffff' : 'transparent',
                color: selectedChannel === ch.id ? '#0f172a' : '#64748b',
                boxShadow: selectedChannel === ch.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.45rem 1rem', borderRadius: '100px', border: '1px solid', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--surface-border)',
                background: selectedCategory === cat ? 'rgba(239, 65, 35, 0.08)' : '#ffffff',
                color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: '700' }}>Loading Master Templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px dashed var(--surface-border)', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Layers size={40} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>No Master Templates Found</h3>
          <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            Get started by designing your first interactive WhatsApp or Email template.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem',
              background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px',
              fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Create Master Template
          </button>
        </div>
      ) : (
        <div>
          {/* BULK ACTION BAR */}
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            background: selectedTemplateIds.length > 0 ? '#fff1f2' : '#ffffff',
            border: selectedTemplateIds.length > 0 ? '1.5px solid #fecdd3' : '1px solid var(--surface-border)',
            borderRadius: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="checkbox"
                checked={templates.length > 0 && templates.every(t => selectedTemplateIds.includes(t._id))}
                onChange={toggleSelectAllTemplates}
                style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary, #ef4123)' }}
                title="Select All Templates"
              />
              <span style={{ fontSize: '0.875rem', fontWeight: '800', color: selectedTemplateIds.length > 0 ? '#e11d48' : 'var(--text-primary)' }}>
                {selectedTemplateIds.length > 0 
                  ? `${selectedTemplateIds.length} of ${templates.length} templates selected`
                  : `Select All (${templates.length} templates)`}
              </span>
              {selectedTemplateIds.length > 0 && (
                <button
                  onClick={() => setSelectedTemplateIds([])}
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
              )}
            </div>

            {selectedTemplateIds.length > 0 && (
              <button
                onClick={handleBulkDeleteTemplates}
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
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedTemplateIds.length})`}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
          {templates.map(t => {
            const isWhatsApp = t.channel === 'whatsapp';

            return (
              <div 
                key={t._id}
                style={{
                  background: '#ffffff', borderRadius: '24px', border: selectedTemplateIds.includes(t._id) ? '1.5px solid var(--primary, #ef4123)' : '1px solid var(--surface-border)',
                  boxShadow: selectedTemplateIds.includes(t._id) ? '0 4px 20px rgba(239, 65, 35, 0.12)' : '0 4px 16px rgba(0,0,0,0.03)', padding: '1.5rem', display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between', position: 'relative'
                }}
              >
                <div>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedTemplateIds.includes(t._id)}
                        onChange={() => toggleSelectTemplate(t._id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary, #ef4123)' }}
                      />
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                        background: isWhatsApp ? 'rgba(37, 211, 102, 0.12)' : 'rgba(234, 67, 53, 0.12)',
                        color: isWhatsApp ? '#16a34a' : '#ea4335'
                      }}>
                        {isWhatsApp ? <Smartphone size={12} /> : <Mail size={12} />}
                        {isWhatsApp ? 'WhatsApp Card' : 'Email Template'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                      {t.category || 'Marketing'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                    {t.name}
                  </h3>

                  {/* REALISTIC PREVIEW BOX */}
                  {isWhatsApp ? (
                    <div style={{
                      background: '#e5ddd5', backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 1px)', backgroundSize: '16px 16px',
                      padding: '1.1rem', borderRadius: '18px', marginBottom: '1.25rem'
                    }}>
                      <div style={{
                        background: '#ffffff', borderRadius: '14px', borderTopLeftRadius: '4px', padding: '0.85rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)', maxWidth: '100%', overflow: 'hidden'
                      }}>
                        {/* Header Media */}
                        {t.headerType === 'IMAGE' && t.headerMediaUrl && (
                          <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem', background: '#f1f5f9' }}>
                            <img src={t.headerMediaUrl} alt="Header Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {t.headerType === 'TEXT' && t.headerText && (
                          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#111b21', marginBottom: '0.5rem' }}>
                            {t.headerText}
                          </div>
                        )}

                        {/* Body Text */}
                        <div style={{ fontSize: '0.85rem', color: '#111b21', lineHeight: 1.5 }}>
                          {renderWhatsAppFormattedText(t.body)}
                        </div>

                        {/* Footer & Timestamp */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#8696a0', fontStyle: 'italic' }}>
                            {t.footer || 'Reply STOP to opt out'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            11:30 AM <CheckCheck size={12} style={{ color: '#53bdeb' }} />
                          </span>
                        </div>

                        {/* Interactive Buttons Stack */}
                        {t.buttons && Array.isArray(t.buttons) && t.buttons.length > 0 && (
                          <div style={{ marginTop: '0.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            {t.buttons.map((btn, idx) => (
                              <div 
                                key={idx} 
                                style={{ 
                                  padding: '0.45rem 0.5rem', 
                                  borderBottom: idx < t.buttons.length - 1 ? '1px solid #f1f5f9' : 'none',
                                  textAlign: 'center', 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800', 
                                  color: '#00a884',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                {btn.type === 'URL' && <><ExternalLink size={13} /> {btn.text}</>}
                                {btn.type === 'PHONE_NUMBER' && <><Phone size={13} /> {btn.text}</>}
                                {btn.type === 'QUICK_REPLY' && <><MessageSquare size={13} /> {btn.text}</>}
                                {btn.type === 'OTP' && <><Key size={13} /> {btn.text}</>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Email Mockup */
                    <div style={{ background: '#0f172a', borderRadius: '18px', padding: '1.25rem', color: '#f8fafc', marginBottom: '1.25rem' }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Subject:</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
                          {t.subject || t.name}
                        </p>
                      </div>

                      {t.emailHeroImageUrl && (
                        <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                          <img src={t.emailHeroImageUrl} alt="Email Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}

                      <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                        {t.body.substring(0, 140)}...
                      </p>

                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '6px 16px', background: '#ef4123', color: 'white', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                          {t.emailCtaText || 'Open App'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {t.variables && Array.isArray(t.variables) && t.variables.slice(0, 3).map(v => (
                      <span key={v} style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {t.buttons && Array.isArray(t.buttons) && t.buttons.length > 0 && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(0,168,132,0.1)', color: '#00a884', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                        {t.buttons.length} Buttons
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleCopyText(t.body, t._id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: '#ffffff', color: copiedId === t._id ? '#16a34a' : '#64748b', cursor: 'pointer' }}
                      title="Copy Message Text"
                    >
                      {copiedId === t._id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(t)}
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
                      title="Edit Template"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', cursor: 'pointer' }}
                      title="Archive Template"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', maxWidth: '1080px', width: '100%',
            maxHeight: '92vh', overflowY: 'auto', padding: '2rem', position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', background: 'rgba(239, 65, 35, 0.08)', padding: '3px 10px', borderRadius: '100px', marginBottom: '0.4rem' }}>
                <Zap size={13} /> Meta-Approved Standard
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 0.3rem', color: '#0f172a' }}>
                {editingId ? 'Edit Master Template' : 'Create Master Template'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Configure WhatsApp interactive templates with image headers, dynamic replacement tags, and CTA buttons.
              </p>
            </div>

            {/* 2-Column Responsive Layout: Form on Left, Live Simulator on Right */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.9fr)', gap: '1.75rem', alignItems: 'start' }}>
              
              {/* LEFT COLUMN: Configuration Form */}
              <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* 1. TEMPLATE CATEGORY & CONFIGURATION */}
                <div style={{ background: '#fbf9f5', borderRadius: '16px', border: '1px solid #e9e6df', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                    1. TEMPLATE CATEGORY & CONFIGURATION
                  </div>

                  {/* Category Cards Selection */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
                    {[
                      { id: 'Marketing', title: 'Marketing', desc: 'Offers & promotions' },
                      { id: 'Utility', title: 'Utility', desc: 'Updates & alerts' },
                      { id: 'Authentication', title: 'Authentication', desc: 'OTP verification' }
                    ].map(cat => {
                      const isSelected = formData.category === cat.id || (cat.id === 'Marketing' && formData.category.includes('Marketing'));
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          style={{
                            padding: '0.85rem 0.75rem', borderRadius: '12px', cursor: 'pointer',
                            border: isSelected ? '2px solid #b45309' : '1px solid #e2e0d8',
                            background: isSelected ? '#fffdf5' : '#ffffff',
                            boxShadow: isSelected ? '0 2px 8px rgba(180, 83, 9, 0.12)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: isSelected ? '#92400e' : '#1e293b' }}>
                            {cat.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: isSelected ? '#b45309' : '#64748b', marginTop: '2px' }}>
                            {cat.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Template Name & Language Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Template Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. finmantra_special_offer_v1"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        style={{
                          width: '100%', padding: '0.75rem', borderRadius: '10px',
                          border: '1px solid #e2e0d8', background: '#ffffff',
                          fontSize: '0.85rem', fontFamily: 'monospace', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={e => setFormData({ ...formData, language: e.target.value })}
                        style={{
                          width: '100%', padding: '0.75rem', borderRadius: '10px',
                          border: '1px solid #e2e0d8', background: '#ffffff',
                          fontSize: '0.85rem', boxSizing: 'border-box'
                        }}
                      >
                        {languages.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Meta WhatsApp Sender Account */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Target Meta WhatsApp Sender Account
                    </label>
                    <select
                      value={formData.senderAccount}
                      onChange={e => setFormData({ ...formData, senderAccount: e.target.value })}
                      style={{
                        width: '100%', padding: '0.75rem', borderRadius: '10px',
                        border: '1px solid #e2e0d8', background: '#ffffff',
                        fontSize: '0.85rem', boxSizing: 'border-box'
                      }}
                    >
                      {senderAccounts.map(sa => (
                        <option key={sa} value={sa}>{sa}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. WHATSAPP HEADER (OPTIONAL) */}
                <div style={{ background: '#fbf9f5', borderRadius: '16px', border: '1px solid #e9e6df', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    2. WHATSAPP HEADER (OPTIONAL)
                  </div>

                  {/* Header Type Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[
                      { id: 'NONE', label: 'None' },
                      { id: 'TEXT', label: '📝 Text' },
                      { id: 'IMAGE', label: '🖼️ Image' },
                      { id: 'VIDEO', label: '🎥 Video' },
                      { id: 'DOCUMENT', label: '📄 Document' }
                    ].map(h => {
                      const isSelected = formData.headerType === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, headerType: h.id })}
                          style={{
                            padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid',
                            fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer',
                            borderColor: isSelected ? '#16a34a' : '#e2e0d8',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            color: isSelected ? '#15803d' : '#64748b',
                            boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Header Type: TEXT */}
                  {formData.headerType === 'TEXT' && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Header Text
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Special Weekend Announcement 🍕"
                        value={formData.headerText}
                        onChange={e => setFormData({ ...formData, headerText: e.target.value })}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  {/* Header Type: IMAGE (Direct Upload + URL input) */}
                  {formData.headerType === 'IMAGE' && (
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                          Image Header Upload & Link
                        </span>
                        {formData.headerMediaUrl && (
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={12} /> Image Attached
                          </span>
                        )}
                      </div>

                      {/* Direct Upload Section */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            padding: '0.65rem 1.1rem', borderRadius: '10px',
                            background: '#0f172a', color: '#ffffff', border: 'none',
                            fontSize: '0.82rem', fontWeight: '800', cursor: uploadingImage ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                          }}
                        >
                          {uploadingImage ? (
                            <><RefreshCw size={14} className="animate-spin" /> Uploading to Cloudinary...</>
                          ) : (
                            <><Upload size={14} /> Upload Image File</>
                          )}
                        </button>

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Supports PNG, JPG, WebP (up to 25MB)</span>
                      </div>

                      {uploadError && (
                        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={14} /> {uploadError}
                        </div>
                      )}

                      {/* Image Preview Thumbnail if Present */}
                      {formData.headerMediaUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.6rem', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <img 
                            src={formData.headerMediaUrl} 
                            alt="Uploaded Header Preview" 
                            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {formData.headerMediaUrl}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
                              ✓ Cloudinary Secured Hosted Asset
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, headerMediaUrl: '' })}
                            style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* OR Direct URL Input */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                          Or Paste Direct Image URL:
                        </div>
                        <input 
                          type="url"
                          placeholder="https://res.cloudinary.com/... or https://example.com/banner.jpg"
                          value={formData.headerMediaUrl}
                          onChange={e => setFormData({ ...formData, headerMediaUrl: e.target.value })}
                          style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Header Type: VIDEO / DOCUMENT */}
                  {(formData.headerType === 'VIDEO' || formData.headerType === 'DOCUMENT') && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                        {formData.headerType === 'VIDEO' ? 'Video URL (MP4)' : 'Document URL (PDF)'}
                      </label>
                      <input 
                        type="url"
                        placeholder={formData.headerType === 'VIDEO' ? 'https://example.com/promo.mp4' : 'https://example.com/menu.pdf'}
                        value={formData.headerMediaUrl}
                        onChange={e => setFormData({ ...formData, headerMediaUrl: e.target.value })}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>

                {/* 3. TEMPLATE BODY CONTENT * */}
                <div style={{ background: '#fbf9f5', borderRadius: '16px', border: '1px solid #e9e6df', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase' }}>
                      3. TEMPLATE BODY CONTENT <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                  </div>

                  {/* Inserter Toolbar - Exact match with user requirement & screenshot */}
                  <div style={{ background: '#f5f3ec', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e7e4dc', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b45309', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.6rem' }}>
                      <Zap size={13} /> Click to Insert Dynamic Tags:
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { label: '{{1}} Name', val: '{{1}}' },
                        { label: '{{2}} Detail', val: '{{2}}' },
                        { label: '{{3}} Link/Code', val: '{{3}}' },
                        { label: '*Bold*', val: '*Bold*' },
                        { label: '_Italic_', val: '_Italic_' }
                      ].map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => insertDynamicTag(item.val)}
                          style={{
                            padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                            background: '#ffffff', color: '#0f172a', fontWeight: '800', fontSize: '0.8rem',
                            cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s'
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Body Textarea */}
                  <textarea
                    ref={bodyTextareaRef}
                    required
                    rows={6}
                    placeholder="Enter WhatsApp message body with {{1}}, {{2}}..."
                    value={formData.body}
                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: '12px',
                      border: '1px solid #cbd5e1', fontSize: '0.9rem',
                      boxSizing: 'border-box', lineHeight: 1.55, background: '#ffffff',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* 4. WHATSAPP FOOTER (OPTIONAL) */}
                <div style={{ background: '#fbf9f5', borderRadius: '16px', border: '1px solid #e9e6df', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    4. WHATSAPP FOOTER (OPTIONAL)
                  </div>
                  <input 
                    type="text"
                    placeholder="e.g. Reply STOP to opt out"
                    value={formData.footer}
                    onChange={e => setFormData({ ...formData, footer: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#ffffff' }}
                  />
                </div>

                {/* 5. INTERACTIVE BUTTONS (CTA URLS, UNSUBSCRIBE & PHONE) */}
                <div style={{ background: '#fbf9f5', borderRadius: '16px', border: '1px solid #e9e6df', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase' }}>
                      5. INTERACTIVE BUTTONS (CTA URLS, UNSUBSCRIBE & PHONE)
                    </div>
                  </div>

                  {/* Mode Pills: None, CTA Links, Replies, OTP */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'cta', label: '🔗 CTA Links' },
                      { id: 'replies', label: '💬 Replies' },
                      { id: 'otp', label: '🔑 OTP' }
                    ].map(b => {
                      const isSelected = buttonMode === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectButtonMode(b.id)}
                          style={{
                            padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid',
                            fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer',
                            borderColor: isSelected ? '#16a34a' : '#e2e0d8',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            color: isSelected ? '#15803d' : '#64748b',
                            boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Button Items List */}
                  {formData.buttons.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      {formData.buttons.map((btn, idx) => (
                        <div key={idx} style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Button Type Selector */}
                          <select
                            value={btn.type}
                            onChange={e => updateButton(idx, 'type', e.target.value)}
                            style={{ padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '700' }}
                          >
                            <option value="URL">🔗 CTA Link (URL)</option>
                            <option value="QUICK_REPLY">💬 Quick Reply</option>
                            <option value="PHONE_NUMBER">📞 Phone Call</option>
                            <option value="OTP">🔑 Copy OTP Code</option>
                          </select>

                          {/* Button Text */}
                          <input 
                            type="text"
                            placeholder={btn.type === 'OTP' ? 'Copy Code' : 'Button Text (e.g. Order Now)'}
                            value={btn.text}
                            onChange={e => updateButton(idx, 'text', e.target.value)}
                            style={{ flex: 1, minWidth: '130px', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                          />

                          {/* Button Target / Payload Value */}
                          {btn.type !== 'QUICK_REPLY' && (
                            <input 
                              type="text"
                              placeholder={btn.type === 'URL' ? 'https://universeorder.co.in' : btn.type === 'PHONE_NUMBER' ? '+91 98765 43210' : 'OTP Code (e.g. {{3}})'}
                              value={btn.value}
                              onChange={e => updateButton(idx, 'value', e.target.value)}
                              style={{ flex: 1.2, minWidth: '150px', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                            />
                          )}

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeButton(idx)}
                            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remove Button"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Button Trigger (Up to 3) */}
                  {formData.buttons.length < 3 && buttonMode !== 'none' && (
                    <button
                      type="button"
                      onClick={() => addButton(buttonMode === 'otp' ? 'OTP' : buttonMode === 'replies' ? 'QUICK_REPLY' : 'URL')}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '10px', border: '1px dashed #00a884',
                        background: 'rgba(0, 168, 132, 0.05)', color: '#00a884', fontWeight: '800',
                        fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Plus size={14} /> Add Another Interactive Button ({formData.buttons.length}/3)
                    </button>
                  )}
                </div>

                {/* Submit / Save Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none',
                    borderRadius: '14px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 65, 35, 0.3)', opacity: submitting ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  {submitting ? (
                    <><RefreshCw size={18} className="animate-spin" /> Saving Template...</>
                  ) : (
                    <><Check size={18} /> {editingId ? 'Update Master Template' : 'Save Master Template'}</>
                  )}
                </button>
              </form>

              {/* RIGHT COLUMN: Real-Time WhatsApp Live Simulation Device */}
              <div style={{ position: 'sticky', top: '1.5rem' }}>
                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={18} style={{ color: '#16a34a' }} />
                      <span style={{ fontWeight: '900', fontSize: '0.9rem', color: '#0f172a' }}>
                        Live Message Preview
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#16a34a', fontWeight: '800', padding: '3px 8px', borderRadius: '100px' }}>
                      Real-Time Rendering
                    </span>
                  </div>

                  {/* Device Screen Mockup */}
                  <div style={{
                    background: '#e5ddd5', backgroundImage: 'radial-gradient(#d1c7bc 1.2px, transparent 1.2px)', backgroundSize: '16px 16px',
                    borderRadius: '20px', padding: '1.25rem', border: '1px solid #d5cbbf', minHeight: '380px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'
                  }}>
                    
                    {/* Simulated WhatsApp Header */}
                    <div style={{ background: '#075e54', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.85rem' }}>
                        UV
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>UniVerse Verified</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>Online • Campus Bot</div>
                      </div>
                    </div>

                    {/* WhatsApp Chat Bubble */}
                    <div style={{
                      background: '#ffffff', borderRadius: '14px', borderTopLeftRadius: '3px', padding: '0.85rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', maxWidth: '100%', overflow: 'hidden'
                    }}>
                      {/* Image Header if Present */}
                      {formData.headerType === 'IMAGE' && formData.headerMediaUrl && (
                        <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem', background: '#f8fafc' }}>
                          <img src={formData.headerMediaUrl} alt="Header Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}

                      {/* Text Header if Present */}
                      {formData.headerType === 'TEXT' && formData.headerText && (
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#111b21', marginBottom: '0.5rem' }}>
                          {formData.headerText}
                        </div>
                      )}

                      {/* Body Content with Live Formatting & Dynamic Tag Badges */}
                      <div style={{ fontSize: '0.88rem', color: '#111b21', lineHeight: 1.5 }}>
                        {renderWhatsAppFormattedText(formData.body)}
                      </div>

                      {/* Footer & Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#8696a0', fontStyle: 'italic' }}>
                          {formData.footer || 'Reply STOP to opt out'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          11:30 AM <CheckCheck size={12} style={{ color: '#53bdeb' }} />
                        </span>
                      </div>

                      {/* Interactive Buttons Stack */}
                      {formData.buttons.length > 0 && (
                        <div style={{ marginTop: '0.65rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                          {formData.buttons.map((btn, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                padding: '0.55rem 0.5rem', 
                                borderBottom: idx < formData.buttons.length - 1 ? '1px solid #f1f5f9' : 'none',
                                textAlign: 'center', 
                                fontSize: '0.82rem', 
                                fontWeight: '800', 
                                color: '#00a884',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: '#fcfcfc',
                                borderRadius: '4px',
                                margin: '2px 0'
                              }}
                            >
                              {btn.type === 'URL' && <><ExternalLink size={14} /> {btn.text || 'Open Website'}</>}
                              {btn.type === 'PHONE_NUMBER' && <><Phone size={14} /> {btn.text || 'Call Now'}</>}
                              {btn.type === 'QUICK_REPLY' && <><MessageSquare size={14} /> {btn.text || 'Quick Reply'}</>}
                              {btn.type === 'OTP' && <><Key size={14} /> {btn.text || 'Copy Code'}: <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>{btn.value || 'UNIVERSE123'}</span></>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Substitution Guide Note */}
                    <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.85)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#475569', marginBottom: '3px' }}>
                        💡 Dynamic Substitution Logic
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                        During broadcast dispatch, <strong>{'{{1}}'}</strong> is automatically substituted with Recipient Name, <strong>{'{{2}}'}</strong> with Campus / Order details, and <strong>{'{{3}}'}</strong> with custom Link or Promo Code.
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMasterTemplates;
