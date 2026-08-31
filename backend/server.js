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

const jwt = require('jsonwebtoken');

// Removed global io.use middleware to allow unauthenticated customers to track orders via socket.io

// Make io accessible to our router
app.set('io', io);

const path = require('path');

// Middleware
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
  'https://universe-sepia.vercel.app',
  'https://www.universeorder.co.in',
  'https://universeorder.co.in'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins to prevent React Native WebSocket blocking
    callback(null, true);
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
app.get('/ping', (req, res) => res.status(200).send('pong'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/store', require('./routes/store'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/scan-menu', require('./routes/menuScanner'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/employees', require('./routes/employees'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Join Store Room with Server-Side Authorization
  socket.on('join_store_room', (data) => {
    // data can be an object with token and storeId, or just storeId
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log(`WARN: Socket ${socket.id} attempted to join store room without token`);
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      
      const authorizedStoreId = socket.user.storeId || socket.user._id;
      const requestedStoreId = data.storeId || data;

      if (!authorizedStoreId || requestedStoreId.toString() !== authorizedStoreId.toString()) {
        console.log(`WARN: Socket ${socket.id} attempted to join unauthorized room ${requestedStoreId}`);
        return; // Reject unauthorized join attempt
      }

      socket.join(authorizedStoreId.toString());
      console.log(`Socket ${socket.id} securely joined authorized room ${authorizedStoreId}`);
    } catch (err) {
      console.log(`WARN: Socket ${socket.id} provided invalid token for store room`);
    }
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
    // Standardize to Indian Standard Time (IST)
    const nowIST = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    // 1. Cancel expired orders (ASAP and Pre-orders)
    // acceptDeadline is stored as a Date object in MongoDB (usually UTC)
    // We compare it against current server time which is also UTC-comparable
    const expiredOrders = await Order.find({ status: 'Pending', acceptDeadline: { $lt: new Date() } });
    for (const order of expiredOrders) {
      order.status = 'Cancelled';
      await order.save();
      io.to(order.store.toString()).emit('order_status_update', order);
      io.to(order._id.toString()).emit('order_status_update', order);
      console.log(`Auto-cancelled order #${order.orderNumber} due to timeout.`);
    }

    // 2. Pre-Order Telegram Reminders (15 mins and 10 mins before)
    // Process 15-min reminders
    const preOrder15 = await Order.find({
      isPreOrder: true,
      status: 'Confirmed',
      reminder15Sent: false,
      scheduledTime: { $ne: null }
    }).populate('store');

    for (const order of preOrder15) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      const scheduledDate = new Date(nowIST);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const diffMs = scheduledDate.getTime() - nowIST.getTime();
      const diffMins = diffMs / (1000 * 60);

      // Trigger if pickup is in 10-15 minutes
      if (diffMins > 0 && diffMins <= 15) {
        const store = order.store;
        if (store) {
          await telegramService.sendPreOrder15MinReminder(store, order);
          order.reminder15Sent = true;
          await order.save();
          console.log(`Sent 15-min preparation reminder for Pre-Order #${order.orderNumber}`);
        }
      }
    }

    // Process 10-min reminders
    const imminentPreOrders = await Order.find({
      isPreOrder: true,
      status: 'Confirmed',
      reminder10Sent: false,
      scheduledTime: { $ne: null }
    }).populate('store');

    for (const order of imminentPreOrders) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      const scheduledDate = new Date(nowIST);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const diffMs = scheduledDate.getTime() - nowIST.getTime();
      const diffMins = diffMs / (1000 * 60);

      // Trigger if pickup is in 0-10 minutes (with a small buffer for missed jobs)
      if (diffMins > -5 && diffMins <= 10) {
        const store = order.store;
        if (store) {
          await telegramService.sendPreOrderFinalAlert(store, order);
          order.reminder10Sent = true;
          await order.save();
          console.log(`Sent 10-min FINAL reminder for Pre-Order #${order.orderNumber}`);
        }
      }
    }

    // 3. Automated Store Opening/Closing (IST Based)
    const automatedStores = await Store.find({ isAutomated: { $ne: false } });
    
    // Robust HH:mm calculation for IST
    const currentHHMM = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    for (const store of automatedStores) {
      try {
        // Comparison works because we use HH:mm in IST
        const shouldBeOpen = currentHHMM >= store.openingTime && currentHHMM < store.closingTime;
        if (store.isOpen !== shouldBeOpen) {
          store.isOpen = shouldBeOpen;
          await store.save();
          io.emit('store_status_update', { storeId: store._id, isOpen: shouldBeOpen });
          
          // Notify via Telegram
          await telegramService.sendStatusAlert(store, shouldBeOpen);
          
          console.log(`Automated (IST ${currentHHMM}): Store ${store.name} is now ${shouldBeOpen ? 'OPEN' : 'CLOSED'}`);
        }
      } catch (storeErr) {
        console.error(`Automation error for store ${store.name} (${store._id}):`, storeErr.message);
      }
    }

  } catch (err) {
    console.error('Background job global error:', err);
  }
}, 30000); // Check every 30 seconds

// Initialize Cron Jobs
const { initCronJobs } = require('./scripts/cronJobs');
initCronJobs();

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
