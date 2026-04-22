import React from 'react';
import { X } from 'lucide-react';

const VariantModal = ({ 
  selectedProduct, 
  selectedVariant, 
  setSelectedVariant, 
  onClose, 
  addToCart, 
  storeId, 
  storeClosed 
}) => {
  if (!selectedProduct) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Customize Selection</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '500' }}>{selectedProduct.name}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {selectedProduct.variants.map((v, i) => (
            <label key={i} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1.25rem', 
              background: selectedVariant === v ? 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.05)' : '#f8fafc', 
              border: `2px solid ${selectedVariant === v ? 'var(--primary)' : 'transparent'}`, 
              borderRadius: '20px', 
              cursor: 'pointer', 
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  border: `2px solid ${selectedVariant === v ? 'var(--primary)' : '#cbd5e1'}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: selectedVariant === v ? 'var(--primary)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                   {selectedVariant === v && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>}
                </div>
                <span style={{ fontWeight: '700', fontSize: '1rem', color: selectedVariant === v ? 'var(--primary)' : 'var(--text-primary)' }}>{v.name}</span>
              </div>
              <span style={{ fontWeight: '800', color: selectedVariant === v ? 'var(--primary)' : 'var(--text-primary)', fontSize: '1rem' }}>₹{v.price}</span>
              <input type="radio" hidden checked={selectedVariant === v} onChange={() => setSelectedVariant(v)} />
            </label>
          ))}
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={() => {
            if (storeClosed) return;
            addToCart(selectedProduct, storeId, selectedVariant);
            onClose();
          }}
          disabled={storeClosed}
          style={{ width: '100%', height: '56px', borderRadius: '18px', fontSize: '1rem', letterSpacing: '0.02em' }}
        >
          {storeClosed ? '🔒 STORE CLOSED' : `ADD SELECTION - ₹${selectedVariant?.price}`}
        </button>
      </div>
    </div>
  );
};

export default React.memo(VariantModal);
