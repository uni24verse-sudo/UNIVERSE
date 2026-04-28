const Order = require('../models/Order');
const Store = require('../models/Store');
const Settlement = require('../models/Settlement');

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
        // Determine the target date (yesterday if not provided)
        const targetDate = date ? new Date(date) : new Date(Date.now() - 86400000);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        console.log(`Generating settlements for date range: ${targetDate.toISOString()} to ${nextDay.toISOString()}`);

        // Find stores
        const storeQuery = specificStoreId ? { _id: specificStoreId } : {};
        const stores = await Store.find(storeQuery);

        for (const store of stores) {
            // Find all completed and cancelled (paid) orders for this store on the target date
            const completedOrders = await Order.find({
                store: store._id,
                status: 'Completed',
                createdAt: { $gte: targetDate, $lt: nextDay }
            });

            const cancelledOrders = await Order.find({
                store: store._id,
                status: 'Cancelled',
                paymentStatus: 'Confirmed', // Only penalize if payment was captured
                createdAt: { $gte: targetDate, $lt: nextDay }
            });

            if (completedOrders.length === 0 && cancelledOrders.length === 0) {
                continue; // No activity, skip settlement creation for this date
            }

            const dailyRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            const dailyCancelledVolume = cancelledOrders.reduce((sum, order) => sum + order.totalAmount, 0);

            // Calculate fees
            const gatewayRate = 0.02; // Always 2%
            
            // Determine Trial Status
            const now = new Date();
            const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
            const isTrialActive = store.isTrialStarted && trialEnd && targetDate < trialEnd;
            
            // Post-trial is 3% Platform Fee + 2% Gateway (Total 5%), Trial is 0% Platform Fee + 2% Gateway
            const profitRate = isTrialActive ? 0 : 0.03; 
            const penaltyRate = 0.04; // 4% penalty on cancelled volume

            const gatewayFee = dailyRevenue * gatewayRate;
            const platformProfit = dailyRevenue * profitRate;
            const cancellationPenalty = dailyCancelledVolume * penaltyRate;

            const totalDeductions = gatewayFee + platformProfit + cancellationPenalty;
            const netPayable = dailyRevenue - totalDeductions;

            const month = targetDate.getMonth() + 1;
            const year = targetDate.getFullYear();

            if (isTrialActive) {
                // TRIAL MODE: Accrue to Monthly Settlement
                let settlement = await Settlement.findOne({
                    store: store._id,
                    settlementType: 'monthly',
                    month,
                    year
                });

                if (!settlement) {
                    // Create new monthly settlement container
                    const startOfMonth = new Date(year, month - 1, 1);
                    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
                    
                    settlement = new Settlement({
                        store: store._id,
                        settlementType: 'monthly',
                        month,
                        year,
                        periodStart: startOfMonth,
                        periodEnd: endOfMonth,
                        totalRevenue: 0,
                        feesBreakdown: { gatewayFee: 0, platformProfit: 0, cancellationPenalty: 0 },
                        netPayable: 0,
                        status: 'pending'
                    });
                }

                // Add daily amounts to the monthly accrual
                settlement.totalRevenue += dailyRevenue;
                settlement.feesBreakdown.gatewayFee += gatewayFee;
                settlement.feesBreakdown.platformProfit += platformProfit;
                settlement.feesBreakdown.cancellationPenalty += cancellationPenalty;
                settlement.netPayable += netPayable;
                
                await settlement.save();
                console.log(`Updated Monthly Accrual for Store ${store.name}`);

            } else {
                // POST-TRIAL MODE: Create Next-Day (Daily) Settlement
                const dailySettlement = new Settlement({
                    store: store._id,
                    settlementType: 'daily',
                    month,
                    year,
                    periodStart: targetDate,
                    periodEnd: nextDay, // Period is 1 full day
                    totalRevenue: dailyRevenue,
                    feesBreakdown: {
                        gatewayFee,
                        platformProfit,
                        cancellationPenalty
                    },
                    netPayable,
                    status: 'pending'
                });

                await dailySettlement.save();
                console.log(`Created Daily Settlement for Store ${store.name}`);
            }
        }
        console.log('Settlement generation process completed.');
        return true;
    } catch (err) {
        console.error('Error generating settlements:', err);
        throw err;
    }
};

module.exports = {
    generateSettlements
};
