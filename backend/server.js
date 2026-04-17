require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible to our router
app.set('io', io);

const path = require('path');

// Middleware
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://universe-sepia.vercel.app',
  'https://www.universeorder.co.in',
  'https://universeorder.co.in'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS Policy Error: Origin not allowed.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Failed to connect to MongoDB', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/store', require('./routes/store'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/scan-menu', require('./routes/menuScanner'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Vendors can join a room based on their Store ID to listen for orders
  socket.on('join_store_room', (storeId) => {
    socket.join(storeId);
    console.log(`Socket ${socket.id} joined room ${storeId}`);
  });

  socket.on('join_order_room', (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined order room ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const Order = require('./models/Order');
const Store = require('./models/Store');
const telegramService = require('./services/telegramService');


// Background job to handle timeouts and pre-order reminders
setInterval(async () => {
  try {
    const now = new Date();

    // 1. Cancel expired orders (ASAP and Pre-orders)
    const expiredOrders = await Order.find({ status: 'Pending', acceptDeadline: { $lt: now } });
    for (const order of expiredOrders) {
      order.status = 'Cancelled';
      await order.save();
      io.to(order.store.toString()).emit('order_status_update', order);
      io.to(order._id.toString()).emit('order_status_update', order);
      console.log(`Auto-cancelled order #${order.orderNumber} due to timeout.`);
    }

    // 2. Send Telegram reminders for pre-orders (30 mins before)
    // We look for Confirmed pre-orders that haven't been reminded yet
    const upcomingPreOrders = await Order.find({
      isPreOrder: true,
      status: 'Confirmed',
      reminderSent: false,
      scheduledTime: { $ne: null }
    }).populate('store');

    for (const order of upcomingPreOrders) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      // If current time is within 30-35 mins of scheduled time
      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > 0 && diffMins <= 30) {
        const store = order.store;
        if (store) {
          await telegramService.sendPreOrderReminder(store, order);
          order.reminderSent = true;
          await order.save();
          console.log(`Sent 30-min preparation reminder for Pre-Order #${order.orderNumber}`);
        }
      }
    }

    // 3. Send FINAL Telegram reminders for pre-orders (10 mins before)
    const imminentPreOrders = await Order.find({
      isPreOrder: true,
      status: 'Confirmed',
      reminder10Sent: false,
      scheduledTime: { $ne: null }
    }).populate('store');

    for (const order of imminentPreOrders) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > 0 && diffMins <= 10) {
        const store = order.store;
        if (store) {
          await telegramService.sendPreOrderFinalAlert(store, order);
          order.reminder10Sent = true;
          await order.save();
          console.log(`Sent 10-min FINAL reminder for Pre-Order #${order.orderNumber}`);
        }
      }
    }
  } catch (err) {
    console.error('Background job error:', err);
  }
}, 30000); // Check every 30 seconds for reminders

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
