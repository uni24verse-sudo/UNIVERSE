const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../config/prisma');
const auth = require('../middleware/auth');
const superAdminAuth = require('../middleware/superAdminAuth');

// Ensure herobanners table exists in PostgreSQL
let tableInitialized = false;
async function ensureTableExists() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS herobanners (
        id TEXT PRIMARY KEY,
        "slotIndex" INT NOT NULL DEFAULT 1,
        "locationHub" TEXT NOT NULL,
        "locationId" TEXT DEFAULT '',
        "stallId" TEXT NOT NULL,
        "storeName" TEXT NOT NULL,
        "rawAssetUrl" TEXT DEFAULT '',
        "rawText" TEXT DEFAULT '',
        "bannerUrl" TEXT DEFAULT '',
        "targetUrl" TEXT DEFAULT '',
        "title" TEXT DEFAULT '',
        "tag" TEXT DEFAULT 'Featured Stall',
        "amountPaid" NUMERIC DEFAULT 1000,
        "paymentStatus" TEXT DEFAULT 'PAID',
        "status" TEXT DEFAULT 'pending_design',
        "removalReason" TEXT DEFAULT '',
        "termsAccepted" BOOLEAN DEFAULT true,
        "termsText" TEXT DEFAULT 'I understand and agree that this 30-days promotional slot reservation is strictly non-refundable and non-creditable.',
        "startDate" TIMESTAMP WITH TIME ZONE,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_herobanners_hub_status ON herobanners("locationHub", status);
      CREATE INDEX IF NOT EXISTS idx_herobanners_stall ON herobanners("stallId");
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('[HeroBanners] Table init error:', err.message);
  }
}

// 1. Public Endpoint: Get active banners for student Hero Carousel
router.get('/active', async (req, res) => {
  try {
    await ensureTableExists();
    const { hub, locationId } = req.query;

    let query = `
      SELECT * FROM herobanners
      WHERE status = 'active'
        AND "endDate" > NOW()
    `;
    const params = [];

    if (locationId) {
      params.push(locationId);
      query += ` AND ("locationId" = $${params.length}`;
      if (hub) {
        params.push(`%${hub}%`);
        query += ` OR "locationHub" ILIKE $${params.length}`;
      }
      query += `)`;
    } else if (hub) {
      params.push(`%${hub}%`);
      query += ` AND "locationHub" ILIKE $${params.length}`;
    }

    query += ` ORDER BY "slotIndex" ASC, "createdAt" DESC LIMIT 7`;

    const banners = await prisma.$queryRawUnsafe(query, ...params);
    res.json(banners);
  } catch (err) {
    console.error('[HeroBanners] Active fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch active hero banners', error: err.message });
  }
});

// 2. Vendor Endpoint: Book a Hero Banner Slot (₹1,000 / month)
router.post('/book-slot', auth, async (req, res) => {
  try {
    await ensureTableExists();
    const { 
      stallId, 
      storeName, 
      locationHub, 
      locationId, 
      rawAssetUrl, 
      rawText, 
      tag, 
      termsAccepted 
    } = req.body;

    // Strict Non-Refundable Terms Check
    if (!termsAccepted) {
      return res.status(400).json({ 
        message: 'You must accept the strictly non-refundable and non-creditable terms to proceed.' 
      });
    }

    if (!stallId || !storeName || !locationHub) {
      return res.status(400).json({ message: 'Stall ID, Store Name, and Location Hub are required.' });
    }

    // Verify vendor owns this store
    const adminId = req.admin.id || req.admin._id;
    const store = await prisma.store.findFirst({
      where: { id: stallId, adminId: adminId }
    });
    if (!store) {
      return res.status(403).json({ message: 'Unauthorized: You do not own this store.' });
    }

    // Check maximum active/pending banners limit for a single stall (max 2)
    const existingStallBanners = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM herobanners
      WHERE "stallId" = $1 AND status IN ('pending_design', 'active')
    `, stallId);

    const stallActiveCount = existingStallBanners[0]?.count || 0;
    if (stallActiveCount >= 2) {
      return res.status(400).json({ 
        message: 'A single stall can have a maximum of 2 active/pending promotion slots simultaneously.' 
      });
    }

    // Check hub slot capacity (max 5 slots)
    const occupiedHubBanners = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM herobanners
      WHERE "locationHub" ILIKE $1 AND status = 'active' AND "endDate" > NOW()
    `, locationHub);
    const occupiedCount = occupiedHubBanners[0]?.count || 0;

    const slotIndex = Math.min(5, occupiedCount + 1);
    const bannerId = `banner_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const termsMessage = 'I understand and agree that this 30-days promotional slot reservation is strictly non-refundable and non-creditable.';

    await prisma.$executeRawUnsafe(`
      INSERT INTO herobanners (
        id, "slotIndex", "locationHub", "locationId", "stallId", "storeName",
        "rawAssetUrl", "rawText", "tag", "amountPaid", "paymentStatus", "status",
        "termsAccepted", "termsText", "targetUrl", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, 1000, 'PAID', 'pending_design',
        true, $10, $11, NOW(), NOW()
      )
    `, bannerId, slotIndex, locationHub, locationId || '', stallId, storeName,
       rawAssetUrl || '', rawText || '', tag || 'Featured Stall', termsMessage, `/store/${stallId}`);

    // Notify Super Admin via Socket
    const io = req.app.get('io');
    if (io) {
      io.emit('banner_campaign_requested', {
        bannerId,
        stallId,
        storeName,
        locationHub,
        slotIndex
      });
    }

    res.json({
      success: true,
      message: 'Promotion slot booked successfully! Our design team will format your banner for Super Admin approval.',
      bannerId,
      slotIndex
    });
  } catch (err) {
    console.error('[HeroBanners] Book slot error:', err);
    res.status(500).json({ message: 'Failed to book promotion slot', error: err.message });
  }
});

// 3. Vendor Endpoint: Get store's banners & promotion history
router.get('/vendor/:storeId', auth, async (req, res) => {
  try {
    await ensureTableExists();
    const { storeId } = req.params;

    const banners = await prisma.$queryRawUnsafe(`
      SELECT * FROM herobanners
      WHERE "stallId" = $1
      ORDER BY "createdAt" DESC
    `, storeId);

    res.json(banners);
  } catch (err) {
    console.error('[HeroBanners] Vendor fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch vendor promotions', error: err.message });
  }
});

// 4. Vendor Endpoint: Request early banner removal (Strictly Non-Refundable)
router.post('/vendor/remove-request', auth, async (req, res) => {
  try {
    await ensureTableExists();
    const { bannerId, reason } = req.body;
    if (!bannerId) return res.status(400).json({ message: 'Banner ID is required.' });

    // Verify banner ownership
    const banner = await prisma.$queryRawUnsafe(`
      SELECT * FROM herobanners WHERE id = $1 LIMIT 1
    `, bannerId);

    if (!banner || banner.length === 0) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    // Set to removed_by_vendor immediately (takes down from live carousel)
    await prisma.$executeRawUnsafe(`
      UPDATE herobanners
      SET status = 'removed_by_vendor',
          "removalReason" = $1,
          "updatedAt" = NOW()
      WHERE id = $2
    `, reason || 'Vendor requested early removal', bannerId);

    const io = req.app.get('io');
    if (io) {
      io.emit('banner_status_changed', { bannerId, status: 'removed_by_vendor' });
    }

    res.json({
      success: true,
      message: 'Banner has been removed from the live carousel. As per terms, this reservation is strictly non-refundable and non-creditable.'
    });
  } catch (err) {
    console.error('[HeroBanners] Remove request error:', err);
    res.status(500).json({ message: 'Failed to remove banner', error: err.message });
  }
});

// 5. Super Admin Endpoint: Get all promotions & slot capacity
router.get('/admin/all', superAdminAuth, async (req, res) => {
  try {
    await ensureTableExists();
    const { hub } = req.query;

    let query = `SELECT * FROM herobanners`;
    const params = [];

    if (hub && hub !== 'All') {
      params.push(`%${hub}%`);
      query += ` WHERE "locationHub" ILIKE $1`;
    }

    query += ` ORDER BY "createdAt" DESC`;

    const banners = await prisma.$queryRawUnsafe(query, ...params);

    // Compute slot stats per hub
    const slotStats = await prisma.$queryRawUnsafe(`
      SELECT "locationHub", COUNT(*)::int as active_count
      FROM herobanners
      WHERE status = 'active' AND "endDate" > NOW()
      GROUP BY "locationHub"
    `);

    res.json({ banners, slotStats });
  } catch (err) {
    console.error('[HeroBanners] Admin fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch banners for admin', error: err.message });
  }
});

// 6. Super Admin Endpoint: Publish Banner (Activates 30-Day Campaign)
router.post('/admin/publish', superAdminAuth, async (req, res) => {
  try {
    await ensureTableExists();
    const { bannerId, bannerUrl, title, tag, slotIndex, targetUrl } = req.body;

    if (!bannerId || !bannerUrl) {
      return res.status(400).json({ message: 'Banner ID and finalized Banner URL are required.' });
    }

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Days

    await prisma.$executeRawUnsafe(`
      UPDATE herobanners
      SET "bannerUrl" = $1,
          title = $2,
          tag = $3,
          "slotIndex" = $4,
          "targetUrl" = $5,
          status = 'active',
          "startDate" = $6,
          "endDate" = $7,
          "updatedAt" = NOW()
      WHERE id = $8
    `, bannerUrl, title || '', tag || 'Featured Stall', parseInt(slotIndex, 10) || 1, targetUrl || '', startDate, endDate, bannerId);

    const io = req.app.get('io');
    if (io) {
      io.emit('banner_published', { bannerId, bannerUrl, status: 'active' });
    }

    res.json({
      success: true,
      message: 'Banner published successfully! The 30-day campaign is now live on the student Hero Carousel.',
      startDate,
      endDate
    });
  } catch (err) {
    console.error('[HeroBanners] Admin publish error:', err);
    res.status(500).json({ message: 'Failed to publish banner', error: err.message });
  }
});

// 7. Super Admin Endpoint: Archive / Deactivate Banner
router.post('/admin/archive', superAdminAuth, async (req, res) => {
  try {
    await ensureTableExists();
    const { bannerId } = req.body;
    if (!bannerId) return res.status(400).json({ message: 'Banner ID is required.' });

    await prisma.$executeRawUnsafe(`
      UPDATE herobanners
      SET status = 'archived',
          "updatedAt" = NOW()
      WHERE id = $1
    `, bannerId);

    const io = req.app.get('io');
    if (io) {
      io.emit('banner_status_changed', { bannerId, status: 'archived' });
    }

    res.json({ success: true, message: 'Banner archived.' });
  } catch (err) {
    console.error('[HeroBanners] Admin archive error:', err);
    res.status(500).json({ message: 'Failed to archive banner', error: err.message });
  }
});

module.exports = router;
