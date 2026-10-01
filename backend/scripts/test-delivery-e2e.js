const crypto = require('crypto');
const prisma = require('../config/prisma');
const pricingEngine = require('../utils/pricingEngine');
const axios = require('axios');

async function runEndToEndTests() {
  console.log('🚀 Starting Universal Delivery System End-to-End Test Suite...\n');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Pricing Engine Verification (Phase 1)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Pricing Engine (Phase 1) ---');
    const mockStore = {
      hasDeliveryService: true,
      deliveryFee: 30,
      freeDeliveryThreshold: 200,
      minDeliveryOrderValue: 99,
      packagingCharge: 10,
    };

    // Case A: Delivery under free threshold (₹150 subtotal)
    const pricingUnder = pricingEngine.calculateCartPricing(
      mockStore,
      [{ price: 150, quantity: 1 }],
      { orderType: 'Delivery' }
    );
    assert(pricingUnder.deliveryFee === 30, 'Applies ₹30 delivery fee below free threshold');
    assert(pricingUnder.platformFee === 5, 'Applies ₹5 platform fee for Delivery');
    assert(pricingUnder.packagingFee === 10, 'Applies ₹10 packaging fee');
    assert(pricingUnder.finalTotal === 195, 'Correct total for delivery under threshold (150 + 30 + 5 + 10 = 195)');

    // Case B: Delivery meeting free threshold (₹250 subtotal)
    const pricingFree = pricingEngine.calculateCartPricing(
      mockStore,
      [{ price: 250, quantity: 1 }],
      { orderType: 'Delivery' }
    );
    assert(pricingFree.deliveryFee === 0, 'Waives delivery fee when free threshold met');
    assert(pricingFree.platformFee === 5, 'Retains ₹5 platform fee even on free delivery');
    assert(pricingFree.finalTotal === 265, 'Correct total with free delivery (250 + 0 + 5 + 10 = 265)');

    // Case C: Dine In / Takeaway (No platform fee, no delivery fee)
    const pricingTakeaway = pricingEngine.calculateCartPricing(
      mockStore,
      [{ price: 150, quantity: 1 }],
      { orderType: 'Take Away' }
    );
    assert(pricingTakeaway.deliveryFee === 0, 'Zero delivery fee for takeaway');
    assert(pricingTakeaway.platformFee === 0, 'Zero platform fee for takeaway');

    // -------------------------------------------------------------
    // Test 2: Database Schema & Migration Columns (Phase 1)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Database Schema & Columns (Phase 1) ---');
    const existingStore = await prisma.store.findFirst();
    assert(existingStore !== null, 'Existing store found in database');
    assert('hasDeliveryService' in existingStore, 'Store has hasDeliveryService column');
    assert('deliveryFee' in existingStore, 'Store has deliveryFee column');
    assert('freeDeliveryThreshold' in existingStore, 'Store has freeDeliveryThreshold column');
    assert('minDeliveryOrderValue' in existingStore, 'Store has minDeliveryOrderValue column');

    // -------------------------------------------------------------
    // Test 3: Delivery Order Lifecycle (Phases 1, 2, 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Delivery Order Creation & OTP Generation ---');
    const testOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const testOrderId = crypto.randomUUID();
    const testOrder = await prisma.order.create({
      data: {
        id: testOrderId,
        storeId: existingStore.id,
        orderNumber: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
        status: 'Ready',
        orderType: 'Delivery',
        deliveryAddress: 'Hostel BH-1, Room 402, North Wing',
        deliveryOtp: testOtp,
        deliveryFee: 25,
        platformFee: 5,
        packagingChargeApplied: 10,
        totalAmount: 180,
        paymentStatus: 'Confirmed',
        customerName: 'Test Student',
        customerPhone: '9876543210',
        items: [{ name: 'Paneer Butter Masala', quantity: 1, price: 140 }]
      }
    });

    assert(testOrder.id !== undefined, 'Test delivery order created in database');
    assert(testOrder.orderType === 'Delivery', 'Order orderType stored as "Delivery"');
    assert(testOrder.deliveryAddress === 'Hostel BH-1, Room 402, North Wing', 'Delivery address stored verbatim');
    assert(testOrder.deliveryOtp === testOtp, '4-digit delivery PIN generated and stored');
    assert(testOrder.platformFee === 5, '₹5 platform fee stored on order');

    // -------------------------------------------------------------
    // Test 4: Rider Dispatch API (Phase 2 & 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Rider Dispatch & WhatsApp Link Generation ---');
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ id: 'test-admin', role: 'admin' }, process.env.JWT_SECRET || 'secret');
    const dispatchRes = await axios.post('http://localhost:5000/api/delivery/dispatch', {
      storeId: existingStore.id,
      orderIds: [testOrder.id],
      riderName: 'Vikram Singh',
      riderPhone: '919876543210'
    }, {
      headers: { Authorization: `Bearer ${testToken}` }
    });

    assert(dispatchRes.status === 200, 'Dispatch endpoint returned HTTP 200');
    assert(dispatchRes.data.success === true, 'Dispatch succeeded');
    assert(dispatchRes.data.dispatchedCount === 1, 'Dispatched count is 1');
    assert(dispatchRes.data.dispatchLink.includes('/deliver/'), 'Magic link generated with /deliver/ token');

    // Verify order in database was updated
    const dispatchedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert(dispatchedOrder.status === 'Out for Delivery', 'Order status updated to Out for Delivery');
    assert(dispatchedOrder.riderName === 'Vikram Singh', 'Rider name saved on order');
    assert(dispatchedOrder.riderPhone === '9876543210', 'Rider phone cleaned and saved on order');
    assert(dispatchedOrder.dispatchedAt !== null, 'dispatchedAt timestamp recorded');

    // -------------------------------------------------------------
    // Test 5: Public Rider Cockpit Endpoint (Phase 2)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Public Rider Cockpit API ---');
    const cockpitRes = await axios.get(`http://localhost:5000/api/delivery/cockpit/${testOrder.id}`);
    assert(cockpitRes.status === 200, 'Cockpit endpoint returned HTTP 200');
    assert(cockpitRes.data.stops && cockpitRes.data.stops.length === 1, 'Cockpit returned trip stops array');
    assert(cockpitRes.data.stops[0].deliveryAddress.includes('BH-1'), 'Cockpit displays customer delivery address');
    assert(cockpitRes.data.stops[0].customerName === 'Test Student', 'Cockpit displays customer name');

    // -------------------------------------------------------------
    // Test 6: 4-Digit PIN Verification (Phase 2 & 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: 4-Digit PIN Drop-off Verification ---');
    
    // Attempt with WRONG PIN
    try {
      await axios.post('http://localhost:5000/api/delivery/verify-stop', {
        orderId: testOrder.id,
        pin: '0000'
      });
      assert(false, 'Wrong PIN should fail');
    } catch (pinErr) {
      assert(pinErr.response && pinErr.response.status === 400, 'Wrong PIN rejected with HTTP 400 Invalid PIN');
    }

    // Attempt with CORRECT PIN
    const verifyRes = await axios.post('http://localhost:5000/api/delivery/verify-stop', {
      orderId: testOrder.id,
      pin: testOtp
    });
    assert(verifyRes.status === 200, 'Correct PIN accepted with HTTP 200');
    assert(verifyRes.data.success === true, 'Verification success returned');

    // Verify order completed in database
    const completedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert(completedOrder.status === 'Completed', 'Order status marked "Completed"');
    assert(completedOrder.deliveredAt !== null, 'deliveredAt timestamp recorded');

    // -------------------------------------------------------------
    // Test 7: SuperAdmin Order Filter Verification (Phase 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: SuperAdmin Order Filter (Phase 5) ---');
    const deliveryOrdersInDb = await prisma.order.findMany({
      where: { orderType: 'Delivery' }
    });
    assert(deliveryOrdersInDb.length > 0, 'Database query by orderType: "Delivery" functions correctly');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log('\n🧹 Cleaned up test order from database.');

  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n==============================================`);
  if (failures === 0) {
    console.log('🎉 ALL TESTS PASSED! Ready for UAT Push.');
    process.exit(0);
  } else {
    console.error(`💥 ${failures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runEndToEndTests();
