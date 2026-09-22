import React, { useState, useEffect } from 'react';
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
  Image, 
  Layers,
  X,
  Eye
} from 'lucide-react';

const SuperAdminMasterTemplates = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('all'); // 'all' | 'whatsapp' | 'email'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'whatsapp',
    category: 'Marketing & Offers',
    headerType: 'NONE',
    headerMediaUrl: '',
    body: '',
    footer: 'UniVerse • Smart Campus Ordering',
    buttons: [],
    subject: '',
    emailPreheader: '',
    emailHeroImageUrl: '',
    emailCtaText: 'Open UniVerse',
    emailCtaUrl: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'
  });
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const categories = [
    'all',
    'Marketing & Offers',
    'Order Lifecycle',
    'Campus Announcements',
    'Student Onboarding',
    'Vendor Alerts',
    'General'
  ];

  const availableVariables = [
    { tag: '{{name}}', desc: 'Recipient Name' },
    { tag: '{{campus}}', desc: 'Campus Location' },
    { tag: '{{discount_code}}', desc: 'Promo Code' },
    { tag: '{{order_id}}', desc: 'Order Number' },
    { tag: '{{store_name}}', desc: 'Store Name' }
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

  const renderWhatsAppFormattedText = (rawText) => {
    if (!rawText) return null;

    return rawText.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+|\{\{[a-zA-Z0-9_]+\}\})/g);

      return (
        <div key={lineIdx} style={{ minHeight: '1.3em', marginBottom: line === '' ? '0.5em' : '0' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('{{') && part.endsWith('}}')) {
              return <span key={pIdx} style={{ background: 'rgba(239, 65, 35, 0.15)', color: 'var(--primary)', padding: '1px 4px', borderRadius: '4px', fontWeight: '800' }}>{part}</span>;
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

  useEffect(() => {
    fetchTemplates();
  }, [token, selectedChannel, selectedCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      channel: 'whatsapp',
      category: 'Marketing & Offers',
      headerType: 'NONE',
      headerMediaUrl: '',
      body: '',
      footer: 'UniVerse • Smart Campus Ordering',
      buttons: [],
      subject: '',
      emailPreheader: '',
      emailHeroImageUrl: '',
      emailCtaText: 'Open UniVerse',
      emailCtaUrl: typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingId(t._id);
    setFormData({
      name: t.name,
      channel: t.channel,
      category: t.category,
      headerType: t.headerType || 'NONE',
      headerMediaUrl: t.headerMediaUrl || '',
      body: t.body,
      footer: t.footer || 'UniVerse • Smart Campus Ordering',
      buttons: t.buttons || [],
      subject: t.subject || '',
      emailPreheader: t.emailPreheader || '',
      emailHeroImageUrl: t.emailHeroImageUrl || '',
      emailCtaText: t.emailCtaText || 'Open UniVerse',
      emailCtaUrl: t.emailCtaUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://uat.food.universeorder.co.in')
    });
    setModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
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
    if (!window.confirm('Archive this master template?')) return;
    try {
      await axios.delete(`${apiUrl}/api/super-admin/master-templates/${id}`, { headers });
      fetchTemplates();
    } catch (err) {
      alert('Failed to archive: ' + err.message);
    }
  };

  // Variable chip inserter helper
  const insertVariable = (tag) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + ' ' + tag + ' '
    }));
  };

  // Button management helpers
  const addButton = () => {
    if (formData.buttons.length >= 3) return alert('Maximum 3 buttons allowed.');
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: 'Action Button', value: '' }]
    }));
  };

  const updateButton = (index, field, value) => {
    const updated = [...formData.buttons];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, buttons: updated }));
  };

  const removeButton = (index) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 65, 35, 0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            <Sparkles size={14} /> Approved Marketing Assets
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>Master Templates Hub</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '1rem' }}>
            Design high-converting WhatsApp chat bubbles and responsive email mockups with dynamic variable tags.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0.85rem 1.5rem',
            background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px',
            fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239, 65, 35, 0.25)'
          }}
        >
          <Plus size={18} /> Create Master Template
        </button>
      </header>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
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
                padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                background: selectedChannel === ch.id ? '#ffffff' : 'transparent',
                color: selectedChannel === ch.id ? '#0f172a' : '#64748b',
                boxShadow: selectedChannel === ch.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
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
                padding: '0.45rem 0.9rem', borderRadius: '100px', border: '1px solid', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
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
      {templates.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px dashed var(--surface-border)', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Layers size={40} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>No Master Templates Found</h3>
          <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            Get started by creating your first WhatsApp or Email template.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
          {templates.map(t => {
            const isWhatsApp = t.channel === 'whatsapp';

            return (
              <div 
                key={t._id}
                style={{
                  background: '#ffffff', borderRadius: '24px', border: '1px solid var(--surface-border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)', padding: '1.5rem', display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between', position: 'relative'
                }}
              >
              <div>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800',
                    background: isWhatsApp ? 'rgba(37, 211, 102, 0.12)' : 'rgba(234, 67, 53, 0.12)',
                    color: isWhatsApp ? '#16a34a' : '#ea4335'
                  }}>
                    {isWhatsApp ? <Smartphone size={12} /> : <Mail size={12} />}
                    {isWhatsApp ? 'WhatsApp Card' : 'Email Template'}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                    {t.category}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                  {t.name}
                </h3>

                {/* REALISTIC PREVIEW BOX */}
                {isWhatsApp ? (
                  /* WhatsApp Realistic Bubble Mockup */
                  <div style={{
                    background: '#e5ddd5', backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 1px)', backgroundSize: '16px 16px',
                    padding: '1.25rem', borderRadius: '18px', marginBottom: '1.25rem'
                  }}>
                    <div style={{
                      background: '#ffffff', borderRadius: '14px', borderTopLeftRadius: '4px', padding: '0.85rem',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)', maxWidth: '95%'
                    }}>
                      {/* Image Header if present */}
                      {t.headerType === 'IMAGE' && t.headerMediaUrl && (
                        <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                          <img src={t.headerMediaUrl} alt="Header Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}

                      {/* Body Text with Dynamic Highlights & Markdown formatting */}
                      <div style={{ fontSize: '0.85rem', color: '#111b21', lineHeight: 1.5 }}>
                        {renderWhatsAppFormattedText(t.body)}
                      </div>

                      {/* Action / CTA Links */}
                      {t.buttons && t.buttons.length > 0 && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                          {t.buttons.map((btn, idx) => (
                            <div key={idx} style={{ color: '#00a884', fontWeight: '700' }}>
                              {btn.type === 'URL' && <span>🔗 <u>{btn.text}</u>: <a href={btn.value} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{btn.value}</a></span>}
                              {btn.type === 'PHONE_NUMBER' && <span>📞 {btn.text}: {btn.value}</span>}
                              {btn.type === 'QUICK_REPLY' && <span>👉 [ {btn.text} ]</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer & Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#8696a0', fontStyle: 'italic' }}>{t.footer}</span>
                        <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>11:30 AM</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Email Mockup */
                  <div style={{
                    background: '#0f172a', borderRadius: '18px', padding: '1.25rem', color: '#f8fafc', marginBottom: '1.25rem'
                  }}>
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

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {t.variables?.map(v => (
                    <span key={v} style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', maxWidth: '640px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative'
          }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 0.4rem', color: '#0f172a' }}>
              {editingId ? 'Edit Master Template' : 'Create Master Template'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Templates configured here become instantly available in Broadcasting & Journey Builder.
            </p>

            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Channel Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Channel</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, channel: 'whatsapp' })}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px solid',
                      borderColor: formData.channel === 'whatsapp' ? '#25D366' : '#e2e8f0',
                      background: formData.channel === 'whatsapp' ? 'rgba(37, 211, 102, 0.08)' : '#ffffff',
                      color: formData.channel === 'whatsapp' ? '#16a34a' : '#64748b',
                      fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Smartphone size={16} /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, channel: 'email' })}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px solid',
                      borderColor: formData.channel === 'email' ? '#ea4335' : '#e2e8f0',
                      background: formData.channel === 'email' ? 'rgba(234, 67, 53, 0.08)' : '#ffffff',
                      color: formData.channel === 'email' ? '#ea4335' : '#64748b',
                      fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Mail size={16} /> Email
                  </button>
                </div>
              </div>

              {/* Template Name & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Template Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Campus Flash Deal"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                  >
                    {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* WhatsApp Specific Header */}
              {formData.channel === 'whatsapp' && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Header Media Banner (Optional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {['NONE', 'IMAGE'].map(hType => (
                      <button
                        key={hType}
                        type="button"
                        onClick={() => setFormData({ ...formData, headerType: hType })}
                        style={{
                          padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                          borderColor: formData.headerType === hType ? 'var(--primary)' : '#cbd5e1',
                          background: formData.headerType === hType ? 'rgba(239, 65, 35, 0.1)' : '#fff',
                          color: formData.headerType === hType ? 'var(--primary)' : '#64748b'
                        }}
                      >
                        {hType === 'NONE' ? 'No Media' : '🖼️ Image Header'}
                      </button>
                    ))}
                  </div>

                  {formData.headerType === 'IMAGE' && (
                    <input 
                      type="url"
                      placeholder="https://example.com/promo-banner.jpg"
                      value={formData.headerMediaUrl}
                      onChange={e => setFormData({ ...formData, headerMediaUrl: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              )}

              {/* Email Specific Subject & Hero */}
              {formData.channel === 'email' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Email Subject Line</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Hot Pizza Deals at Campus Food Court! 🍕"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Body Textarea with Dynamic Tag Inserter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Message Body</label>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Supports WhatsApp Markdown (*bold*, _italic_)</span>
                </div>

                {/* Variable Tag Inserter Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {availableVariables.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 65, 35, 0.08)',
                        border: '1px solid rgba(239, 65, 35, 0.2)', color: 'var(--primary)',
                        fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer'
                      }}
                      title={v.desc}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={5}
                  placeholder="Type your message here... Use {{name}} to personalize."
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
              </div>

              {/* Action Buttons Builder (WhatsApp) */}
              {formData.channel === 'whatsapp' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Action / CTA Buttons (Max 3)</label>
                    <button
                      type="button"
                      onClick={addButton}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      + Add Button
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.buttons.map((btn, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={btn.type}
                          onChange={e => updateButton(idx, 'type', e.target.value)}
                          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        >
                          <option value="QUICK_REPLY">Quick Reply</option>
                          <option value="URL">Website Link (URL)</option>
                          <option value="PHONE_NUMBER">Phone Call</option>
                        </select>

                        <input 
                          type="text"
                          placeholder="Button Text (e.g. Order Now)"
                          value={btn.text}
                          onChange={e => updateButton(idx, 'text', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />

                        {btn.type !== 'QUICK_REPLY' && (
                          <input 
                            type="text"
                            placeholder={btn.type === 'URL' ? 'https://...' : '+91...'}
                            value={btn.value}
                            onChange={e => updateButton(idx, 'value', e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => removeButton(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '1rem', padding: '0.9rem', background: 'var(--primary)', color: 'white', border: 'none',
                  borderRadius: '12px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Saving Template...' : 'Save Master Template'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMasterTemplates;
