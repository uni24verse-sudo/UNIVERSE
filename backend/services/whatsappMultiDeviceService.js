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
const ChannelAccount = require('../models/ChannelAccount');

class WhatsAppMultiDeviceService {
  constructor() {
    this.MAX_SLOTS = 5;
    this.sockets = new Map(); // Map<slotIndex, WASocket>
    this.qrCodes = new Map(); // Map<slotIndex, { qrRaw: string, qrBase64: string, timestamp: number }>
    this.status = new Map();  // Map<slotIndex, string>
    this.io = null;           // Socket.io instance for live QR & status streaming
    this.sessionsBaseDir = path.join(__dirname, '..', 'sessions');
    
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
   * and auto-reconnect any previously connected WhatsApp sessions.
   */
  async init() {
    console.log('--- Initializing WhatsApp Multi-Device (Max 5 Slots) Engine ---');
    try {
      for (let i = 1; i <= this.MAX_SLOTS; i++) {
        let account = await ChannelAccount.findOne({ type: 'whatsapp', slotIndex: i });
        if (!account) {
          account = new ChannelAccount({
            type: 'whatsapp',
            slotIndex: i,
            nickname: `WhatsApp Slot ${i}`,
            sessionPath: `sessions/whatsapp_slot_${i}`,
            status: 'empty'
          });
          await account.save();
        }

        const slotSessionDir = path.join(this.sessionsBaseDir, `whatsapp_slot_${i}`);
        // If session credentials already exist, attempt auto-reconnect
        if (fs.existsSync(slotSessionDir) && fs.readdirSync(slotSessionDir).length > 0) {
          console.log(`[WhatsApp Slot ${i}] Existing session found, initiating connection...`);
          this.startSocket(i).catch(err => {
            console.error(`[WhatsApp Slot ${i}] Failed to resume session:`, err.message);
          });
        } else {
          this.status.set(i, account.status || 'empty');
        }
      }
    } catch (err) {
      console.error('Error during WhatsApp Multi-Device init:', err);
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
    let version = [2, 3000, 1015901307];
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
      browser: Browsers.macOS('Desktop'),
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

          await ChannelAccount.findOneAndUpdate(
            { type: 'whatsapp', slotIndex },
            { status: 'pairing' }
          );

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

        await ChannelAccount.findOneAndUpdate(
          { type: 'whatsapp', slotIndex },
          {
            status: 'connected',
            phoneNumber,
            pushName,
            lastActive: new Date()
          }
        );

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

        if (!isLoggedOut) {
          // Normal handshake transition, timeout, or restart required
          this.status.set(slotIndex, 'disconnected');
          await ChannelAccount.findOneAndUpdate(
            { type: 'whatsapp', slotIndex },
            { status: 'disconnected' }
          );

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
          await ChannelAccount.findOneAndUpdate(
            { type: 'whatsapp', slotIndex },
            { status: 'empty', phoneNumber: '', pushName: '', lastActive: null }
          );
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

    // Check if slot is already connected
    const currentStatus = this.status.get(slotIndex);
    if (currentStatus === 'connected') {
      return { status: 'already_connected', qrBase64: null };
    }

    // If an active QR already exists and is fresh (< 40s), return it immediately
    const existingQR = this.qrCodes.get(slotIndex);
    if (existingQR && (Date.now() - existingQR.timestamp < 40000)) {
      return { status: 'pairing', qrBase64: existingQR.qrBase64 };
    }

    // Start or restart socket
    await this.startSocket(slotIndex);

    // Wait up to 6 seconds for QR emission
    for (let attempt = 0; attempt < 12; attempt++) {
      await delay(500);
      const qrData = this.qrCodes.get(slotIndex);
      if (qrData) {
        return { status: 'pairing', qrBase64: qrData.qrBase64 };
      }
      if (this.status.get(slotIndex) === 'connected') {
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
        await socket.logout();
      } catch (err) {
        console.warn(`[WhatsApp Slot ${slotIndex}] Error during logout:`, err.message);
      }
      this.sockets.delete(slotIndex);
    }

    this.qrCodes.delete(slotIndex);
    this.status.set(slotIndex, 'empty');
    this.cleanupSessionFiles(slotIndex);

    await ChannelAccount.findOneAndUpdate(
      { type: 'whatsapp', slotIndex },
      { status: 'empty', phoneNumber: '', pushName: '', lastActive: null }
    );

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
    const accounts = await ChannelAccount.find({ type: 'whatsapp' }).sort({ slotIndex: 1 });
    return accounts.map(acc => ({
      _id: acc._id,
      slotIndex: acc.slotIndex,
      nickname: acc.nickname,
      phoneNumber: acc.phoneNumber,
      pushName: acc.pushName,
      platform: acc.platform,
      status: this.status.get(acc.slotIndex) || acc.status || 'empty',
      lastActive: acc.lastActive
    }));
  }

  /**
   * Send WhatsApp message from a specific connected slot with anti-ban rate pacing
   */
  async sendMessage(slotIndex, destinationNumber, messagePayload) {
    if (slotIndex < 1 || slotIndex > this.MAX_SLOTS) {
      throw new Error(`Invalid slot index ${slotIndex}`);
    }

    const socket = this.sockets.get(slotIndex);
    if (!socket || this.status.get(slotIndex) !== 'connected') {
      throw new Error(`WhatsApp Slot ${slotIndex} is not connected.`);
    }

    // Sanitize destination number (ensure proper JID format)
    let cleanNumber = destinationNumber.toString().replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber; // Default to India 91 prefix
    }
    const recipientJid = `${cleanNumber}@s.whatsapp.net`;

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

    // Append action buttons text if provided
    if (messagePayload.buttons && messagePayload.buttons.length > 0) {
      const buttonLines = messagePayload.buttons.map(b => {
        if (b.type === 'URL') return `🔗 ${b.text}: ${b.value}`;
        if (b.type === 'PHONE_NUMBER') return `📞 ${b.text}: ${b.value}`;
        return `👉 [ ${b.text} ]`;
      }).join('\n');

      if (messageContent.caption) {
        messageContent.caption += `\n\n${buttonLines}`;
      } else {
        messageContent.text += `\n\n${buttonLines}`;
      }
    }

    if (messagePayload.footer) {
      const footerLine = `\n\n_${messagePayload.footer}_`;
      if (messageContent.caption) {
        messageContent.caption += footerLine;
      } else {
        messageContent.text += footerLine;
      }
    }

    // Anti-ban jitter delay (between 1.5s and 2.5s)
    const jitter = Math.floor(1500 + Math.random() * 1000);
    await delay(jitter);

    const result = await socket.sendMessage(recipientJid, messageContent);
    return { success: true, messageId: result.key.id, recipient: cleanNumber };
  }

  /**
   * Helper to send a direct message using the first available connected slot
   */
  async sendDirectMessage(destinationNumber, textMessage) {
    if (!destinationNumber || !textMessage) return false;

    // Find any slot with 'connected' status
    for (let slot = 1; slot <= this.MAX_SLOTS; slot++) {
      if (this.status.get(slot) === 'connected') {
        try {
          await this.sendMessage(slot, destinationNumber, { body: textMessage });
          console.log(`✅ [WhatsApp Direct] Message sent to ${destinationNumber} via Slot ${slot}`);
          return true;
        } catch (err) {
          console.warn(`[WhatsApp Direct] Slot ${slot} send failed, trying next:`, err.message);
        }
      }
    }

    console.warn(`⚠️ [WhatsApp Direct] No connected WhatsApp slot available to send message to ${destinationNumber}`);
    return false;
  }
}

const whatsappMultiDeviceService = new WhatsAppMultiDeviceService();
module.exports = whatsappMultiDeviceService;
