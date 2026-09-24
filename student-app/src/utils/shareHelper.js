import { Share, Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const BASE_WEB_URL = 'https://food.universeorder.co.in';

/**
 * Universal Native Share Content Helper
 * Uses native OS share sheet (WhatsApp, Instagram, Messages, etc.) with clipboard fallback.
 */
export const shareContent = async ({ title, message, url }) => {
  const shareTitle = title || 'UniVerse - Digital Campus Dining';
  const shareUrl = url || BASE_WEB_URL;
  const shareMessage = message || `Order food seamlessly on UniVerse!\n${shareUrl}`;

  try {
    const result = await Share.share(
      Platform.select({
        ios: {
          title: shareTitle,
          message: shareMessage,
          url: shareUrl,
        },
        default: {
          title: shareTitle,
          message: shareMessage,
        },
      }),
      {
        dialogTitle: shareTitle,
      }
    );

    if (result.action === Share.sharedAction) {
      return { success: true, method: 'native' };
    } else if (result.action === Share.dismissedAction) {
      return { success: false, method: 'dismissed' };
    }
  } catch (err) {
    console.warn('Native share failed, falling back to clipboard:', err.message);
    try {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Link Copied', 'Menu link copied to your clipboard!');
      return { success: true, method: 'clipboard' };
    } catch (clipErr) {
      Alert.alert('Unable to Share', 'Could not open share sheet or copy link.');
      return { success: false, error: clipErr };
    }
  }
};

/**
 * Share Stall / Store Menu
 * Formats rich text matching webapp StoreSubHeader.jsx
 */
export const shareStall = async (store) => {
  if (!store) return;
  const rawId = store._id || store.id || '';
  const shortStoreId = rawId.length > 8 ? rawId.slice(0, 8) : rawId;
  const stallUrl = `${BASE_WEB_URL}/s/${shortStoreId}`;
  const productCount = Array.isArray(store.products) ? store.products.length : 0;
  const locationTag = store.market
    ? `${store.name} • ${store.market}`
    : (store.name || 'Campus Dining');

  const title = `${store.name || 'Stall'} on UNIVERSE`;
  const message = `🏪 *${store.name || 'Stall'}*\n📍 _${locationTag}_\n\nLooking for good food? *Check out their live menu.* 🍽️\n${productCount > 0 ? `${productCount} fresh dishes ready to order.` : 'Ready to order fresh food.'}\n\n🛒 *Explore menu on UNIVERSE:*\n${stallUrl}`;

  return shareContent({ title, message, url: stallUrl });
};

/**
 * Share Specific Dish
 * Formats rich text matching webapp ProductCard.jsx
 */
export const shareDish = async (product, store) => {
  if (!product) return;
  const rawId = store?._id || store?.id || product.storeId?._id || product.storeId || '';
  const shortStoreId = rawId.length > 8 ? rawId.slice(0, 8) : rawId;
  const dishUrl = `${BASE_WEB_URL}/d/${shortStoreId}?dish=${encodeURIComponent(product.name)}`;
  const storeName = store?.name || product.storeName || 'UniVerse Stall';
  const locationTag = store?.market ? `${storeName} • ${store.market}` : storeName;

  const hasVariants = product.variants && product.variants.length > 0;
  const minPrice = hasVariants ? Math.min(...product.variants.map(v => v.price)) : product.price;

  const title = `${product.name} — ₹${minPrice}`;
  const message = `🔥 *${product.name}* — *₹${minPrice}*\n📍 _${locationTag}_\n\nHungry? *This one's calling you.* 😋\nFresh *${product.name}*, ready to order.\n\n🛒 *Order now on UNIVERSE:*\n${dishUrl}`;

  return shareContent({ title, message, url: dishUrl });
};

/**
 * Share Live Order Tracker Link
 */
export const shareOrder = async (order) => {
  if (!order) return;
  const orderId = order._id || order.id;
  const orderNum = order.orderNumber || (orderId ? String(orderId).slice(-6) : '');
  const trackerUrl = `${BASE_WEB_URL}/order-tracker/${orderId}`;

  const title = `Track Order #${orderNum}`;
  const message = `🥡 *Order #${orderNum} on UniVerse*\nLive status: *${order.status || 'Active'}*\n\nTrack preparation & pickup here:\n${trackerUrl}`;

  return shareContent({ title, message, url: trackerUrl });
};

export default {
  shareContent,
  shareStall,
  shareDish,
  shareOrder,
};
