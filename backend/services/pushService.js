const prisma = require('../config/prisma');
const axios = require('axios');

/**
 * Sends a push notification to all active devices for a given store
 * and automatically prunes invalid tokens using PostgreSQL / Prisma.
 */
const sendStoreNotification = async (storeId, title, body, data = {}, categoryId = null, badgeCount = undefined, channelId = 'default') => {
  try {
    if (!storeId) return;

    // 1. Find all active devices for this store
    const devices = await prisma.deviceRegistry.findMany({
      where: {
        storeId: String(storeId),
        active: true
      }
    });

    console.log(`[PushService] Found ${devices?.length || 0} active devices for store ${storeId}`);
    if (!devices || devices.length === 0) return;

    let messages = [];
    for (let device of devices) {
      const token = device.pushToken || device.token;
      // Basic validation
      if (!token || !token.startsWith('ExponentPushToken')) {
        console.error(`[PushService] Token ${token} is not a valid Expo push token`);
        await prisma.deviceRegistry.update({
          where: { id: device.id },
          data: { active: false }
        }).catch(() => {});
        continue;
      }

      // Construct the message exactly as Expo expects via REST API
      let pushMessage = {
        to: token,
        sound: 'default', // Ignored on Android when channelId is provided
        title: title,
        body: body,
        data: data,
        channelId: channelId,
      };
      
      if (badgeCount !== undefined) pushMessage.badge = badgeCount;
      if (categoryId) pushMessage.categoryId = categoryId;

      messages.push(pushMessage);
    }

    if (messages.length === 0) return;

    console.log(`[PushService] Sending ${messages.length} messages via HTTP...`);
    
    // 2. Send the messages to the Expo push notification service
    const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      }
    });

    console.log(`[PushService] Expo Response:`, response.data);

    // 3. Handle errors/receipts (Prune invalid tokens)
    const tickets = response.data?.data;
    let invalidTokens = [];
    
    if (Array.isArray(tickets)) {
      for (let i = 0; i < tickets.length; i++) {
        let ticket = tickets[i];
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          invalidTokens.push(messages[i].to);
        }
      }
    }

    if (invalidTokens.length > 0) {
      console.log(`[PushService] Deactivating ${invalidTokens.length} invalid push tokens`);
      await prisma.deviceRegistry.updateMany({
        where: {
          OR: [
            { pushToken: { in: invalidTokens } },
            { token: { in: invalidTokens } }
          ]
        },
        data: { active: false }
      }).catch(() => {});
    }
  } catch (error) {
    console.error('[PushService] Push Service Error:', error.response?.data || error.message);
  }
};

module.exports = {
  sendStoreNotification
};
