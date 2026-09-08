const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Customer = require('../models/Customer');
const Order = require('../models/Order');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const totalOrders = await Order.countDocuments();
  const completedOrders = await Order.countDocuments({ status: 'Completed' });
  const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
  
  const customerAgg = await Customer.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        totalSpent: { $sum: '$metrics.totalSpent' },
        totalOrders: { $sum: '$metrics.totalOrders' },
        completedOrders: { $sum: '$metrics.completedOrders' },
        cancelledOrders: { $sum: '$metrics.cancelledOrders' },
        totalRefunded: { $sum: '$metrics.totalRefunded' }
      }
    }
  ]);

  console.log('MongoDB Order counts: total =', totalOrders, 'completed =', completedOrders, 'cancelled =', cancelledOrders);
  console.log('Customer Aggregations across all 33 customers:', customerAgg[0]);

  await mongoose.disconnect();
}
test();
