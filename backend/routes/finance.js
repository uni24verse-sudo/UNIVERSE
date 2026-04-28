const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Settlement = require('../models/Settlement');
const Store = require('../models/Store');

// Middleware to ensure vendor has access
router.use(auth);

// Get settlements for a specific store owned by the vendor
router.get('/my-settlements/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        
        // Verify store belongs to vendor
        const store = await Store.findOne({ _id: storeId, admin: req.admin._id });
        if (!store) {
            return res.status(403).json({ message: 'Unauthorized access to this store\'s finances' });
        }

        const settlements = await Settlement.find({ store: storeId }).sort({ createdAt: -1 });
        
        const now = new Date();
        const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
        const isTrialActive = store.isTrialStarted && trialEnd && now < trialEnd;

        // Calculate available balance (sum of all pending settlements)
        const pendingSettlements = settlements.filter(s => s.status === 'pending');
        const availableBalance = pendingSettlements.reduce((sum, s) => sum + s.netPayable, 0);

        // Find Next Settlement (oldest pending)
        const nextSettlement = pendingSettlements.length > 0 
            ? pendingSettlements.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] 
            : null;

        // Find Previous Settlement (newest completed)
        const completedSettlements = settlements.filter(s => s.status === 'completed');
        const previousSettlement = completedSettlements.length > 0
            ? completedSettlements.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0]
            : null;

        res.json({
            settlements,
            availableBalance,
            nextSettlement,
            previousSettlement,
            isTrialActive,
            storeSettings: {
                commissionRate: 5 // Default assumption post-trial
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error retrieving settlements' });
    }
});

module.exports = router;
