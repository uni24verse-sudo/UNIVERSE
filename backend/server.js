const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

const prisma = require('./config/prisma');
const { normalizeOrder } = require('./utils/pgAdapter');
const telegramService = require('./services/telegramService');
const refundService = require('./services/refundService');
const whatsappMultiDeviceService = require('./services/whatsappMultiDeviceService');
const journeyEngineService = require('./services/journeyEngineService');

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize WhatsApp Multi-Device & Journey Engine services
whatsappMultiDeviceService.setIO(io);

// ⚡ AWS RDS PostgreSQL Connection & Background Services Boot
prisma.$connect()
  .then(() => {
    console.log('✅ [UniVerse] Connected to AWS RDS PostgreSQL via Prisma ORM (100% Native)');
    whatsappMultiDeviceService.init().catch(err => console.error('[WhatsApp] Engine Init Error:', err.message));
    journeyEngineService.start();
  })
  .catch(err => {
    console.error('❌ [UniVerse] PostgreSQL connection error:', err.message);
  });

// Health check endpoint
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Route Registrations
app.use('/api/auth', require('./routes/auth'));
app.use('/api/store', require('./routes/store'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/scan-menu', require('./routes/menuScanner'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/super-admin/channels', require('./routes/channelSettings'));
app.use('/api/super-admin/master-templates', require('./routes/masterTemplates'));
app.use('/api/super-admin/broadcasting', require('./routes/broadcasting'));
app.use('/api/super-admin/customers', require('./routes/superAdminCustomers'));
app.use('/api/super-admin/master-data', require('./routes/superAdminMasterData'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/banners', require('./routes/banners'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Join Store Room with Server-Side Authorization
  socket.on('join_store_room', (data) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log(`WARN: Socket ${socket.id} attempted to join store room without token`);
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      
      const authorizedStoreId = socket.user.storeId || socket.user._id || socket.user.id;
      const requestedStoreId = data.storeId || data;

      if (!authorizedStoreId || requestedStoreId.toString() !== authorizedStoreId.toString()) {
        console.log(`WARN: Socket ${socket.id} attempted to join unauthorized room ${requestedStoreId}`);
        return;
      }

      socket.join(authorizedStoreId.toString());
      console.log(`Socket ${socket.id} securely joined authorized room ${authorizedStoreId}`);
    } catch (err) {
      console.log(`WARN: Socket ${socket.id} provided invalid token for store room`);
    }
  });

  // Join SuperAdmin Room with Server-Side Authorization
  socket.on('join_superadmin_room', async (data) => {
    const token = (data && data.token) || socket.handshake.auth.token;
    if (!token) {
      console.log(`WARN: Socket ${socket.id} attempted to join superadmin room without token`);
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let isSuperAdmin = decoded.role === 'superadmin';

      if (!isSuperAdmin && (decoded._id || decoded.id)) {
        const adminUser = await prisma.admin.findUnique({
          where: { id: String(decoded._id || decoded.id) }
        });
        if (adminUser && adminUser.role === 'superadmin') {
          isSuperAdmin = true;
        }
      }

      if (!isSuperAdmin) {
        console.log(`WARN: Socket ${socket.id} attempted to join superadmin room with invalid role: ${decoded.role}`);
        return;
      }

      socket.join('superadmin_room');
      console.log(`Socket ${socket.id} (SuperAdmin) joined superadmin_room`);
    } catch (err) {
      console.log(`WARN: Socket ${socket.id} invalid token for superadmin room`);
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

// Background job to handle timeouts and automated store schedules
setInterval(async () => {
  try {
    const now = new Date();
    const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    
    // 1. Cancel expired orders (ASAP and Pre-orders) and trigger direct UPI refund queue
    // ASAP timeout: 5 mins; Pre-order timeout: 15 mins
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'Pending',
        OR: [
          { isPreOrder: false, createdAt: { lt: fiveMinsAgo } },
          { isPreOrder: true, createdAt: { lt: fifteenMinsAgo } }
        ]
      },
      include: { store: true }
    });

    for (const order of expiredOrders) {
      await refundService.handleOrderCancellation({
        orderId: order.id,
        reason: order.isPreOrder ? 'Pre-order acceptance timed out (15 mins)' : 'Vendor acceptance timed out (5 mins)',
        actorType: 'SYSTEM',
        actorId: 'AUTO_TIMEOUT',
        io
      }).catch(err => console.error(`[AutoTimeout] Cancellation error for order #${order.orderNumber}:`, err.message));

      const normalized = normalizeOrder(order);
      io.to(order.storeId).emit('order_status_update', normalized);
      io.to(order.id).emit('order_status_update', normalized);
      console.log(`Auto-cancelled order #${order.orderNumber} due to timeout.`);
    }

    // 2. Automated Store Opening/Closing (IST Based)
    const automatedStores = await prisma.store.findMany({
      where: { isAutomated: true }
    });
    
    const currentHHMM = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    for (const store of automatedStores) {
      try {
        const shouldBeOpen = currentHHMM >= store.openingTime && currentHHMM < store.closingTime;
        if (store.isOpen !== shouldBeOpen) {
          await prisma.store.update({
            where: { id: store.id },
            data: { isOpen: shouldBeOpen }
          });

          io.emit('store_status_update', { storeId: store.id, isOpen: shouldBeOpen });
          await telegramService.sendStatusAlert(store, shouldBeOpen).catch(() => {});
          
          console.log(`Automated (IST ${currentHHMM}): Store ${store.name} is now ${shouldBeOpen ? 'OPEN' : 'CLOSED'}`);
        }
      } catch (storeErr) {
        console.error(`Automation error for store ${store.name} (${store.id}):`, storeErr.message);
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
