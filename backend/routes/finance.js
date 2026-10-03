const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../config/prisma');
const settlementRepository = require('../repositories/settlementRepository');

// Middleware to ensure vendor has access
router.use(auth);

// Get settlements for a specific store owned by the vendor
router.get('/my-settlements/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const vendorId = req.admin.id || req.admin._id;
        
        // Verify store belongs to vendor (or vendor is superadmin)
        const where = { id: storeId };
        if (req.admin.role !== 'superadmin') {
            where.adminId = String(vendorId);
        }

        const store = await prisma.store.findFirst({ where });
        if (!store) {
            return res.status(403).json({ message: "Unauthorized access to this store's finances" });
        }

        const settlements = await settlementRepository.getStoreSettlements(storeId);
        
        const now = new Date();
        const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
        const isTrialActive = false; // Trial concept removed — always standard commission

        // Calculate available balance (sum of all pending settlements)
        const pendingSettlements = settlements.filter(s => s.status === 'pending');
        const availableBalance = pendingSettlements.reduce((sum, s) => sum + (s.netPayable || 0), 0);

        // Calculate LIVE Unsettled Balance (Orders completed after the last settlement period)
        const unsettledOrders = await prisma.order.findMany({
            where: {
                storeId,
                status: 'Completed',
                isSettled: false
            }
        });

        const liveUnsettledRevenue = unsettledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const livePlatformFees = unsettledOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);
        const livePackagingCharges = unsettledOrders.reduce((sum, o) => sum + (o.packagingCharge || 0), 0);
        const liveDeliveryCharges = unsettledOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
        const liveFoodSubtotal = Math.max(0, liveUnsettledRevenue - livePlatformFees - livePackagingCharges - liveDeliveryCharges);
        
        // Option B: 5.36% deduction on food (3% UniVerse platform + 2.36% Razorpay PG with 18% GST) + 100% Delivery Platform Fees
        const liveFoodDeductions = liveFoodSubtotal * 0.0536;
        const liveTotalDeductions = liveFoodDeductions + livePlatformFees;
        const liveUnsettledNet = Math.max(0, liveUnsettledRevenue - liveTotalDeductions);

        // Find Next Settlement (oldest pending)
        const nextSettlement = pendingSettlements.length > 0 
            ? [...pendingSettlements].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] 
            : null;

        // Find Previous Settlement (newest completed)
        const completedSettlements = settlements.filter(s => s.status === 'completed');
        const previousSettlement = completedSettlements.length > 0
            ? [...completedSettlements].sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0]
            : null;

        res.json({
            settlements,
            availableBalance: Number(availableBalance.toFixed(2)),
            liveUnsettledBalance: Number(liveUnsettledNet.toFixed(2)),
            liveUnsettledRevenue: Number(liveUnsettledRevenue.toFixed(2)),
            nextSettlement,
            previousSettlement,
            isTrialActive,
            storeSettings: {
                commissionRate: 5.36
            }
        });

    } catch (err) {
        console.error('[finance.my-settlements] Error:', err);
        res.status(500).json({ message: 'Server error retrieving settlements' });
    }
});

module.exports = router;
