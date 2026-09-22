const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  Browsers,
  delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');

class WhatsAppMultiDeviceService {
  constructor() {
    this.MAX_SLOTS = 5;
    this.sockets = new Map(); // Map<slotIndex, WASocket>
    this.qrCodes = new Map(); // Map<slotIndex, { qrRaw: string, qrBase64: string, timestamp: number }>
    this.status = new Map();  // Map<slotIndex, string>
    this.io = null;           // Socket.io instance for live QR & status streaming
    this.sessionsBaseDir = path.join(__dirname, '..', 'sessions');
    this.isSandbox = process.env.WHATSAPP_SANDBOX_MODE === 'true';
    
    // Ensure base sessions directory exists
    if (!fs.existsSync(this.sessionsBaseDir)) {
      fs.mkdirSync(this.sessionsBaseDir, { recursive: true });
    }
  }

  setIO(io) {
    this.io = io;
  }

  /**
   * Initialize all default 5 slots in database if not present,
   * and auto-reconnect any previously connected WhatsApp sessions (unless in sandbox mode).
   */
  async init() {
    console.log(`--- Initializing WhatsApp Multi-Device (Max 5 Slots) Engine [Sandbox: ${this.isSandbox}] ---`);
    try {
      for (let i = 1; i <= this.MAX_SLOTS; i++) {
        const accounts = await prisma.channelAccount.findMany({
          where: { type: 'whatsapp', slotIndex: i },
          orderBy: { createdAt: 'asc' }
        });

        let primaryAccount = accounts[0];
        if (!primaryAccount) {
          primaryAccount = await prisma.channelAccount.create({
            data: {
              id: `wa_slot_${i}`,
              type: 'whatsapp',
              slotIndex: i,
              nickname: `WhatsApp Slot ${i}`,
              sessionPath: `sessions/whatsapp_slot_${i}`,
              status: this.isSandbox ? 'connected' : 'empty'
            }
          });
        }

        // Prune duplicate accounts for this slotIndex if any exist
        if (accounts.length > 1) {
          const duplicateIds = accounts.slice(1).map(a => a.id);
          await prisma.channelAccount.deleteMany({
            where: { id: { in: duplicateIds } }
          }).catch(() => {});
        }

        if (this.isSandbox) {
          this.status.set(i, 'empty');
          console.log(`[WhatsApp Slot ${i}] Initialized (Ready for pairing / Sandbox fallback ready).`);
          continue;
        }

        const slotSessionDir = path.join(this.sessionsBaseDir, `whatsapp_slot_${i}`);
        // If session credentials already exist, attempt auto-reconnect
        if (fs.existsSync(slotSessionDir) && fs.readdirSync(slotSessionDir).length > 0) {
          console.log(`[WhatsApp Slot ${i}] Existing session found, initiating connection...`);
          this.startSocket(i).catch(err => {
            console.error(`[WhatsApp Slot ${i}] Failed to resume session:`, err.message);
            this.status.set(i, 'empty');
          });
        } else {
          this.status.set(i, 'empty');
          await prisma.channelAccount.updateMany({
            where: { type: 'whatsapp', slotIndex: i },
            data: { status: 'empty', phoneNumber: '', pushName: '', lastActive: null }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[WhatsApp] Error during WhatsApp Multi-Device init:', err);
    }
  }

  /**
   * Start or restart Baileys socket for a specific slot (1 to 5)
   */
  async startSocket(slotIndex) {
    if (slotIndex < 1 || slotIndex > this.MAX_SLOTS) {
      throw new Error(`Invalid slot index ${slotIndex}. Only slots 1 to 5 are supported.`);
    }

    const slotSessionDir = path.join(this.sessionsBaseDir, `whatsapp_slot_${slotIndex}`);
    if (!fs.existsSync(slotSessionDir)) {
      fs.mkdirSync(slotSessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(slotSessionDir);
    let version = [2, 3000, 1043857760];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch (e) {
      // Use fallback
    }

    const socket = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      generateHighQualityLinkPreview: true
    });

    this.sockets.set(slotIndex, socket);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          this.qrCodes.set(slotIndex, {
            qrRaw: qr,
            qrBase64: qrBase64,
            timestamp: Date.now()
          });
          this.status.set(slotIndex, 'pairing');

          const account = await prisma.channelAccount.findFirst({
            where: { type: 'whatsapp', slotIndex }
          });
          if (account) {
            await prisma.channelAccount.update({
              where: { id: account.id },
              data: { status: 'pairing' }
            });
          }

          if (this.io) {
            this.io.to('superadmin_room').emit('superadmin:whatsapp_qr', {
              slotIndex,
              qrBase64
            });
          }
        } catch (err) {
          console.error(`[WhatsApp Slot ${slotIndex}] Error generating QR:`, err);
        }
      }

      if (connection === 'open') {
        console.log(`✅ [WhatsApp Slot ${slotIndex}] Connected successfully!`);
        this.qrCodes.delete(slotIndex);
        this.status.set(slotIndex, 'connected');

        const userJid = socket.user?.id || '';
        const phoneNumber = userJid.split(':')[0] || userJid.split('@')[0] || '';
        const pushName = socket.user?.name || socket.user?.notify || 'UniVerse WhatsApp';

        const account = await prisma.channelAccount.findFirst({
          where: { type: 'whatsapp', slotIndex }
        });
        if (account) {
          await prisma.channelAccount.update({
            where: { id: account.id },
            data: {
              status: 'connected',
              phoneNumber,
              pushName,
              lastActive: new Date()
            }
          });
        }

        if (this.io) {
          this.io.to('superadmin_room').emit('superadmin:whatsapp_status', {
            slotIndex,
            status: 'connected',
            phoneNumber,
            pushName
          });
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

        console.log(`[WhatsApp Slot ${slotIndex}] Connection closed. StatusCode: ${statusCode}, isLoggedOut: ${isLoggedOut}, isRestartRequired: ${isRestartRequired}`);

        this.qrCodes.delete(slotIndex);

        const account = await prisma.channelAccount.findFirst({
          where: { type: 'whatsapp', slotIndex }
        });

        if (!isLoggedOut) {
          // Normal handshake transition, timeout, or restart required
          this.status.set(slotIndex, 'disconnected');
          if (account) {
            await prisma.channelAccount.update({
              where: { id: account.id },
              data: { status: 'disconnected' }
            });
          }

          console.log(`[WhatsApp Slot ${slotIndex}] Reconnecting socket in 1.5s...`);
          setTimeout(() => {
            this.startSocket(slotIndex).catch(err => {
              console.error(`[WhatsApp Slot ${slotIndex}] Reconnect attempt failed:`, err.message);
            });
          }, 1500);
        } else {
          // Explicit logout (401)
          console.log(`[WhatsApp Slot ${slotIndex}] Logged out. Clearing credentials.`);
          this.status.set(slotIndex, 'empty');
          if (account) {
            await prisma.channelAccount.update({
              where: { id: account.id },
              data: { status: 'empty', phoneNumber: '', pushName: '', lastActive: null }
            });
          }
          this.cleanupSessionFiles(slotIndex);
        }

        if (this.io) {
          this.io.to('superadmin_room').emit('superadmin:whatsapp_status', {
            slotIndex,
            status: this.status.get(slotIndex) || 'disconnected'
          });
        }
      }
    });

    return socket;
  }

  /**
   * Request pairing QR code for a specific slot
   */
  async requestQR(slotIndex) {
    if (slotIndex < 1 || slotIndex > this.MAX_SLOTS) {
      throw new Error(`Slot must be between 1 and ${this.MAX_SLOTS}`);
    }

    // Check if slot is genuinely live and authenticated with a real phone
    const socket = this.sockets.get(slotIndex);
    const isLive = socket && this.status.get(slotIndex) === 'connected' && Boolean(socket.user?.id);
    if (isLive) {
      return { status: 'already_connected', qrBase64: null };
    }

    // Terminate any unauthenticated stale socket so a fresh pairing socket can start
    if (socket && !socket.user?.id) {
      try { socket.end(); } catch (e) {}
      this.sockets.delete(slotIndex);
      this.cleanupSessionFiles(slotIndex);
    }

    // If an active QR already exists and is fresh (< 40s), return it immediately
    const existingQR = this.qrCodes.get(slotIndex);
    if (existingQR && (Date.now() - existingQR.timestamp < 40000)) {
      return { status: 'pairing', qrBase64: existingQR.qrBase64 };
    }

    // Start or restart socket so a real Baileys QR code is generated
    await this.startSocket(slotIndex);

    // Wait up to 6 seconds for QR emission
    for (let attempt = 0; attempt < 12; attempt++) {
      await delay(500);
      const qrData = this.qrCodes.get(slotIndex);
      if (qrData) {
        return { status: 'pairing', qrBase64: qrData.qrBase64 };
      }
      if (this.status.get(slotIndex) === 'connected' && Boolean(this.sockets.get(slotIndex)?.user?.id)) {
        return { status: 'already_connected', qrBase64: null };
      }
    }

    return { status: 'pairing', qrBase64: null, message: 'QR generating, please refresh in 2 seconds...' };
  }

  /**
   * Disconnect and clear session for a slot
   */
  async disconnect(slotIndex) {
    if (slotIndex < 1 || slotIndex > this.MAX_SLOTS) {
      throw new Error(`Invalid slot index ${slotIndex}`);
    }

    const socket = this.sockets.get(slotIndex);
    if (socket) {
      try {
        await Promise.race([
          socket.logout().catch(() => {}),
          delay(1000)
        ]);
      } catch (err) {}
      try {
        socket.end();
      } catch (err) {}
      this.sockets.delete(slotIndex);
    }

    this.qrCodes.delete(slotIndex);
    this.status.set(slotIndex, 'empty');
    this.cleanupSessionFiles(slotIndex);

    await prisma.channelAccount.updateMany({
      where: { type: 'whatsapp', slotIndex },
      data: { status: 'empty', phoneNumber: '', pushName: '', lastActive: null }
    }).catch(() => {});

    if (this.io) {
      this.io.to('superadmin_room').emit('superadmin:whatsapp_status', {
        slotIndex,
        status: 'empty'
      });
    }

    return { success: true, slotIndex };
  }

  cleanupSessionFiles(slotIndex) {
    const slotSessionDir = path.join(this.sessionsBaseDir, `whatsapp_slot_${slotIndex}`);
    if (fs.existsSync(slotSessionDir)) {
      try {
        fs.rmSync(slotSessionDir, { recursive: true, force: true });
        fs.mkdirSync(slotSessionDir, { recursive: true });
      } catch (e) {
        console.error(`[WhatsApp Slot ${slotIndex}] Error clearing session dir:`, e);
      }
    }
  }

  /**
   * Get all 5 slots summary
   */
  async getAllSlotsSummary() {
    const slots = [];
    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      const accounts = await prisma.channelAccount.findMany({
        where: { type: 'whatsapp', slotIndex: i },
        orderBy: { createdAt: 'asc' }
      });

      let primary = accounts[0];
      if (!primary) {
        primary = await prisma.channelAccount.create({
          data: {
            id: `wa_slot_${i}`,
            type: 'whatsapp',
            slotIndex: i,
            nickname: `WhatsApp Slot ${i}`,
            sessionPath: `sessions/whatsapp_slot_${i}`,
            status: 'empty'
          }
        }).catch(() => null);
      }

      // Automatically prune duplicate rows for this slotIndex
      if (accounts.length > 1) {
        const duplicateIds = accounts.slice(1).map(a => a.id);
        await prisma.channelAccount.deleteMany({
          where: { id: { in: duplicateIds } }
        }).catch(() => {});
      }

      const inMemoryStatus = this.status.get(i);
      const socket = this.sockets.get(i);
      const isSocketLive = Boolean(socket?.user?.id) && inMemoryStatus === 'connected';
      let effectiveStatus = isSocketLive ? 'connected' : (inMemoryStatus === 'pairing' ? 'pairing' : 'empty');

      slots.push({
        _id: primary ? primary.id : `wa_slot_${i}`,
        id: primary ? primary.id : `wa_slot_${i}`,
        slotIndex: i,
        nickname: primary?.nickname || `WhatsApp Slot ${i}`,
        phoneNumber: isSocketLive ? (primary?.phoneNumber || socket?.user?.id?.split(':')[0] || '') : '',
        pushName: isSocketLive ? (primary?.pushName || socket?.user?.name || '') : '',
        platform: primary?.platform || 'WhatsApp Multi-Device',
        status: effectiveStatus,
        lastActive: primary?.lastActive,
        isSandbox: this.isSandbox && !isSocketLive
      });
    }

    return slots;
  }

  /**
   * Send WhatsApp message from a specific connected slot with anti-ban rate pacing
   */
  async sendMessage(slotIndex, destinationNumber, messagePayload) {
    // Sanitize destination (support both individual phone numbers and WhatsApp Group JIDs)
    let recipientJid;
    const destStr = (destinationNumber || '').toString().trim();
    if (destStr.endsWith('@g.us') || destStr.endsWith('@s.whatsapp.net')) {
      recipientJid = destStr;
    } else {
      let cleanNumber = destStr.replace(/\D/g, '');
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber; // Default to India 91 prefix
      }
      recipientJid = `${cleanNumber}@s.whatsapp.net`;
    }

    if (slotIndex < 1 || slotIndex > this.MAX_SLOTS) {
      throw new Error(`Invalid slot index ${slotIndex}`);
    }

    const socket = this.sockets.get(slotIndex);
    const isSocketReady = socket && this.status.get(slotIndex) === 'connected';

    // If slot is not genuinely connected with a live socket, but sandbox mode is active, simulate
    if (!isSocketReady && this.isSandbox) {
      console.log(`[WhatsApp Sandbox] Simulated send to ${recipientJid}:`, messagePayload.body || messagePayload.text || messagePayload);
      if (this.io) {
        this.io.to('superadmin_room').emit('superadmin:whatsapp_simulated', {
          recipient: recipientJid,
          payload: messagePayload
        });
      }
      return { success: true, messageId: `sandbox_${Date.now()}`, recipient: recipientJid, sandbox: true };
    }

    if (!isSocketReady) {
      throw new Error(`WhatsApp Slot ${slotIndex} is not connected.`);
    }

    // Construct Baileys message content
    let messageContent = {};

    if (messagePayload.headerType === 'IMAGE' && messagePayload.headerMediaUrl) {
      messageContent = {
        image: { url: messagePayload.headerMediaUrl },
        caption: messagePayload.body || ''
      };
    } else {
      messageContent = {
        text: messagePayload.body || ''
      };
    }

    if (messagePayload.footer) {
      const footerLine = `\n\n_${messagePayload.footer}_`;
      if (messageContent.caption) {
        messageContent.caption += footerLine;
      } else {
        messageContent.text += footerLine;
      }
    }

    // Format interactive buttons (URL/CTA, Quick Reply, Phone Call, OTP)
    if (messagePayload.buttons && messagePayload.buttons.length > 0) {
      const buttonLines = messagePayload.buttons.map(b => {
        const text = b.text || b.buttonText?.displayText || 'Action';
        const val = b.value || b.url || b.phoneNumber || '';
        if (b.type === 'URL' || b.url || b.type === 'CTA') {
          return `🔗 ${text}: ${val}`;
        } else if (b.type === 'PHONE_NUMBER' || b.type === 'CALL') {
          return `📞 ${text}: ${val}`;
        } else if (b.type === 'OTP') {
          return `🔑 ${text}: ${val || 'CODE'}`;
        } else {
          return `💬 [ ${text} ]`;
        }
      }).filter(Boolean).join('\n');

      if (buttonLines) {
        const block = `\n\n${buttonLines}`;
        if (messageContent.caption) {
          messageContent.caption += block;
        } else {
          messageContent.text += block;
        }
      }
    }

    // Anti-ban jitter delay (between 1.5s and 2.5s)
    const jitter = Math.floor(1500 + Math.random() * 1000);
    await delay(jitter);

    const result = await socket.sendMessage(recipientJid, messageContent);
    return { success: true, messageId: result.key.id, recipient: recipientJid };
  }

  /**
   * Helper to send a direct message using the first available connected slot
   */
  async sendDirectMessage(destinationNumber, textMessage, options = {}) {
    if (!destinationNumber || (!textMessage && !options.headerMediaUrl)) return false;

    // Find any slot with a genuine connected live socket
    for (let slot = 1; slot <= this.MAX_SLOTS; slot++) {
      if (this.status.get(slot) === 'connected' && this.sockets.has(slot)) {
        try {
          await this.sendMessage(slot, destinationNumber, { 
            body: textMessage,
            ...options
          });
          console.log(`✅ [WhatsApp Direct] Message sent to ${destinationNumber} via Slot ${slot}`);
          return true;
        } catch (err) {
          console.warn(`[WhatsApp Direct] Slot ${slot} send failed, trying next:`, err.message);
        }
      }
    }

    // Fallback to sandbox simulation if active and no live socket is available
    if (this.isSandbox) {
      console.log(`[WhatsApp Sandbox Direct] Message to ${destinationNumber}: ${textMessage}`);
      return true;
    }

    console.warn(`⚠️ [WhatsApp Direct] No connected WhatsApp slot available to send message to ${destinationNumber}`);
    return false;
  }

  /**
   * Fetch all participating WhatsApp groups from connected WhatsApp instance
   */
  async fetchParticipatingGroups(slotIndex = null) {
    let targetSocket = null;
    if (slotIndex && this.sockets.has(slotIndex) && this.status.get(slotIndex) === 'connected') {
      targetSocket = this.sockets.get(slotIndex);
    } else {
      for (let s = 1; s <= this.MAX_SLOTS; s++) {
        if (this.status.get(s) === 'connected' && this.sockets.has(s)) {
          targetSocket = this.sockets.get(s);
          break;
        }
      }
    }

    if (!targetSocket) {
      if (this.isSandbox) {
        return [
          {
            id: 'sandbox-group@g.us',
            subject: 'UniVerse UAT Sandbox Group',
            creation: Math.floor(Date.now() / 1000),
            owner: 'admin',
            desc: 'Simulated WhatsApp Group for UAT Sandbox',
            participantsCount: 5
          }
        ];
      }
      return [];
    }

    try {
      const groupsMap = await targetSocket.groupFetchAllParticipating();
      const groups = Object.values(groupsMap).map(g => ({
        id: g.id,
        subject: g.subject,
        creation: g.creation,
        owner: g.owner,
        desc: g.desc,
        participantsCount: g.participants?.length || 0
      }));
      return groups;
    } catch (err) {
      console.error('[WhatsApp] Error fetching participating groups:', err.message);
      return [];
    }
  }

  /**
   * Send a high-priority refund alert to the configured Team WhatsApp Group & Admin Phones
   */
  async sendRefundAlertToTeam({ order, refund }) {
    try {
      let config = await prisma.refundConfig.findFirst();
      if (!config) {
        config = {
          groupJid: process.env.REFUND_ALERT_WHATSAPP_GROUP_JID || '',
          phoneNumbers: ['7985397373', '8295886832'],
          notifyGroup: true,
          notifyPhones: true
        };
      }

      const amount = Number((order.totalAmount || refund.amount || 0)).toFixed(2);
      const studentName = order.customerName || refund.customerName || 'Student';
      const studentPhone = order.customerPhone || refund.customerPhone || 'N/A';
      const upiId = refund.customerUpiId || order.customerUpiId || order.payerUpiId || 'Pending student input';
      const storeName = order.store?.name || 'Kitchen Counter';
      const reason = order.cancellationReason || refund.reason || 'Vendor rejected or timeout';
      
      const cleanNote = `UniVerse${order.orderNumber || ''}`;
      const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName.replace(/[^a-zA-Z0-9 ]/g, ''))}&am=${amount}&tn=${cleanNote}&cu=INR`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiPayLink)}`;

      const refundIdentifier = refund.id || refund._id;
      const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || 'https://uat.food.universeorder.co.in';
      const frontendUrl = process.env.FRONTEND_URL || 'https://uat.food.universeorder.co.in';
      const claimPayUrl = `${baseUrl}/api/orders/refund/claim-pay/${refundIdentifier}`;
      const adminDeskUrl = `${frontendUrl}/super-admin/panel?tab=refunds`;

      const alertMessage = 
        `🚨 *NEW REFUND REQUEST* 💸\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Order:* #${order.orderNumber} (${storeName})\n` +
        `👤 *Student:* ${studentName} (${studentPhone})\n` +
        `💰 *Refund Amount:* ₹${amount}\n` +
        `💳 *Target UPI ID:* \`${upiId}\`\n` +
        `⚠️ *Reason:* ${reason}\n\n` +
        `📷 *Scan the attached QR code in GPay/Paytm to pay instantly!*\n\n` +
        `⚡ *1-Tap Mobile Claim & Launchpad:*\n` +
        `${claimPayUrl}\n\n` +
        `🖥️ *Super Admin Desk:*\n` +
        `${adminDeskUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_UniVerse Automated Refund Dispatch_`;

      const destinations = [];
      const phoneList = Array.isArray(config.phoneNumbers) ? config.phoneNumbers : [];

      if (config.notifyGroup && config.groupJid) {
        destinations.push(config.groupJid);
      }
      if (config.notifyPhones && phoneList.length > 0) {
        for (const p of phoneList) {
          if (!destinations.includes(p)) destinations.push(p);
        }
      }
      if (destinations.length === 0) {
        if (process.env.REFUND_ALERT_WHATSAPP_GROUP_JID) {
          destinations.push(process.env.REFUND_ALERT_WHATSAPP_GROUP_JID);
        } else {
          destinations.push('7985397373');
        }
      }

      // Real-time telemetry to Super Admin web portal
      if (this.io) {
        this.io.to('superadmin_room').emit('superadmin:refund_alert', {
          orderNumber: order.orderNumber,
          amount,
          studentName,
          studentPhone,
          upiId,
          reason,
          claimPayUrl
        });
      }

      for (const dest of destinations) {
        this.sendDirectMessage(dest, alertMessage, {
          headerType: 'IMAGE',
          headerMediaUrl: qrImageUrl
        }).catch(e => {
          console.error(`[WhatsApp Refund Alert] Failed to send to ${dest}:`, e.message);
        });
      }
    } catch (err) {
      console.error('[WhatsApp] sendRefundAlertToTeam Error:', err.message);
    }
  }

  /**
   * Post settlement confirmation into Team WhatsApp Group so no one pays twice
   */
  async sendRefundSettlementNoticeToTeam({ order, refund, settledBy }) {
    try {
      const config = await prisma.refundConfig.findFirst();
      const destinations = [];
      if (config?.notifyGroup && config?.groupJid) {
        destinations.push(config.groupJid);
      } else if (process.env.REFUND_ALERT_WHATSAPP_GROUP_JID) {
        destinations.push(process.env.REFUND_ALERT_WHATSAPP_GROUP_JID);
      }

      if (destinations.length === 0) return;

      const amount = Number((order.totalAmount || refund.amount || 0)).toFixed(2);
      const studentName = order.customerName || refund.customerName || 'Student';
      const upiId = refund.customerUpiId || order.customerUpiId || 'UPI';
      const utrText = refund.utr ? `\n📌 *Bank Ref / UTR:* ${refund.utr}` : '';

      const settledMessage =
        `✅ *REFUND SETTLED & COMPLETED* 🎉\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Order:* #${order.orderNumber}\n` +
        `👤 *Student:* ${studentName}\n` +
        `💰 *Amount:* ₹${amount}\n` +
        `💳 *Transferred to:* \`${upiId}\`${utrText}\n` +
        `👤 *Settled by:* ${settledBy || 'Super Admin'}\n` +
        `⏰ *Time:* ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_Status: Order marked Refunded in database._`;

      for (const dest of destinations) {
        this.sendDirectMessage(dest, settledMessage).catch(e => {
          console.error(`[WhatsApp Settlement Notice] Failed to send to ${dest}:`, e.message);
        });
      }
    } catch (err) {
      console.error('[WhatsApp] sendRefundSettlementNoticeToTeam Error:', err.message);
    }
  }
}

const whatsappMultiDeviceService = new WhatsAppMultiDeviceService();
module.exports = whatsappMultiDeviceService;
