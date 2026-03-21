import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const ManageStore = () => {
  const { token, vendor } = useContext(AuthContext);
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } catch (err) {
        if (err.response?.status === 404) navigate('/vendor/store/create');
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [token, navigate]);

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
        // Edit existing product
        const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/product/${productForm._id}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setStore(res.data.store);
      } else {
        // Add new product
        const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/product', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setStore(res.data);
      }
      setProductForm({ _id: null, name: '', price: '', category: '', image: '', imageFile: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      const detailedMsg = err.response?.data?.message || err.message || JSON.stringify(err);
      alert(`Error detail: ${detailedMsg}`);
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
      alert('Failed to update product availability');
    }
  };

  const toggleStoreStatus = async () => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(prev => ({ ...prev, isOpen: res.data.isOpen }));
    } catch (err) {
      alert('Failed to toggle store status');
    }
  };

  const getImageUrl = (img) => {
    if (!img) return '';
    return img.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}` : img;
  };

  if (loading) return <div className="auth-wrapper">Loading Store Data...</div>;
  if (!store) return null;

  const storeUrl = `${window.location.origin}/store/${store._id}`;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/vendor/dashboard" className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          &larr; Back
        </Link>
        <div style={{ flex: 1 }}>
          <h1>Manage {store.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: store.isOpen ? '#10b981' : '#ef4444' }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: store.isOpen ? '#10b981' : '#ef4444' }}>
              Store is {store.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>
        <button 
          onClick={toggleStoreStatus} 
          className={`btn ${store.isOpen ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: 'auto', padding: '0.5rem 1.5rem', background: store.isOpen ? 'rgba(239, 68, 68, 0.15)' : '', color: store.isOpen ? '#ef4444' : '', borderColor: store.isOpen ? '#ef4444' : '' }}
        >
          {store.isOpen ? 'Close Store' : 'Open Store'}
        </button>
      </header>

      <div className="manage-store-grid">
        {/* QR Code and Info */}
        <div className="glass-card" style={{ height: 'fit-content', textAlign: 'center' }}>
          <h3>Store QR Code</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>Print this code so customers can scan and order.</p>

          <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '12px', marginBottom: '1rem' }}>
            <QRCodeSVG id="store-qr-code" value={storeUrl} size={200} />
          </div>
          <div>
            <button className="btn btn-secondary" onClick={() => {
              const svg = document.getElementById('store-qr-code');
              const svgData = new XMLSerializer().serializeToString(svg);
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const img = new Image();
              img.onload = () => {
                canvas.width = img.width + 40; // Add padding
                canvas.height = img.height + 40;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20); // Draw image with offset padding
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `${store.name.replace(/\s+/g, '_')}_QRCode.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
              };
              img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            }} style={{ width: 'auto', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              Download QR Code
            </button>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Store Link:</p>
            <a href={storeUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--primary)' }}>
              {storeUrl}
            </a>
          </div>
        </div>

        {/* Menu Management */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 ref={formRef}>{productForm._id ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / span 2', marginBottom: '0' }}>
              <input 
                type="text" 
                placeholder="Product Name (e.g. Masala Dosa)" 
                className="form-input" 
                value={productForm.name} 
                onChange={e => setProductForm({...productForm, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <input 
                type="number" 
                placeholder="Price (₹)" 
                className="form-input" 
                value={productForm.price} 
                onChange={e => setProductForm({...productForm, price: e.target.value})}
                required 
                min="0"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <input 
                type="text" 
                placeholder="Category (e.g. Snacks, Drinks)" 
                className="form-input" 
                value={productForm.category} 
                onChange={e => setProductForm({...productForm, category: e.target.value})}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / span 2', marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem' }}>Upload Image (Or leave blank to keep current)</label>
              <input 
                type="file" 
                accept="image/*"
                className="form-input" 
                onChange={e => setProductForm({...productForm, imageFile: e.target.files[0]})}
                ref={fileInputRef}
                style={{ padding: '0.5rem' }}
              />
              <div style={{ margin: '0.5rem 0', textAlign: 'center' }}>-- OR --</div>
              <input 
                type="url" 
                placeholder="Paste direct Image URL (.jpg/.png)" 
                className="form-input" 
                value={productForm.image} 
                onChange={e => setProductForm({...productForm, image: e.target.value})}
              />
            </div>
            <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProduct}>
                {savingProduct ? 'Saving...' : (productForm._id ? 'Update Product' : 'Add Product')}
              </button>
              {productForm._id && (
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h3 style={{ marginTop: '3rem', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem' }}>Menu Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {store.products.length === 0 ? (
              <p>No products added yet.</p>
            ) : (
              store.products.map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(15,23,42,0.6)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.image ? (
                      <img src={getImageUrl(p.image)} alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems:'center', justifyContent: 'center' }}>🍲</div>
                    )}
                    <div style={{ display: 'none', width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', alignItems:'center', justifyContent: 'center' }}>🍲</div>
                    <div>
                      <strong>{p.name}</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary)' }}>₹{p.price}</p>
                        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {p.category || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => editProduct(p)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}
                    >
                      Edit 
                    </button>
                    <button 
                      onClick={() => toggleAvailability(p._id)}
                      className={`btn ${p.isAvailable ? 'btn-secondary' : 'btn-primary'}`} 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto', background: !p.isAvailable ? 'var(--error)' : '' }}
                    >
                      {p.isAvailable ? 'Available' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageStore;
