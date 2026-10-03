import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';

const VariantModal = ({ 
  selectedProduct, 
  selectedVariant, 
  setSelectedVariant, 
  onClose, 
  addToCart, 
  storeId, 
  storeClosed 
}) => {
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  if (!selectedProduct) return null;

  const hasVariants = selectedProduct.variants && selectedProduct.variants.length > 0;
  const hasAddOns = selectedProduct.addOns && selectedProduct.addOns.length > 0;

  // Calculate dynamic price for a specific add-on based on currently selected variant size
  const getAddOnPrice = (addon) => {
    if (addon.variantPrices && selectedVariant?.name && addon.variantPrices[selectedVariant.name] !== undefined) {
      return Number(addon.variantPrices[selectedVariant.name]) || 0;
    }
    return Number(addon.price) || 0;
  };

  const toggleAddOn = (addon) => {
    const isAlreadySelected = selectedAddOns.some(a => a.name === addon.name);
    if (isAlreadySelected) {
      setSelectedAddOns(prev => prev.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddOns(prev => [...prev, { name: addon.name, rawAddon: addon }]);
    }
  };

  // Compute live total price: variant price + sum of selected add-on prices for current variant
  const addOnsTotal = useMemo(() => {
    return selectedAddOns.reduce((sum, item) => {
      const livePrice = getAddOnPrice(item.rawAddon);
      return sum + livePrice;
    }, 0);
  }, [selectedAddOns, selectedVariant]);

  const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(selectedProduct.price || 0);
  const totalLivePrice = basePrice + addOnsTotal;

  const handleConfirm = () => {
    if (storeClosed) return;
    const finalAddOnsPayload = selectedAddOns.map(item => ({
      name: item.name,
      price: getAddOnPrice(item.rawAddon)
    }));

    addToCart(selectedProduct, storeId, selectedVariant, null, finalAddOnsPayload);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in-up" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Customize Selection</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: '500' }}>{selectedProduct.name}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        
        {/* 1. SIZE / VARIANT SELECTION */}
        {hasVariants && (
          <div style={{ marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
              Choose Size
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {selectedProduct.variants.map((v, i) => {
                const isSelected = selectedVariant?.name === v.name;
                return (
                  <label key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem 1.25rem', 
                    background: isSelected ? 'hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.06)' : '#f8fafc', 
                    border: `2px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`, 
                    borderRadius: '16px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        border: `2px solid ${isSelected ? 'var(--primary)' : '#cbd5e1'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                         {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{v.name}</span>
                    </div>
                    <span style={{ fontWeight: '800', color: isSelected ? 'var(--primary)' : 'var(--text-primary)', fontSize: '0.95rem' }}>₹{v.price}</span>
                    <input type="radio" hidden checked={isSelected} onChange={() => setSelectedVariant(v)} />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. DYNAMIC SIZE-LINKED ADD-ONS & EXTRAS */}
        {hasAddOns && (
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
              Add-ons & Extras {selectedVariant ? `(for ${selectedVariant.name})` : ''}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {selectedProduct.addOns.map((addon, i) => {
                const liveAddonPrice = getAddOnPrice(addon);
                const isSelected = selectedAddOns.some(a => a.name === addon.name);
                return (
                  <label key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem 1.25rem', 
                    background: isSelected ? '#eff6ff' : '#f8fafc', 
                    border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                    borderRadius: '16px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '6px', 
                        border: `2px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: isSelected ? '#3b82f6' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                         {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? '#1e40af' : 'var(--text-primary)' }}>
                        {addon.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: '800', color: isSelected ? '#1e40af' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      +₹{liveAddonPrice}
                    </span>
                    <input type="checkbox" hidden checked={isSelected} onChange={() => toggleAddOn(addon)} />
                  </label>
                );
              })}
            </div>
          </div>
        )}
        
        {/* 3. STICKY ACTION BUTTON */}
        <button 
          className="btn btn-primary" 
          onClick={handleConfirm}
          disabled={storeClosed}
          style={{ width: '100%', height: '54px', borderRadius: '16px', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.02em', display: 'flex', justifyContent: 'space-between', padding: '0 1.5rem', alignItems: 'center' }}
        >
          <span>{storeClosed ? '🔒 STORE CLOSED' : 'ADD ITEM TO CART'}</span>
          {!storeClosed && <span>₹{totalLivePrice}</span>}
        </button>
      </div>
    </div>
  );
};

export default React.memo(VariantModal);
