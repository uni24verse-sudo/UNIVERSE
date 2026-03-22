import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Store, 
  LayoutDashboard, 
  QrCode, 
  LogOut, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Image as LucideImage,
  Download,
  ExternalLink,
  ShoppingBag,
  Tag,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';

const ManageStore = () => {
  const { token, vendor, logout, updateVendor } = useContext(AuthContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [adminUpiId, setAdminUpiId] = useState('');
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [updatingStore, setUpdatingStore] = useState(false);
  const [storeImageFile, setStoreImageFile] = useState(null);
  const [updatingImage, setUpdatingImage] = useState(false);
  const storeImageInputRef = useRef(null);

  // AI Scan States
  const [isScanning, setIsScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [scanFile, setScanFile] = useState(null);
  const [scanError, setScanError] = useState('');

  // New/Edit product form
  const [productForm, setProductForm] = useState({ _id: null, name: '', price: '', category: '', image: '', imageFile: null });
  const [savingProduct, setSavingProduct] = useState(false);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/vendor/login');
      return;
    }

    const fetchStore = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-store', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStore(res.data);
        setStoreName(res.data.name);
        setStoreCategory(res.data.category || 'General');
        setAdminUpiId(vendor?.upiId || '');
      } catch (err) {
        if (err.response?.status === 404) navigate('/vendor/store/create');
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [token, navigate, vendor]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('price', productForm.price);
      formData.append('category', productForm.category || 'Uncategorized');
      if (productForm.image) formData.append('image', productForm.image);
      if (productForm.imageFile) formData.append('imageFile', productForm.imageFile);

      if (productForm._id) {
        const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/product/${productForm._id}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setStore(res.data.store);
      } else {
        const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/product', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setStore(res.data);
      }
      cancelEdit();
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const editProduct = (product) => {
    setProductForm({ 
      _id: product._id, 
      name: product.name, 
      price: product.price, 
      category: product.category || '', 
      image: product.image || '', 
      imageFile: null 
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setProductForm({ _id: null, name: '', price: '', category: '', image: '', imageFile: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleAvailability = async (productId) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/product/${productId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(res.data.store);
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  const toggleStoreStatus = async () => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(prev => ({ ...prev, isOpen: res.data.isOpen }));
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  const handleUpdateStoreDetails = async (e) => {
    e.preventDefault();
    setUpdatingStore(true);
    try {
      // Update Store Details
      const storeRes = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/update-details`, 
        { name: storeName, category: storeCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update Admin Profile (UPI ID)
      const adminRes = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/update-profile`,
        { name: vendor.name, upiId: adminUpiId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStore(prev => ({ ...prev, name: storeRes.data.name, category: storeRes.data.category }));
      updateVendor(adminRes.data.admin);
      setIsEditingStore(false);
    } catch (err) {
      alert('Failed to update details');
    } finally {
      setUpdatingStore(false);
    }
  };

  const handleUpdateStoreImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUpdatingImage(true);
    try {
      const formData = new FormData();
      formData.append('imageFile', file);

      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/update-image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStore(prev => ({ ...prev, image: res.data.image }));
      alert('Store image updated successfully!');
    } catch (err) {
      alert('Failed to update store image');
    } finally {
      setUpdatingImage(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/vendor/login');
  };

  const getImageUrl = (img) => {
    if (!img) return '';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  const downloadQR = () => {
    const svg = document.getElementById('store-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 60;
      canvas.height = img.height + 140; // Space for text
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw store name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(store.name, canvas.width / 2, 40);
      
      ctx.drawImage(img, 30, 70);
      
      // Draw footer
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Scan to order via UniVerse', canvas.width / 2, canvas.height - 30);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${store.name}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleScanMenu = async (e) => {
    e.preventDefault();
    if (!scanFile) return;

    setIsScanning(true);
    setScanError('');
    try {
      const formData = new FormData();
      formData.append('menuImage', scanFile);

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/scan-menu/scan`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setScannedItems(res.data.map((item, idx) => ({ ...item, tempId: idx, selected: true })));
      setShowScanModal(false);
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message;
      const detailedErr = err.response?.data?.error;
      const rawText = err.response?.data?.raw;
      setScanError(detailedErr || serverMsg || 'Failed to scan menu. Ensure API key is set.');
      if (rawText) console.warn('AI Raw Error Part:', rawText);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportScannedItems = async () => {
    const itemsToImport = scannedItems
      .filter(item => item.selected)
      .map(({ name, category, price }) => ({ name, category, price: Number(price) || 0 }));
    if (itemsToImport.length === 0) return;

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/products/batch`, 
        { products: itemsToImport },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh store data
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/my-store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(res.data);
      setScannedItems([]);
      alert(`Successfully imported ${itemsToImport.length} items!`);
    } catch (err) {
      console.error('Import Error:', err.response?.data || err.message);
      alert('Failed to import items: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="auth-wrapper">
      <div className="pulse-container"><div className="pulse-dot"></div></div>
      <p style={{ marginTop: '1rem' }}>Loading Store Settings...</p>
    </div>
  );
  if (!store) return null;

  const storeUrl = `${window.location.origin}/store/${store._id}`;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.8)', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store color="white" size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>UniVerse <span style={{ color: 'var(--primary)', fontSize: '0.75rem', verticalAlign: 'top' }}>PRO</span></span>
        </div>

        <nav style={{ padding: '1rem', flex: 1 }}>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Main Menu</p>
            <Link to="/vendor/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--text-secondary)', fontWeight: '500', textDecoration: 'none', transition: 'var(--transition)' }}>
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/vendor/store/manage" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>
              <QrCode size={20} /> Store & Menu
            </Link>
          </div>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '2rem 3rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={() => navigate('/vendor/dashboard')} style={{ background: 'var(--glass-bg)', border: '1px solid var(--surface-border)', color: 'white', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}>
               <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Store Settings</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Manage your digital menu and QR availability</p>
            </div>
          </div>

          <button 
            onClick={toggleStoreStatus} 
            className={`btn ${store.isOpen ? 'btn-secondary' : 'btn-primary'}`}
            style={{ width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '14px', background: store.isOpen ? 'rgba(239, 68, 68, 0.1)' : '', color: store.isOpen ? '#ef4444' : '', borderColor: store.isOpen ? '#ef4444' : '' }}
          >
            {store.isOpen ? 'Close Stall' : 'Open Stall'}
          </button>
        </header>

        <div className="manage-store-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Left Column: QR & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                <QrCode size={20} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>Store QR Code</h3>
              </div>
              
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', display: 'inline-block', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <QRCodeSVG id="store-qr-code" value={storeUrl} size={200} level="H" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={downloadQR} style={{ borderRadius: '14px', height: '50px' }}>
                  <Download size={18} style={{ marginRight: '0.5rem' }} /> Download High-Res
                </button>
                <a href={storeUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ borderRadius: '14px', height: '50px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ExternalLink size={18} style={{ marginRight: '0.5rem' }} /> View Live Menu
                </a>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '180px', borderRadius: '16px', background: 'var(--surface-border)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                {store.image ? (
                  <img src={getImageUrl(store.image)} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', opacity: 0.2 }}>
                    <Store size={48} color="white" />
                  </div>
                )}
                <div 
                  onClick={() => storeImageInputRef.current.click()}
                  style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'var(--primary)', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: 'white' }}
                >
                  <LucideImage size={16} /> {updatingImage ? 'Uploading...' : 'Change Photo'}
                </div>
                <input type="file" ref={storeImageInputRef} hidden accept="image/*" onChange={handleUpdateStoreImage} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0 }}>Stall Details</h4>
                {!isEditingStore && (
                  <button onClick={() => setIsEditingStore(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingStore ? (
                <form onSubmit={handleUpdateStoreDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Stall Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={storeName} 
                      onChange={e => setStoreName(e.target.value)}
                      style={{ height: '40px', borderRadius: '10px', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                    <select 
                      className="form-input" 
                      value={storeCategory} 
                      onChange={e => setStoreCategory(e.target.value)}
                      style={{ height: '40px', borderRadius: '10px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'white' }}
                    >
                      <option value="Snacks">Snacks & Fast Food</option>
                      <option value="Meals">Full Meals</option>
                      <option value="Beverages">Beverages & Drinks</option>
                      <option value="Desserts">Desserts & Sweets</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>UPI ID (for payments)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="name@upi"
                      value={adminUpiId} 
                      onChange={e => setAdminUpiId(e.target.value)}
                      style={{ height: '40px', borderRadius: '10px', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', height: 'auto', borderRadius: '10px', fontSize: '0.875rem', flex: 1 }}>
                      {updatingStore ? '...' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingStore(false)} style={{ padding: '0.5rem', height: 'auto', borderRadius: '10px', fontSize: '0.875rem', flex: 1 }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Stall Name</p>
                    <p style={{ fontWeight: '700' }}>{store.name}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Category</p>
                    <p style={{ fontWeight: '700' }}>{store.category || 'General'}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>UPI ID</p>
                    <p style={{ fontWeight: '700' }}>{vendor?.upiId || 'Not Set'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Menu Management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* AI Scanned Items Review Section */}
            {scannedItems.length > 0 && (
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px', border: '2px solid var(--primary)', animation: 'pulse-border 2s infinite' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.6rem', borderRadius: '12px' }}>
                      <Sparkles size={20} color="white" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>Review AI Scan</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>We found {scannedItems.length} items. Select which to import.</p>
                    </div>
                  </div>
                  <button onClick={() => setScannedItems([])} className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }} className="hide-scrollbar">
                  {scannedItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
                      <input 
                        type="checkbox" 
                        checked={item.selected} 
                        onChange={() => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <input 
                          value={item.name} 
                          onChange={(e) => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                          style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '600', width: '100%', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <input 
                            value={item.category} 
                            onChange={(e) => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, category: e.target.value } : it))}
                            style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', width: '80px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>₹</span>
                        <input 
                          type="number"
                          value={item.price} 
                          onChange={(e) => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, price: e.target.value } : it))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', fontWeight: '700', width: '60px', textAlign: 'right', outline: 'none' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleImportScannedItems}
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '54px', borderRadius: '16px', gap: '0.75rem' }}
                >
                  <Check size={20} /> Confirm & Add {scannedItems.filter(i => i.selected).length} Items
                </button>
              </div>
            )}

            <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px' }} ref={formRef}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {productForm._id ? <Pencil size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                  <h3 style={{ margin: 0 }}>{productForm._id ? 'Edit Product' : 'Add New Item'}</h3>
                </div>
                
                {!productForm._id && (
                  <button 
                    onClick={() => setShowScanModal(true)}
                    className="btn btn-secondary" 
                    style={{ 
                      width: 'auto', 
                      padding: '0.6rem 1.2rem', 
                      borderRadius: '14px', 
                      background: 'rgba(99, 102, 241, 0.1)', 
                      borderColor: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--primary)',
                      gap: '0.5rem'
                    }}
                  >
                    <Sparkles size={18} /> AI Magic Scan
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label className="form-label">Product Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Special Masala Dosa" 
                    className="form-input" 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                    style={{ height: '54px', borderRadius: '14px' }}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input 
                    type="number" 
                    placeholder="99" 
                    className="form-input" 
                    value={productForm.price} 
                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                    style={{ height: '54px', borderRadius: '14px' }}
                    required 
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input 
                    type="text" 
                    placeholder="Snacks" 
                    className="form-input" 
                    value={productForm.category} 
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                    style={{ height: '54px', borderRadius: '14px' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label className="form-label">Product Image</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ 
                      flex: 1, 
                      height: '100px', 
                      borderRadius: '14px', 
                      border: '2px dashed var(--surface-border)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }} onClick={() => fileInputRef.current.click()}>
                      {productForm.imageFile ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{productForm.imageFile.name}</p>
                      ) : (
                        <>
                          <LucideImage size={24} color="var(--text-secondary)" />
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Click to Upload</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        hidden
                        onChange={e => setProductForm({...productForm, imageFile: e.target.files[0]})}
                        ref={fileInputRef}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                       <input 
                        type="url" 
                        placeholder="Or paste image URL" 
                        className="form-input" 
                        value={productForm.image} 
                        onChange={e => setProductForm({...productForm, image: e.target.value})}
                        style={{ height: '54px', borderRadius: '14px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={savingProduct} style={{ height: '54px', borderRadius: '14px', flex: 2 }}>
                    {savingProduct ? 'Processing...' : (productForm._id ? <><Save size={18} /> Update Item</> : <><Plus size={18} /> Add to Menu</>)}
                  </button>
                  {productForm._id && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ height: '54px', borderRadius: '14px', flex: 1 }}>
                      <X size={18} /> Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '2rem', borderRadius: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShoppingBag size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0 }}>Active Menu</h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{store.products.length} Items</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {store.products.length === 0 ? (
                  <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Your menu is empty. Add your first item above!</p>
                ) : (
                  store.products.map(p => (
                    <div key={p._id} style={{ 
                      padding: '1.25rem', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '24px', 
                      border: '1px solid var(--surface-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', overflow: 'hidden', background: 'var(--surface-border)' }}>
                          {p.image ? (
                            <img src={getImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={20} color="var(--text-secondary)" /></div>
                          )}
                          <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={20} color="var(--text-secondary)" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '800' }}>{p.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <span style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.9rem' }}>₹{p.price}</span>
                             <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', color: 'var(--primary)', fontWeight: '700' }}>{p.category}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button 
                          onClick={() => editProduct(p)}
                          style={{ flex: 1, padding: '0.6rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => toggleAvailability(p._id)}
                          style={{ 
                            flex: 1, 
                            padding: '0.6rem', 
                            borderRadius: '12px', 
                            border: '1px solid transparent', 
                            background: p.isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                            color: p.isAvailable ? 'var(--secondary)' : 'var(--error)', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            fontWeight: '600'
                          }}
                        >
                          {p.isAvailable ? <><Eye size={14} /> Available</> : <><EyeOff size={14} /> Hidden</>}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Scan Modal */}
      {showScanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', position: 'relative' }}>
            <button onClick={() => setShowScanModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Sparkles size={40} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>AI Menu Magic</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Upload a photo of your physical menu. We'll extract the items and prices for you!</p>
            </div>

            <form onSubmit={handleScanMenu}>
              <div 
                style={{ 
                  height: '200px', 
                  borderRadius: '24px', 
                  border: '2px dashed var(--surface-border)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  background: scanFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  borderColor: scanFile ? 'var(--secondary)' : 'var(--surface-border)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => document.getElementById('scan-input').click()}
              >
                {scanFile ? (
                  <>
                    <Check size={40} color="var(--secondary)" />
                    <p style={{ color: 'white', fontWeight: '700', marginTop: '1rem' }}>{scanFile.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to change</p>
                  </>
                ) : (
                  <>
                    <LucideImage size={40} color="var(--text-secondary)" />
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Click to select menu photo</p>
                  </>
                )}
                <input id="scan-input" type="file" hidden accept="image/*" onChange={(e) => setScanFile(e.target.files[0])} />
              </div>

              {scanError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>{scanError}</p>}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!scanFile || isScanning}
                style={{ marginTop: '2rem', height: '60px', borderRadius: '18px', gap: '0.75rem' }}
              >
                {isScanning ? <><Loader2 size={24} className="spin" /> Magic is happening...</> : <><Sparkles size={20} /> Start Magic Scan</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scanning Overlay (Deeper focus) */}
      {isScanning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="pulse-circle" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(99, 102, 241, 0.5)' }}>
            <Sparkles size={60} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white' }}>Scanning Your Menu...</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '300px', textAlign: 'center' }}>Our AI is extracting items, categories, and prices just for you.</p>
        </div>
      )}

      <style>{`
        @keyframes pulse-border {
          0% { border-color: rgba(99, 102, 241, 0.2); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.1); }
          50% { border-color: rgba(99, 102, 241, 1); box-shadow: 0 0 30px rgba(99, 102, 241, 0.2); }
          100% { border-color: rgba(99, 102, 241, 0.2); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.1); }
        }
      `}</style>
    </div>
  );
}

export default ManageStore;

