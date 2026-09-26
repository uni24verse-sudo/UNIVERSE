/**
 * UniVerse Core Pricing & Offer Engine
 * Deterministic, server-side and client-compatible promotional calculation
 * Supports Percentage off Cart, Percentage off Category, Flat Price Overrides (e.g. all drinks/chaap at ₹50), and Flat Rupee Discounts
 */

/**
 * Check if an offer is currently within active date range
 */
function isOfferDateValid(offer) {
  if (!offer) return false;
  const now = new Date();
  if (offer.startDate) {
    const start = new Date(offer.startDate);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (offer.endDate) {
    const end = new Date(offer.endDate);
    if (!isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

/**
 * Calculate pricing for a cart against store offers
 * @param {Object} store - Store object containing offers and packagingCharge
 * @param {Array} cartItems - Array of items { productId, name, category, price, quantity, variant }
 * @param {Object} options - { orderType: 'Dine In' | 'Take Away', selectedOfferId: string }
 */
function calculateCartPricing(store, cartItems = [], options = {}) {
  const orderType = options.orderType || 'Dine In';
  const selectedOfferId = options.selectedOfferId || null;
  const couponCode = options.couponCode ? String(options.couponCode).trim().toUpperCase() : null;
  const items = Array.isArray(cartItems) ? cartItems : [];

  // 1. Calculate original subtotal and normalize items
  let originalSubtotal = 0;
  const normalizedItems = items.map((item) => {
    const unitPrice = Number(item.price) || 0;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const itemSubtotal = unitPrice * qty;
    originalSubtotal += itemSubtotal;
    return {
      ...item,
      productId: String(item.productId || item._id || item.id || ''),
      name: item.name || 'Item',
      category: (item.category || '').trim(),
      price: unitPrice,
      quantity: qty,
      itemSubtotal
    };
  });

  const packagingFee = orderType === 'Take Away' ? Number(store?.packagingCharge || 0) : 0;

  // 2. Fetch and combine store offers and platform global offers
  const rawStoreOffers = Array.isArray(store?.offers) ? store.offers.map(o => ({ ...o, isGlobal: false })) : [];
  const rawGlobalOffers = Array.isArray(options.globalOffers) ? options.globalOffers.map(o => ({ ...o, isGlobal: true })) : [];
  
  // Combine all offers, avoiding duplicates by code or id
  const seenCodes = new Set();
  const allActiveOffers = [];

  for (const offer of [...rawStoreOffers, ...rawGlobalOffers]) {
    if (!offer || offer.isActive === false || !isOfferDateValid(offer)) continue;
    const key = (offer.code || offer.id || '').toUpperCase();
    if (key && seenCodes.has(key)) continue;
    if (key) seenCodes.add(key);
    allActiveOffers.push(offer);
  }

  const eligibleOffers = [];
  const ineligibleOffers = [];
  let couponStatus = null;

  for (const offer of allActiveOffers) {
    const minOrder = Number(offer.minOrderValue) || 0;
    const val = Number(offer.discountValue) || 0;
    const maxCap = Number(offer.maxDiscountCap) || 0;
    const targetCategories = Array.isArray(offer.targetCategories)
      ? offer.targetCategories.map((c) => c.toLowerCase().trim())
      : [];
    const targetProductIds = Array.isArray(offer.targetProductIds)
      ? offer.targetProductIds.map((p) => String(p).trim())
      : [];

    if (originalSubtotal < minOrder) {
      ineligibleOffers.push({
        offer,
        shortfall: minOrder - originalSubtotal,
        reason: `Add ₹${(minOrder - originalSubtotal).toFixed(0)} more to unlock this offer`
      });
      continue;
    }

    let discount = 0;
    const itemDiscounts = {};

    switch (offer.discountType) {
      case 'PERCENTAGE_CART': {
        const rawDiscount = originalSubtotal * (val / 100);
        discount = maxCap > 0 ? Math.min(rawDiscount, maxCap) : rawDiscount;
        break;
      }

      case 'PERCENTAGE_CATEGORY': {
        let catSubtotal = 0;
        normalizedItems.forEach((item) => {
          if (targetCategories.includes(item.category.toLowerCase())) {
            catSubtotal += item.itemSubtotal;
          }
        });

        if (catSubtotal > 0) {
          const rawDiscount = catSubtotal * (val / 100);
          discount = maxCap > 0 ? Math.min(rawDiscount, maxCap) : rawDiscount;
        }
        break;
      }

      case 'FLAT_PRICE_CATEGORY': {
        // Example: All drinks or chaap at flat ₹50
        // For each matching item: if item.price > val, save (item.price - val) * qty
        normalizedItems.forEach((item) => {
          if (targetCategories.includes(item.category.toLowerCase())) {
            if (item.price > val) {
              const perUnitSaving = item.price - val;
              const totalSaving = perUnitSaving * item.quantity;
              discount += totalSaving;
              itemDiscounts[item.productId] = {
                originalPrice: item.price,
                dealPrice: val,
                saving: totalSaving
              };
            }
          }
        });
        if (maxCap > 0 && discount > maxCap) {
          discount = maxCap;
        }
        break;
      }

      case 'FLAT_PRICE_ITEMS': {
        // Specific products at flat price
        normalizedItems.forEach((item) => {
          if (targetProductIds.includes(item.productId)) {
            if (item.price > val) {
              const perUnitSaving = item.price - val;
              const totalSaving = perUnitSaving * item.quantity;
              discount += totalSaving;
              itemDiscounts[item.productId] = {
                originalPrice: item.price,
                dealPrice: val,
                saving: totalSaving
              };
            }
          }
        });
        if (maxCap > 0 && discount > maxCap) {
          discount = maxCap;
        }
        break;
      }

      case 'FLAT_DISCOUNT_CART': {
        discount = Math.min(val, originalSubtotal);
        break;
      }

      default:
        break;
    }

    if (discount > 0) {
      eligibleOffers.push({
        offer,
        discountAmount: Math.round(discount * 100) / 100,
        itemDiscounts
      });
    }
  }

  // 3. Select best offer or user-selected offer
  let selectedEvaluation = null;

  if (options.removeOffer === true || selectedOfferId === 'NONE') {
    // Explicitly removed by user
    selectedEvaluation = null;
  } else if (couponCode) {
    // User explicitly searched/typed a coupon code
    const matchingOffer = allActiveOffers.find(
      (o) => (o.code || '').toUpperCase() === couponCode
    );

    if (!matchingOffer) {
      couponStatus = {
        valid: false,
        code: couponCode,
        message: `Coupon code "${couponCode}" is invalid or expired.`
      };
    } else {
      const eligible = eligibleOffers.find(
        (e) => (e.offer.code || '').toUpperCase() === couponCode
      );

      if (eligible) {
        selectedEvaluation = eligible;
        couponStatus = {
          valid: true,
          code: couponCode,
          message: `Coupon "${couponCode}" applied successfully! Saved ₹${eligible.discountAmount}`
        };
      } else {
        const inelig = ineligibleOffers.find(
          (ie) => (ie.offer?.code || '').toUpperCase() === couponCode
        );
        couponStatus = {
          valid: false,
          code: couponCode,
          message: inelig?.reason || `Cart total does not meet the minimum requirement for "${couponCode}".`
        };
      }
    }
  } else if (selectedOfferId) {
    selectedEvaluation = eligibleOffers.find(
      (e) => String(e.offer.id) === String(selectedOfferId)
    );
  }

  // Auto-apply highest discount if no explicit eligible selection and not explicitly removed
  if (!selectedEvaluation && !couponCode && selectedOfferId !== 'NONE' && options.removeOffer !== true && eligibleOffers.length > 0) {
    selectedEvaluation = eligibleOffers.reduce((best, curr) =>
      curr.discountAmount > best.discountAmount ? curr : best
    );
  }

  const discountAmount = selectedEvaluation ? selectedEvaluation.discountAmount : 0;
  const discountedSubtotal = Math.max(0, originalSubtotal - discountAmount);
  const finalTotal = Math.max(0, Math.round((discountedSubtotal + packagingFee) * 100) / 100);

  // Compute item-level final details
  const itemPricing = normalizedItems.map((item) => {
    let effectiveUnitPrice = item.price;
    let itemSaving = 0;

    if (selectedEvaluation && selectedEvaluation.itemDiscounts[item.productId]) {
      const detail = selectedEvaluation.itemDiscounts[item.productId];
      effectiveUnitPrice = detail.dealPrice;
      itemSaving = detail.saving;
    }

    return {
      ...item,
      originalUnitPrice: item.price,
      effectiveUnitPrice,
      effectiveSubtotal: effectiveUnitPrice * item.quantity,
      itemSaving
    };
  });

  return {
    originalSubtotal: Math.round(originalSubtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountedSubtotal: Math.round(discountedSubtotal * 100) / 100,
    packagingFee: Math.round(packagingFee * 100) / 100,
    finalTotal,
    appliedOffer: selectedEvaluation
      ? {
          id: selectedEvaluation.offer.id,
          code: selectedEvaluation.offer.code || '',
          title: selectedEvaluation.offer.title,
          discountType: selectedEvaluation.offer.discountType,
          discountValue: selectedEvaluation.offer.discountValue,
          badgeText:
            selectedEvaluation.offer.badgeText ||
            (selectedEvaluation.offer.discountType.includes('PERCENTAGE')
              ? `${selectedEvaluation.offer.discountValue}% OFF`
              : selectedEvaluation.offer.discountType.includes('FLAT_PRICE')
              ? `AT ₹${selectedEvaluation.offer.discountValue}`
              : `₹${selectedEvaluation.offer.discountValue} OFF`),
          discountAmount: selectedEvaluation.discountAmount,
          isGlobal: Boolean(selectedEvaluation.offer.isGlobal)
        }
      : null,
    eligibleOffers: eligibleOffers.map((e) => ({
      ...e.offer,
      potentialDiscount: e.discountAmount
    })),
    ineligibleOffers,
    couponStatus
  };
}

module.exports = {
  calculateCartPricing,
  isOfferDateValid
};
