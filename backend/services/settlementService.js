const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Calculates and creates settlements for the previous day.
 * - Stores in free trial: Added to a running monthly settlement.
 * - Post-trial stores: Created as a daily settlement.
 *
 * @param {Date} date - The date to process (defaults to yesterday)
 * @param {String} specificStoreId - Optional, if processing just one store (e.g. "Hhh")
 */
const generateSettlements = async (date = null, specificStoreId = null) => {
    try {
        let startOfYesterday, endOfYesterday;

        if (date) {
            startOfYesterday = new Date(date);
            startOfYesterday.setUTCHours(0, 0, 0, 0);
            endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000);
        } else {
            // Strictly calculate IST midnights regardless of server timezone
            const nowUtc = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            
            // Shift current UTC time to represent IST 
            const nowIst = new Date(nowUtc.getTime() + istOffset);
            
            // Subtract 24 hours to get "yesterday" in IST
            const yesterdayIst = new Date(nowIst.getTime() - 24 * 60 * 60 * 1000);
            
            // Truncate to 00:00:00. Because we shifted by IST, setting UTCHours zeroes out the IST day.
            yesterdayIst.setUTCHours(0, 0, 0, 0);
            
            // Shift back to true UTC time
            startOfYesterday = new Date(yesterdayIst.getTime() - istOffset);
            endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000);
        }

        console.log(`[settlementService] Generating settlements for range: ${startOfYesterday.toISOString()} to ${endOfYesterday.toISOString()}`);

        // Find stores
        const stores = await prisma.store.findMany(
            specificStoreId ? { where: { id: specificStoreId } } : {}
        );

        for (const store of stores) {
            // Find all completed and cancelled (paid) orders for this store on the target date
            // CRITICAL: Only pick up orders that haven't been settled yet
            const completedOrders = await prisma.order.findMany({
                where: {
                    storeId: store.id,
                    status: 'Completed',
                    isSettled: false,
                    createdAt: { lt: endOfYesterday }
                }
            });

            const cancelledOrders = await prisma.order.findMany({
                where: {
                    storeId: store.id,
                    status: 'Cancelled',
                    paymentStatus: 'Confirmed',
                    isSettled: false,
                    createdAt: { lt: endOfYesterday }
                }
            });

            if (completedOrders.length === 0 && cancelledOrders.length === 0) {
                continue; // No activity, skip settlement creation for this date
            }

            const dailyRevenue = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            const dailyPlatformFees = completedOrders.reduce((sum, order) => sum + (order.platformFee || 0), 0);
            const dailyPackagingCharges = completedOrders.reduce((sum, order) => sum + (order.packagingCharge || 0), 0);
            const dailyDeliveryCharges = completedOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

            // Food items subtotal = totalAmount - platformFee - packagingCharge - deliveryFee
            const dailyFoodSubtotal = Math.max(0, dailyRevenue - dailyPlatformFees - dailyPackagingCharges - dailyDeliveryCharges);
            const dailyVendorSales = Math.max(0, dailyRevenue - dailyPlatformFees);
            const dailyCancelledVolume = cancelledOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            // Option B Settlement: 5.36% total deduction on food items (3% UniVerse commission + 2.36% Razorpay PG with 18% GST)
            // 100% Delivery Platform Fees (retained by UniVerse)
            // 100% of Packaging & Delivery charges passed directly to vendor
            const gatewayRate = 0.0236; // 2% PG fee base + 18% GST (0.36%) = 2.36% on food items subtotal
            const profitRate = 0.03;   // 3% UniVerse platform commission on food items subtotal
            const penaltyRate = 0.04;  // 4% penalty on cancelled volume

            const gatewayFee = dailyFoodSubtotal * gatewayRate;
            const platformCommission = dailyFoodSubtotal * profitRate;
            const cancellationPenalty = dailyCancelledVolume * penaltyRate;
            const totalPlatformProfit = platformCommission + dailyPlatformFees;

            // Total deductions from Gross = 2.36% PG on food + 3% Commission on food + 100% Delivery Platform Fees + cancellation penalty
            const totalDeductions = gatewayFee + platformCommission + dailyPlatformFees + cancellationPenalty;
            const netPayable = dailyRevenue - totalDeductions;

            const month = startOfYesterday.getMonth() + 1;
            const year = startOfYesterday.getFullYear();

            let finalSettlementId;

            // T+1 Daily Settlement — 3% commission + 2.36% PG on food + 100% packaging/delivery to vendor + delivery platform fees to platform
            const dailySettlement = await prisma.settlement.create({
                data: {
                    id: crypto.randomUUID(),
                    storeId: store.id,
                    adminId: store.adminId || null,
                    settlementType: 'daily',
                    month,
                    year,
                    periodStart: startOfYesterday,
                    periodEnd: endOfYesterday,
                    totalOrders: completedOrders.length,
                    totalRevenue: Number(dailyRevenue.toFixed(2)),
                    grossSales: Number(dailyVendorSales.toFixed(2)),
                    gatewayFee: Number(gatewayFee.toFixed(2)),
                    platformCommission: Number(totalPlatformProfit.toFixed(2)),
                    cancellationPenalties: Number(cancellationPenalty.toFixed(2)),
                    feesBreakdown: {
                        foodItemsSubtotal: Number(dailyFoodSubtotal.toFixed(2)),
                        packagingChargesPassed: Number(dailyPackagingCharges.toFixed(2)),
                        deliveryChargesPassed: Number(dailyDeliveryCharges.toFixed(2)),
                        gatewayFee: Number(gatewayFee.toFixed(2)),
                        gatewayRateApplied: '2.36% (2% + 18% GST)',
                        commissionRate3Pct: Number(platformCommission.toFixed(2)),
                        deliveryPlatformFees: Number(dailyPlatformFees.toFixed(2)),
                        platformProfit: Number(totalPlatformProfit.toFixed(2)),
                        cancellationPenalty: Number(cancellationPenalty.toFixed(2))
                    },
                    netPayable: Number(netPayable.toFixed(2)),
                    status: 'pending'
                }
            });

            finalSettlementId = dailySettlement.id;
            console.log(`[settlementService] Created Daily Settlement for Store ${store.name || store.id}`);

            // MARK ORDERS AS SETTLED
            const allOrderIds = [
                ...completedOrders.map(o => o.id),
                ...cancelledOrders.map(o => o.id)
            ];

            if (allOrderIds.length > 0) {
                await prisma.order.updateMany({
                    where: { id: { in: allOrderIds } },
                    data: { 
                        isSettled: true, 
                        settlementId: finalSettlementId 
                    }
                });
                console.log(`[settlementService] Linked ${allOrderIds.length} orders to settlement ${finalSettlementId}`);
            }
        }
        console.log('[settlementService] Settlement generation process completed.');
        return true;
    } catch (err) {
        console.error('[settlementService] Error generating settlements:', err);
        throw err;
    }
};

module.exports = {
    generateSettlements
};
