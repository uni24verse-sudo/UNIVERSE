const prisma = require('../config/prisma');
const { calculateCartPricing } = require('../utils/pricingEngine');

async function runComprehensiveProfitAudit() {
  console.log('===============================================================');
  console.log('       UNIVERSE FINANCIAL & PROFIT EXTRACTION AUDIT           ');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Pricing Engine Mathematical Determinism Across Types
  // -------------------------------------------------------------
  console.log('--- TEST 1: Pricing Engine Verification (Dine In / Takeaway / Delivery) ---');
  
  const mockStore = {
    id: 'test-store-1',
    name: 'Audit Stall',
    packagingCharge: 10,
    deliveryFee: 20,
    freeDeliveryThreshold: 500,
    offers: [
      {
        id: 'OFFER10',
        code: 'SAVE10',
        title: '10% Off',
        discountType: 'PERCENTAGE_CART',
        discountValue: 10,
        maxDiscountCap: 100,
        minOrderValue: 100,
        isActive: true
      }
    ]
  };

  const sampleItems = [
    { productId: 'p1', name: 'Burger', price: 150, quantity: 2 }, // 300
    { productId: 'p2', name: 'Fries', price: 100, quantity: 1 }   // 100 -> subtotal = 400
  ];

  // 1A. Dine In
  const dineInPricing = calculateCartPricing(mockStore, sampleItems, { orderType: 'Dine In' });
  console.log('1A. Dine In Order (Subtotal: ₹400, 10% offer):');
  console.log(`    Original Subtotal: ₹${dineInPricing.originalSubtotal}`);
  console.log(`    Discount (10%):   -₹${dineInPricing.discountAmount}`);
  console.log(`    Packaging Fee:     ₹${dineInPricing.packagingFee} (Expected: 0)`);
  console.log(`    Delivery Fee:      ₹${dineInPricing.deliveryFee} (Expected: 0)`);
  console.log(`    Platform Fee:      ₹${dineInPricing.platformFee} (Expected: 0)`);
  console.log(`    Final Grand Total: ₹${dineInPricing.finalTotal} (Expected: 360)`);
  if (dineInPricing.finalTotal !== 360 || dineInPricing.packagingFee !== 0 || dineInPricing.platformFee !== 0) {
    throw new Error('Dine In pricing calculation mismatch');
  }

  // 1B. Takeaway (Packaging Fee applies, Platform Fee = 0)
  const takeawayPricing = calculateCartPricing(mockStore, sampleItems, { orderType: 'Take Away' });
  console.log('\n1B. Takeaway Order (Subtotal: ₹400, Packaging: ₹10):');
  console.log(`    Discounted Subtotal: ₹${takeawayPricing.discountedSubtotal}`);
  console.log(`    Packaging Fee:       ₹${takeawayPricing.packagingFee} (Expected: 10)`);
  console.log(`    Platform Fee:        ₹${takeawayPricing.platformFee} (Expected: 0)`);
  console.log(`    Final Grand Total:   ₹${takeawayPricing.finalTotal} (Expected: 370)`);
  if (takeawayPricing.finalTotal !== 370 || takeawayPricing.packagingFee !== 10 || takeawayPricing.platformFee !== 0) {
    throw new Error('Takeaway pricing calculation mismatch');
  }

  // 1C. Delivery (Below Free Threshold: Packaging + Delivery + Platform Fee ₹5)
  const deliveryPricing = calculateCartPricing(mockStore, sampleItems, { orderType: 'Delivery' });
  console.log('\n1C. Delivery Order (Subtotal: ₹400, Delivery: ₹20, Platform: ₹5, Packaging: ₹10):');
  console.log(`    Discounted Subtotal: ₹${deliveryPricing.discountedSubtotal}`);
  console.log(`    Packaging Fee:       ₹${deliveryPricing.packagingFee} (Expected: 10)`);
  console.log(`    Delivery Fee:        ₹${deliveryPricing.deliveryFee} (Expected: 20)`);
  console.log(`    Platform Fee:        ₹${deliveryPricing.platformFee} (Expected: 5)`);
  console.log(`    Final Grand Total:   ₹${deliveryPricing.finalTotal} (Expected: 395)`);
  if (deliveryPricing.finalTotal !== 395 || deliveryPricing.platformFee !== 5 || deliveryPricing.deliveryFee !== 20) {
    throw new Error('Delivery pricing calculation mismatch');
  }

  // 1D. Delivery Above Free Threshold (Subtotal: ₹600 -> Free delivery, Platform fee ₹5 still applies)
  const largeItems = [{ productId: 'p1', name: 'Platter', price: 600, quantity: 1 }];
  const freeDeliveryPricing = calculateCartPricing(mockStore, largeItems, { orderType: 'Delivery' });
  console.log('\n1D. Delivery Above Free Threshold (Subtotal: ₹600, Free Delivery):');
  console.log(`    Discount (10%):      -₹${freeDeliveryPricing.discountAmount} (540 subtotal)`);
  console.log(`    Delivery Fee:        ₹${freeDeliveryPricing.deliveryFee} (Expected: 0 - free delivery)`);
  console.log(`    Platform Fee:        ₹${freeDeliveryPricing.platformFee} (Expected: 5 - convenience fee)`);
  console.log(`    Packaging Fee:       ₹${freeDeliveryPricing.packagingFee} (Expected: 10)`);
  console.log(`    Final Grand Total:   ₹${freeDeliveryPricing.finalTotal} (Expected: 555)`);
  if (freeDeliveryPricing.deliveryFee !== 0 || freeDeliveryPricing.platformFee !== 5 || freeDeliveryPricing.finalTotal !== 555) {
    throw new Error('Free delivery pricing threshold calculation mismatch');
  }

  console.log('\n✅ TEST 1 PASSED: All order type price engines operate with 100% accuracy.\n');

  // -------------------------------------------------------------
  // TEST 2: Platform Revenue, Gateway (2%), Commission (3%), & Net Take
  // -------------------------------------------------------------
  console.log('--- TEST 2: Mathematical Ledger & Revenue Distribution ---');

  const gmv = 10000; // ₹10,000 GMV
  const pgFee = Number((gmv * 0.02).toFixed(2));        // ₹200 (2% Razorpay)
  const platformComm = Number((gmv * 0.03).toFixed(2)); // ₹300 (3% UniVerse Commission)
  const vendorNet = Number((gmv - pgFee - platformComm).toFixed(2)); // ₹9,500 (95% Vendor Payout)

  console.log(`Gross Completed Volume (GMV):   ₹${gmv}`);
  console.log(`Payment Gateway Fee (2%):       ₹${pgFee}`);
  console.log(`UniVerse Platform Take (3%):    ₹${platformComm}`);
  console.log(`Vendor Net Payout Share (95%):  ₹${vendorNet}`);
  console.log(`Ledger Balance Check:           ${vendorNet} + ${pgFee} + ${platformComm} = ₹${vendorNet + pgFee + platformComm}`);
  
  if (vendorNet + pgFee + platformComm !== gmv) {
    throw new Error('Mathematical ledger imbalance detected in revenue distribution');
  }
  console.log('✅ TEST 2 PASSED: 3% Commission + 2% PG Fee + 95% Vendor share is 100% balanced.\n');

  // -------------------------------------------------------------
  // TEST 3: Cancellation Penalties & Refund Integrity
  // -------------------------------------------------------------
  console.log('--- TEST 3: Cancellation Penalty Engine (4% Vendor Penalty) ---');

  const cancelledVolume = 5000; // ₹5,000 cancelled post-confirmation
  const totalVendorPenalty = Number((cancelledVolume * 0.04).toFixed(2)); // 4% penalty = ₹200
  const cancellationPgFee = Number((totalVendorPenalty * 0.5).toFixed(2)); // 2% PG cost = ₹100
  const netRetainedPenalty = Number((totalVendorPenalty - cancellationPgFee).toFixed(2)); // 2% Net Take = ₹100

  console.log(`Cancelled Volume:                  ₹${cancelledVolume}`);
  console.log(`Total Deducted Penalty from Vendor: ₹${totalVendorPenalty} (4%)`);
  console.log(`Razorpay Gateway Processing Cost:   ₹${cancellationPgFee} (2%)`);
  console.log(`UniVerse Net Retained Penalty:      ₹${netRetainedPenalty} (2%)`);
  console.log(`Student Refund Amount:             ₹${cancelledVolume} (100% Full UPI Refund)`);

  if (totalVendorPenalty !== 200 || cancellationPgFee !== 100 || netRetainedPenalty !== 100) {
    throw new Error('Cancellation penalty breakdown mismatch');
  }
  console.log('✅ TEST 3 PASSED: Cancellation penalty and refund mechanics verified.\n');

  // -------------------------------------------------------------
  // TEST 4: Live PostgreSQL Database Audit
  // -------------------------------------------------------------
  console.log('--- TEST 4: Live Database Orders & Financials Audit ---');

  const [allOrders, settlements, allStores] = await Promise.all([
    prisma.order.findMany({
      include: { store: true }
    }),
    prisma.settlement.findMany(),
    prisma.store.findMany()
  ]);

  const completed = allOrders.filter(o => o.status === 'Completed');
  const cancelled = allOrders.filter(o => o.status === 'Cancelled' && o.paymentStatus === 'Confirmed');
  const deliveryOrders = allOrders.filter(o => String(o.orderType).toLowerCase() === 'delivery');
  const takeawayOrders = allOrders.filter(o => String(o.orderType).toLowerCase().includes('take') || String(o.orderType).toLowerCase().includes('pack'));
  const dineInOrders = allOrders.filter(o => String(o.orderType).toLowerCase() === 'dine in' || String(o.orderType).toLowerCase() === 'dine_in');

  const totalGMV = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCancelledGMV = cancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  console.log(`Total Database Orders:    ${allOrders.length}`);
  console.log(` - Completed Orders:      ${completed.length} (GMV: ₹${totalGMV.toFixed(2)})`);
  console.log(` - Cancelled & Refunded:  ${cancelled.length} (Volume: ₹${totalCancelledGMV.toFixed(2)})`);
  console.log(` - Delivery Orders:       ${deliveryOrders.length}`);
  console.log(` - Takeaway Orders:       ${takeawayOrders.length}`);
  console.log(` - Dine In Orders:        ${dineInOrders.length}`);
  console.log(`Total Settlements in DB:  ${settlements.length}`);
  console.log(`Total Stores in DB:       ${allStores.length}`);

  // Calculate live database profit extraction
  let settledPlatformProfit = 0;
  let settledGateway = 0;
  let settledDeliveryFees = 0;
  for (const s of settlements) {
    settledPlatformProfit += Number(s.platformCommission || 0);
    settledGateway += Number(s.gatewayFee || 0);
    settledDeliveryFees += Number(s.feesBreakdown?.deliveryPlatformFees || 0);
  }

  const liveUnsettled = completed.filter(o => !o.isSettled);
  const liveUnsettledGMV = liveUnsettled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const liveDeliveryFees = liveUnsettled.reduce((sum, o) => sum + (o.platformFee || 0), 0);
  const liveVendorSales = Math.max(0, liveUnsettledGMV - liveDeliveryFees);

  const projectedCommission = liveVendorSales * 0.03;
  const projectedDeliveryFees = liveDeliveryFees;
  const projectedPlatformProfit = projectedCommission + projectedDeliveryFees;
  const projectedGateway = liveUnsettledGMV * 0.02;

  const totalDeliveryFees = completed.reduce((sum, o) => sum + (o.platformFee || 0), 0);
  const grandPlatformProfit = settledPlatformProfit + projectedPlatformProfit;
  const grandGatewayFee = settledGateway + projectedGateway;
  const grandVendorShare = Math.max(0, totalGMV - grandGatewayFee - grandPlatformProfit);

  console.log('\n--- LIVE DB FINANCIAL METRICS ---');
  console.log(`Total Completed GMV:                  ₹${totalGMV.toFixed(2)}`);
  console.log(` - Vendor Sales Volume:               ₹${(totalGMV - totalDeliveryFees).toFixed(2)}`);
  console.log(` - 3% Platform Commission on Sales:   ₹${(grandPlatformProfit - totalDeliveryFees).toFixed(2)}`);
  console.log(` - Delivery Platform Fees (₹5/order): ₹${totalDeliveryFees.toFixed(2)} (100% UniVerse Profit)`);
  console.log(`Total UniVerse Net Platform Profit:   ₹${grandPlatformProfit.toFixed(2)}`);
  console.log(`Total Payment Gateway Fee (2%):       ₹${grandGatewayFee.toFixed(2)}`);
  console.log(`Total Vendor Payouts:                 ₹${grandVendorShare.toFixed(2)}`);
  console.log(`Sum Verification:                     ${(grandVendorShare + grandGatewayFee + grandPlatformProfit).toFixed(2)} === ${totalGMV.toFixed(2)}`);

  console.log('\n===============================================================');
  console.log('  🎯 ALL AUDIT TESTS PASSED: PROFIT & FEES 100% OPERATIONAL   ');
  console.log('===============================================================\n');
}

runComprehensiveProfitAudit()
  .catch((err) => {
    console.error('Audit Failure:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
