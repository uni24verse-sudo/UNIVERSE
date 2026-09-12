const prisma = require('../config/prisma');

async function restore() {
  const hhhStoreId = '69d2abde1f40bd3800fe4e64';

  // 1. Find all cancelled orders in PostgreSQL that are NOT Hhh
  const cancelledOrders = await prisma.order.findMany({
    where: {
      status: 'Cancelled',
      paymentStatus: 'Confirmed',
      NOT: { storeId: hhhStoreId }
    }
  });

  console.log(`Found ${cancelledOrders.length} cancelled campus orders in PostgreSQL:`);
  let totalRefunds = 0;

  for (const o of cancelledOrders) {
    totalRefunds += o.totalAmount;
    console.log(`- Order #${o.orderNumber || o.id}: ₹${o.totalAmount} to ${o.customerName} (${o.customerPhone})`);

    // Create or update Refund row in PostgreSQL
    const existing = await prisma.refund.findFirst({ where: { orderId: o.id } });
    if (!existing) {
      await prisma.refund.create({
        data: {
          id: o.id,
          refundId: `rfnd_auto_${o.id.slice(-8)}`,
          paymentId: o.razorpayPaymentId || `pay_legacy_${o.id.slice(-8)}`,
          orderId: o.id,
          userId: o.userId || `USR-${o.customerPhone?.slice(-6) || 'CUST'}`,
          customerName: o.customerName || 'Student',
          customerPhone: o.customerPhone || '',
          customerUpiId: o.customerUpiId || o.payerUpiId || '',
          amount: o.totalAmount,
          reason: o.cancellationReason || 'Order Cancelled - Auto-Refunded',
          status: 'PROCESSED',
          mode: 'DIRECT_UPI',
          settledBy: 'UniVerse Auto-Refund',
          whatsappNotified: true,
          processedAt: o.updatedAt || o.createdAt,
          settledAt: o.updatedAt || o.createdAt,
          createdAt: o.createdAt
        }
      });
      console.log(`  -> Created Refund record in PostgreSQL for Order #${o.orderNumber}`);
    }

    // Update order in PostgreSQL
    await prisma.order.update({
      where: { id: o.id },
      data: {
        refundAmount: o.totalAmount,
        refundStatus: 'Refunded'
      }
    });
  }

  // 2. Recalculate metrics for all customers
  const customers = await prisma.customer.findMany();
  for (const cust of customers) {
    const custOrders = await prisma.order.findMany({ where: { customerPhone: cust.phone } });
    const custRefunds = await prisma.refund.findMany({ where: { customerPhone: cust.phone } });

    const totalOrders = custOrders.length;
    const completedOrders = custOrders.filter(o => o.status === 'Completed').length;
    const cancelledOrders = custOrders.filter(o => o.status === 'Cancelled').length;
    const totalSpent = custOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalRefunded = custRefunds.reduce((s, r) => s + (r.amount || 0), 0);

    const updatedMetrics = {
      totalOrders,
      completedOrders,
      cancelledOrders,
      vendorRejectedOrders: 0,
      totalSpent,
      totalRefunded,
      refundRate: totalOrders > 0 ? Math.round((totalRefunded / (totalSpent + totalRefunded || 1)) * 100) : 0
    };

    await prisma.customer.update({
      where: { id: cust.id },
      data: { metrics: updatedMetrics }
    });

    if (totalRefunded > 0) {
      console.log(`Updated customer ${cust.phone} (${cust.currentName}): Spent=₹${totalSpent}, Refunded=₹${totalRefunded}`);
    }
  }

  // 3. Also update Mongoose models if connected so MongoDB remains 100% in sync
  try {
    const mongoose = require('mongoose');
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      const Customer = require('../models/Customer');
      const Refund = require('../models/Refund');
      const Order = require('../models/Order');

      for (const o of cancelledOrders) {
        await Order.updateOne(
          { _id: o.id },
          { $set: { refundAmount: o.totalAmount, refundStatus: 'Refunded' } }
        );
        const existingRef = await Refund.findOne({ orderId: o.id });
        if (!existingRef) {
          await Refund.create({
            _id: o.id,
            refundId: `rfnd_auto_${o.id.slice(-8)}`,
            paymentId: o.razorpayPaymentId || `pay_legacy_${o.id.slice(-8)}`,
            orderId: o.id,
            userId: o.userId || `USR-${o.customerPhone?.slice(-6) || 'CUST'}`,
            customerName: o.customerName || 'Student',
            customerPhone: o.customerPhone || '',
            customerUpiId: o.customerUpiId || o.payerUpiId || '',
            amount: o.totalAmount,
            reason: o.cancellationReason || 'Order Cancelled - Auto-Refunded',
            status: 'PROCESSED',
            mode: 'DIRECT_UPI',
            settledBy: 'UniVerse Auto-Refund',
            whatsappNotified: true,
            processedAt: o.updatedAt || o.createdAt,
            settledAt: o.updatedAt || o.createdAt,
            createdAt: o.createdAt
          });
        }
      }

      for (const cust of customers) {
        const custRefunds = await prisma.refund.findMany({ where: { customerPhone: cust.phone } });
        const totalRefunded = custRefunds.reduce((s, r) => s + (r.amount || 0), 0);
        if (totalRefunded > 0) {
          await Customer.updateOne(
            { phone: cust.phone },
            { $set: { 'metrics.totalRefunded': totalRefunded } }
          );
        }
      }
      await mongoose.disconnect();
      console.log('MongoDB mirror updated as well.');
    }
  } catch (mErr) {
    console.warn('MongoDB mirror warning:', mErr.message);
  }

  // Summary check
  const allCusts = await prisma.customer.findMany({ select: { metrics: true } });
  const sumOrders = allCusts.reduce((s, c) => s + (c.metrics?.totalOrders || 0), 0);
  const sumGMV = allCusts.reduce((s, c) => s + (c.metrics?.totalSpent || 0), 0);
  const sumRefunds = allCusts.reduce((s, c) => s + (c.metrics?.totalRefunded || 0), 0);

  console.log('\n=== FINAL VERIFICATION ===');
  console.log(`Total Orders: ${sumOrders}`);
  console.log(`Total Completed GMV: ₹${sumGMV}`);
  console.log(`Total Real Auto-Refunded: ₹${sumRefunds}`);
}

restore().catch(console.error).finally(() => prisma.$disconnect());
