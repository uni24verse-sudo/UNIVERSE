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
app.use(cors());
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
