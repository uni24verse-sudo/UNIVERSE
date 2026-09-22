const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');

// Enforce Super Admin authentication for all partner routes
router.use(superAdminAuth);

/**
 * Helper: Calculate current cumulative platform profit from the authoritative ledger
 * Incorporates:
 * 1. Settled platform profit (3%) and cancellation penalties (4%) from prisma.settlement
 * 2. Live unsettled completed orders (3%) and cancelled orders (4%)
 * 3. Accurate accounting independent of Razorpay's refund ignorance
 */
async function calculateAuthoritativePlatformProfit() {
  const settlements = await prisma.settlement.findMany();
  let settledPlatformProfit = 0;
  let settledCancellationPenalty = 0;
  let settledGatewayFee = 0;

  for (const s of settlements) {
    const f = s.feesBreakdown && typeof s.feesBreakdown === 'object' ? s.feesBreakdown : {};
    settledGatewayFee += Number(f.gatewayFee || s.gatewayFee || 0);
    settledPlatformProfit += Number(f.platformProfit || s.platformCommission || 0);
    settledCancellationPenalty += Number(f.cancellationPenalty || s.cancellationPenalties || 0);
  }

  // Live unsettled orders (Sequential queries for connection pool safety)
  const unsettledCompleted = await prisma.order.findMany({
    where: { status: 'Completed', isSettled: false }
  });
  const unsettledCancelled = await prisma.order.findMany({
    where: { status: 'Cancelled', paymentStatus: 'Confirmed', isSettled: false }
  });

  const liveCompletedVolume = unsettledCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const liveCancelledVolume = unsettledCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const projectedGatewayFee = parseFloat((liveCompletedVolume * 0.02).toFixed(2));
  const projectedPlatformProfit = parseFloat((liveCompletedVolume * 0.03).toFixed(2));
  const projectedCancellationPenalty = parseFloat((liveCancelledVolume * 0.04).toFixed(2));

  const totalGatewayFee = parseFloat((settledGatewayFee + projectedGatewayFee).toFixed(2));
  const totalPlatformProfit = parseFloat((settledPlatformProfit + projectedPlatformProfit).toFixed(2));
  const totalCancellationPenalty = parseFloat((settledCancellationPenalty + projectedCancellationPenalty).toFixed(2));
  
  // Total platform withholdings (UniVerse profit take = 3% commission + 4% cancellation protection)
  const totalUniVerseProfit = parseFloat((totalPlatformProfit + totalCancellationPenalty).toFixed(2));
  const totalPlatformDeductions = parseFloat((totalGatewayFee + totalUniVerseProfit).toFixed(2));

  // Fetch all settled distribution runs to calculate previously distributed profit
  const previousRuns = await prisma.distributionRun.findMany({
    where: { status: { in: ['PAID', 'SETTLED', 'COMPLETED'] } }
  });

  const previouslyDistributed = previousRuns.reduce((sum, r) => sum + (r.grossPlatformProfit || 0), 0);
  const availableTotalDeductionsPool = Math.max(0, parseFloat((totalPlatformDeductions - previouslyDistributed).toFixed(2)));
  const availableNetProfitPool = Math.max(0, parseFloat((totalUniVerseProfit - previouslyDistributed).toFixed(2)));
  
  // Default to total deductions (₹98.16) as tracked in finance tracker, or pure profit
  const availableDistributablePool = availableTotalDeductionsPool;

  return {
    totalPlatformProfit,
    totalCancellationPenalty,
    totalGatewayFee,
    totalUniVerseProfit,
    totalPlatformDeductions,
    previouslyDistributed: parseFloat(previouslyDistributed.toFixed(2)),
    availableDistributablePool,
    availableTotalDeductionsPool,
    availableNetProfitPool,
    previousRunsCount: previousRuns.length
  };
}

/**
 * 1. GET /api/super-admin/partners
 * Fetch all partners, equity cap table summary, and their individual lifetime earnings & live dividends
 */
router.get('/', async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        payouts: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    const poolInfo = await calculateAuthoritativePlatformProfit();

    const activePartners = partners.filter(p => p.status === 'ACTIVE');
    const totalAllocatedEquity = activePartners.reduce((sum, p) => sum + (p.equityShare || 0), 0);
    const treasuryReserveEquity = Math.max(0, parseFloat((100 - totalAllocatedEquity).toFixed(2)));

    const partnersWithMetrics = partners.map(p => {
      const totalPaid = p.payouts
        .filter(pay => pay.status === 'PAID')
        .reduce((sum, pay) => sum + (pay.amount || 0), 0);

      const pendingPayout = p.payouts
        .filter(pay => pay.status === 'PENDING')
        .reduce((sum, pay) => sum + (pay.amount || 0), 0);

      // Real-time live dividend share of current undistributed pool
      const liveUnclaimedDividend = p.status === 'ACTIVE' && poolInfo.availableDistributablePool > 0
        ? parseFloat(((poolInfo.availableDistributablePool * p.equityShare) / 100).toFixed(2))
        : 0;

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        equityShare: p.equityShare,
        upiId: p.upiId,
        bankAccount: p.bankAccount,
        status: p.status,
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        pendingPayout: parseFloat(pendingPayout.toFixed(2)),
        liveUnclaimedDividend,
        payoutsCount: p.payouts.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    res.json({
      partners: partnersWithMetrics,
      capTable: {
        totalAllocatedEquity: parseFloat(totalAllocatedEquity.toFixed(2)),
        treasuryReserveEquity,
        isFullyAllocated: totalAllocatedEquity === 100,
        isValid: totalAllocatedEquity <= 100
      },
      poolInfo
    });
  } catch (err) {
    console.error('[partners.get] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. POST /api/super-admin/partners
 * Add a new equity partner with cap table guardrail (<= 100%)
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, role, equityShare, upiId, bankAccount } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Partner name is required.' });
    }

    const share = parseFloat(equityShare) || 0;
    if (share <= 0 || share > 100) {
      return res.status(400).json({ message: 'Equity share must be greater than 0% and at most 100%.' });
    }

    // Check existing active equity sum
    const existingActive = await prisma.partner.findMany({ where: { status: 'ACTIVE' } });
    const currentTotal = existingActive.reduce((sum, p) => sum + (p.equityShare || 0), 0);

    if (currentTotal + share > 100.001) {
      return res.status(400).json({
        message: `Cannot allocate ${share}%. Current allocated equity is ${currentTotal.toFixed(2)}%. Maximum available is ${(100 - currentTotal).toFixed(2)}%.`
      });
    }

    const newPartner = await prisma.partner.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email ? email.trim() : '',
        phone: phone ? phone.trim() : '',
        role: role || 'Co-Founder',
        equityShare: share,
        upiId: upiId ? upiId.trim() : '',
        bankAccount: bankAccount && typeof bankAccount === 'object' ? bankAccount : {},
        status: 'ACTIVE'
      }
    });

    res.status(201).json({ success: true, partner: newPartner });
  } catch (err) {
    console.error('[partners.create] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. PUT /api/super-admin/partners/:id
 * Update partner details and/or equity share with cap table validation
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, equityShare, upiId, bankAccount, status } = req.body;

    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    const newShare = equityShare !== undefined ? parseFloat(equityShare) : partner.equityShare;
    const newStatus = status || partner.status;

    if (newStatus === 'ACTIVE') {
      const otherActive = await prisma.partner.findMany({
        where: {
          id: { not: id },
          status: 'ACTIVE'
        }
      });
      const otherTotal = otherActive.reduce((sum, p) => sum + (p.equityShare || 0), 0);

      if (otherTotal + newShare > 100.001) {
        return res.status(400).json({
          message: `Cannot set equity to ${newShare}%. Total equity would exceed 100% (currently ${(otherTotal + newShare).toFixed(2)}%).`
        });
      }
    }

    const updated = await prisma.partner.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : partner.name,
        email: email !== undefined ? email.trim() : partner.email,
        phone: phone !== undefined ? phone.trim() : partner.phone,
        role: role !== undefined ? role : partner.role,
        equityShare: newShare,
        upiId: upiId !== undefined ? upiId.trim() : partner.upiId,
        bankAccount: bankAccount !== undefined ? bankAccount : partner.bankAccount,
        status: newStatus
      }
    });

    res.json({ success: true, partner: updated });
  } catch (err) {
    console.error('[partners.update] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. DELETE /api/super-admin/partners/:id
 * Safe deletion: Permanently delete if no payouts exist, or soft-deactivate if payouts exist
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { payouts: true }
    });

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found.' });
    }

    if (partner.payouts && partner.payouts.length > 0) {
      await prisma.partner.update({
        where: { id },
        data: { status: 'INACTIVE', equityShare: 0 }
      });
      return res.json({ success: true, message: 'Partner has historical payouts. Status deactivated and equity set to 0%.' });
    }

    await prisma.partner.delete({ where: { id } });
    res.json({ success: true, message: 'Partner removed permanently.' });
  } catch (err) {
    console.error('[partners.delete] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. GET /api/super-admin/partners/distribution/preview
 * Simulate distribution math before committing (Zero-leakage guarantee)
 */
router.get('/distribution/preview', async (req, res) => {
  try {
    const reservePct = parseFloat(req.query.reservePercentage) || 0;
    const poolMode = req.query.poolMode || 'total_deductions';
    const poolInfo = await calculateAuthoritativePlatformProfit();

    const activePartners = await prisma.partner.findMany({
      where: { status: 'ACTIVE', equityShare: { gt: 0 } },
      orderBy: { equityShare: 'desc' }
    });

    const grossPool = poolMode === 'net_profit' ? poolInfo.availableNetProfitPool : poolInfo.availableTotalDeductionsPool;
    const reserveAmount = parseFloat(((grossPool * reservePct) / 100).toFixed(2));
    const netDistributable = Math.max(0, parseFloat((grossPool - reserveAmount).toFixed(2)));

    let allocatedSum = 0;
    const partnerAllocations = activePartners.map(p => {
      const shareAmount = parseFloat(((netDistributable * p.equityShare) / 100).toFixed(2));
      allocatedSum += shareAmount;
      return {
        partnerId: p.id,
        name: p.name,
        role: p.role,
        upiId: p.upiId,
        equityShare: p.equityShare,
        amount: shareAmount
      };
    });

    const treasuryRemainder = parseFloat((netDistributable - allocatedSum).toFixed(2));

    res.json({
      grossPool,
      poolMode,
      reservePercentage: reservePct,
      reserveAmount,
      netDistributable,
      allocatedSum: parseFloat(allocatedSum.toFixed(2)),
      treasuryRemainder: treasuryRemainder > 0 ? treasuryRemainder : 0,
      partnerAllocations,
      poolInfo
    });
  } catch (err) {
    console.error('[partners.preview] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. POST /api/super-admin/partners/distribution/execute
 * Commit an immutable distribution run with UTRs and snapshotting
 */
router.post('/distribution/execute', async (req, res) => {
  try {
    const { title, reservePercentage = 0, poolMode = 'total_deductions', notes = '', partnerPayouts = [] } = req.body;

    const poolInfo = await calculateAuthoritativePlatformProfit();
    const availablePool = poolMode === 'net_profit' ? poolInfo.availableNetProfitPool : poolInfo.availableTotalDeductionsPool;

    if (availablePool <= 0) {
      return res.status(400).json({ message: 'No undistributed profit available to distribute at this time.' });
    }

    const reservePct = parseFloat(reservePercentage) || 0;
    const reserveAmount = parseFloat(((availablePool * reservePct) / 100).toFixed(2));
    const netDistributable = Math.max(0, parseFloat((availablePool - reserveAmount).toFixed(2)));

    const activePartners = await prisma.partner.findMany({
      where: { status: 'ACTIVE', equityShare: { gt: 0 } }
    });

    if (activePartners.length === 0) {
      return res.status(400).json({ message: 'No active partners configured with equity share.' });
    }

    const runId = 'RUN-' + Date.now();
    const runTitle = title && title.trim() ? title.trim() : `Profit Distribution - ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;

    // Create DistributionRun and its PartnerPayout records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.distributionRun.create({
        data: {
          id: runId,
          title: runTitle,
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          grossPlatformProfit: availablePool,
          cancellationPenaltyIncluded: poolInfo.totalCancellationPenalty,
          netCommissionIncluded: poolInfo.totalPlatformProfit,
          reservePercentage: reservePct,
          reserveAmount,
          netDistributableAmount: netDistributable,
          status: 'PAID',
          notes: notes ? notes.trim() : ''
        }
      });

      // Prepare individual payouts
      const createdPayouts = [];
      for (const p of activePartners) {
        // Check if admin provided a specific UTR in payload
        const userProvided = (partnerPayouts || []).find(item => item.partnerId === p.id);
        const utr = userProvided && userProvided.utrNumber ? userProvided.utrNumber.trim() : `SETTLED-${Date.now()}`;
        const payoutAmt = parseFloat(((netDistributable * p.equityShare) / 100).toFixed(2));

        const payout = await tx.partnerPayout.create({
          data: {
            id: crypto.randomUUID(),
            runId: run.id,
            partnerId: p.id,
            partnerName: p.name,
            sharePercentage: p.equityShare,
            amount: payoutAmt,
            status: 'PAID',
            utrNumber: utr,
            paidAt: new Date()
          }
        });
        createdPayouts.push(payout);
      }

      return { run, payouts: createdPayouts };
    });

    res.status(201).json({
      success: true,
      message: 'Distribution run executed successfully and locked into ledger.',
      run: result.run,
      payouts: result.payouts
    });
  } catch (err) {
    console.error('[partners.execute] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 7. PUT /api/super-admin/partners/payouts/:payoutId/utr
 * Update Bank UTR reference for an individual payout
 */
router.put('/payouts/:payoutId/utr', async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { utrNumber } = req.body;

    if (!utrNumber || utrNumber.trim() === '') {
      return res.status(400).json({ message: 'UTR / Transaction Reference Number is required.' });
    }

    const updated = await prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        utrNumber: utrNumber.trim(),
        status: 'PAID',
        paidAt: new Date()
      }
    });

    res.json({ success: true, payout: updated });
  } catch (err) {
    console.error('[partners.utr] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 8. GET /api/super-admin/partners/distribution/history
 * Complete historical ledger of past distribution runs
 */
router.get('/distribution/history', async (req, res) => {
  try {
    const runs = await prisma.distributionRun.findMany({
      include: {
        payouts: {
          include: { partner: { select: { id: true, name: true, role: true, upiId: true } } },
          orderBy: { amount: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(runs);
  } catch (err) {
    console.error('[partners.history] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
