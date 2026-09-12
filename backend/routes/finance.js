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
        const isTrialActive = store.isTrialStarted && trialEnd && now < trialEnd;

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
        
        // Apply 5% fee assumption for live display (2% gateway + 3% platform), or 2% in trial
        const liveFeeRate = isTrialActive ? 0.02 : 0.05;
        const liveUnsettledNet = liveUnsettledRevenue * (1 - liveFeeRate);

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
            availableBalance,
            liveUnsettledBalance: liveUnsettledNet,
            liveUnsettledRevenue,
            nextSettlement,
            previousSettlement,
            isTrialActive,
            storeSettings: {
                commissionRate: isTrialActive ? 2 : 5
            }
        });

    } catch (err) {
        console.error('[finance.my-settlements] Error:', err);
        res.status(500).json({ message: 'Server error retrieving settlements' });
    }
});

module.exports = router;
