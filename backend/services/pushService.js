const { Expo } = require('expo-server-sdk');
const DeviceRegistry = require('../models/DeviceRegistry');

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
let expo = new Expo();

/**
 * Sends a push notification to all active devices for a given store
 * and automatically prunes invalid tokens.
 */
const sendStoreNotification = async (storeId, title, body, data = {}, categoryId = null) => {
  try {
    // 1. Find all active devices for this store
    const devices = await DeviceRegistry.find({ storeId, active: true });
    if (!devices || devices.length === 0) return;

    let messages = [];
    for (let device of devices) {
      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(device.pushToken)) {
        console.error(`Push token ${device.pushToken} is not a valid Expo push token`);
        // Mark as inactive immediately
        await DeviceRegistry.findByIdAndUpdate(device._id, { active: false });
        continue;
      }

      // Construct the message
      let pushMessage = {
        to: device.pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      };
      
      if (categoryId) {
        pushMessage.categoryId = categoryId;
      }

      messages.push(pushMessage);
    }

    if (messages.length === 0) return;

    // 2. Chunk messages
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    
    // 3. Send the chunks to the Expo push notification service
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push chunk:', error);
      }
    }

    // 4. Handle receipt/errors (Prune invalid tokens)
    let invalidTokens = [];
    for (let i = 0; i < tickets.length; i++) {
      let ticket = tickets[i];
      if (ticket.status === 'error') {
        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          // The token is invalid/expired. Extract the token to delete it.
          // The ticket corresponds to the message at the same index
          invalidTokens.push(messages[i].to);
        }
      }
    }

    if (invalidTokens.length > 0) {
      console.log(`Deactivating ${invalidTokens.length} invalid push tokens`);
      await DeviceRegistry.updateMany(
        { pushToken: { $in: invalidTokens } },
        { active: false }
      );
    }
  } catch (error) {
    console.error('Push Service Error:', error);
  }
};

module.exports = {
  sendStoreNotification
};
