const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');

/**
 * 5. DOWNLOAD SAMPLE TEMPLATE (CSV) - Publicly Accessible for easy direct download
 */
router.get('/sample-template', (req, res) => {
  const csvContent = [
    'name,phone,email,campus,notes',
    'Arjun Mehta,9876543210,arjun.mehta@example.com,Lovely Professional University,Food Court Regular',
    'Priya Sharma,9812345678,priya.sharma@example.com,Lovely Professional University,Hostel Block 4',
    'Sneha Kapoor,9123456789,,Lovely Professional University,Veg Only',
    'Rohan Verma,9988776655,rohan.v@example.com,Lovely Professional University,Pre-Order Member'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="universe_master_contacts_template.csv"');
  res.status(200).send(csvContent);
});

// Enforce SuperAdmin Authentication for all other Master Data operations
router.use(superAdminAuth);

/**
 * Phone number normalization helper
 * Strips non-digits, trims country code (+91 / 91) if 12-digit Indian number,
 * ensuring canonical 10-digit or international format for 100% reliable deduplication.
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned.replace(/[^\d]/g, '');
}

/**
 * Lazy Table Initializer:
 * Ensures the `mastercontacts` PostgreSQL table exists safely with indexes.
 * Executes DDL statements individually to comply with all PostgreSQL connection modes.
 */
let isTableInitialized = false;
async function ensureMasterContactsTable() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS mastercontacts (
        id VARCHAR(64) PRIMARY KEY,
        phone VARCHAR(32) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) DEFAULT '',
        campus VARCHAR(255) DEFAULT 'Lovely Professional University',
        source VARCHAR(128) DEFAULT 'Customer 360',
        tags JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        "orderCount" INT DEFAULT 0,
        "totalSpent" FLOAT DEFAULT 0,
        "lastActiveAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_mastercontacts_phone ON mastercontacts(phone)`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_mastercontacts_source ON mastercontacts(source)`).catch(() => {});
    isTableInitialized = true;
    console.log('[MasterData] ✅ Table mastercontacts verified and ready.');
  } catch (err) {
    console.error('[MasterData] ❌ Table initialization error:', err.message);
  }
}

/**
 * 2. SYNC FROM CUSTOMER 360 (Auto-deduplicating by phone number)
 */
async function syncCustomer360Internal() {
  try {
    await ensureMasterContactsTable();

    // 1. Fetch from Customer model safely
    let customers = [];
    try {
      customers = await prisma.customer.findMany({
        orderBy: { updatedAt: 'desc' }
      });
    } catch (e) {
      console.warn('[MasterData] Customer model fetch note:', e.message);
    }

    // 2. Fetch distinct phone orders to catch buyers
    let orders = [];
    try {
      orders = await prisma.order.findMany({
        select: {
          customerPhone: true,
          customerName: true,
          customerEmail: true,
          totalAmount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (e) {
      console.warn('[MasterData] Order fetch note:', e.message);
    }

    const phoneMap = new Map();

    // Process structured customers first
    for (const c of customers) {
      const p = normalizePhone(c.phone);
      if (p && p.length >= 7) {
        let orderCount = 0;
        let totalSpent = 0;
        if (c.metrics) {
          try {
            const m = typeof c.metrics === 'string' ? JSON.parse(c.metrics || '{}') : c.metrics;
            orderCount = Number(m.totalOrders) || 0;
            totalSpent = Number(m.totalSpent) || 0;
          } catch (_) {}
        }
        phoneMap.set(p, {
          phone: p,
          name: c.currentName || 'UniVerse Student',
          email: c.email || '',
          campus: c.campus || 'Lovely Professional University',
          source: 'Customer 360',
          orderCount,
          totalSpent,
          lastActiveAt: c.lastActivityAt || c.updatedAt || new Date()
        });
      }
    }

    // Blend orders to augment counts or add missing phones
    for (const o of orders) {
      const p = normalizePhone(o.customerPhone);
      if (p && p.length >= 7) {
        if (!phoneMap.has(p)) {
          phoneMap.set(p, {
            phone: p,
            name: o.customerName || 'Campus Member',
            email: o.customerEmail || '',
            campus: 'Lovely Professional University',
            source: 'Customer 360',
            orderCount: 1,
            totalSpent: Number(o.totalAmount) || 0,
            lastActiveAt: o.createdAt || new Date()
          });
        } else {
          const existing = phoneMap.get(p);
          if ((!existing.email || existing.email === '') && o.customerEmail) {
            existing.email = o.customerEmail;
          }
          if ((!existing.name || existing.name === 'UniVerse Student' || existing.name === 'Campus Member') && o.customerName && o.customerName !== 'UniVerse Student') {
            existing.name = o.customerName;
          }
          if (existing.orderCount === 0) {
            existing.orderCount += 1;
            existing.totalSpent += (Number(o.totalAmount) || 0);
          }
        }
      }
    }

    let syncedCount = 0;
    for (const item of phoneMap.values()) {
      const id = crypto.randomUUID();
      const safeName = item.name || 'Campus Member';
      const safeEmail = item.email || '';
      const safeCampus = item.campus || 'Lovely Professional University';
      const safeSource = item.source || 'Customer 360';
      const orderCount = Number(item.orderCount) || 0;
      const totalSpent = Number(item.totalSpent) || 0;

      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO mastercontacts (
            id, phone, name, email, campus, source, "orderCount", "totalSpent", "lastActiveAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (phone) DO UPDATE SET
            name = CASE WHEN mastercontacts.name IN ('UniVerse Student', 'Campus Guest', 'Campus Member', 'Recipient', '') THEN EXCLUDED.name ELSE mastercontacts.name END,
            email = CASE WHEN mastercontacts.email = '' THEN EXCLUDED.email ELSE mastercontacts.email END,
            "orderCount" = GREATEST(mastercontacts."orderCount", EXCLUDED."orderCount"),
            "totalSpent" = GREATEST(mastercontacts."totalSpent", EXCLUDED."totalSpent"),
            "updatedAt" = NOW()
        `, id, item.phone, safeName, safeEmail, safeCampus, safeSource, orderCount, totalSpent);
        syncedCount++;
      } catch (insertErr) {
        console.error(`[MasterData] Failed inserting phone ${item.phone}:`, insertErr.message);
      }
    }

    console.log(`[MasterData] Synced ${syncedCount} unique contacts from Customer 360 & Orders.`);
    return syncedCount;
  } catch (err) {
    console.error('[MasterData] Error in syncCustomer360Internal:', err);
    return 0;
  }
}

/**
 * 1. GET ALL MASTER DATA (Paginated, Searchable, Filterable with Summary Stats)
 */
router.get('/', async (req, res) => {
  try {
    await ensureMasterContactsTable();

    const { 
      search = '', 
      page = 1, 
      limit = 25, 
      source = 'all', 
      reachability = 'all',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [];
    if (source && source !== 'all') {
      conditions.push(`source ILIKE '%${source.replace(/'/g, "''")}%'`);
    }

    if (reachability === 'whatsapp') {
      conditions.push(`phone IS NOT NULL AND phone != ''`);
    } else if (reachability === 'email') {
      conditions.push(`email IS NOT NULL AND email != '' AND email LIKE '%@%'`);
    } else if (reachability === 'both') {
      conditions.push(`phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != '' AND email LIKE '%@%'`);
    }

    if (search && search.trim()) {
      const q = search.trim().replace(/'/g, "''");
      conditions.push(`(name ILIKE '%${q}%' OR phone ILIKE '%${q}%' OR email ILIKE '%${q}%' OR campus ILIKE '%${q}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeSort = ['name', 'phone', 'email', 'orderCount', 'totalSpent', 'updatedAt', 'createdAt'].includes(sortBy) ? sortBy : 'updatedAt';
    const safeOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Query paginated contacts
    const contactsQuery = `
      SELECT * FROM mastercontacts 
      ${whereClause} 
      ORDER BY "${safeSort}" ${safeOrder} 
      LIMIT ${limitNum} OFFSET ${offset};
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM mastercontacts ${whereClause};`;

    // Global counts
    const statsQuery = `
      SELECT 
        COUNT(*)::int as "totalContacts",
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END)::int as "whatsappReady",
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email LIKE '%@%' THEN 1 END)::int as "emailReady",
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != '' AND email LIKE '%@%' THEN 1 END)::int as "bothReady",
        COUNT(CASE WHEN source ILIKE '%Customer 360%' THEN 1 END)::int as "customer360Count",
        COUNT(CASE WHEN source ILIKE '%Upload%' OR source ILIKE '%Import%' THEN 1 END)::int as "uploadedCount"
      FROM mastercontacts;
    `;

    let [contacts, totalRes, statsRes] = await Promise.all([
      prisma.$queryRawUnsafe(contactsQuery).catch(err => {
        console.error('[MasterData] contacts query error:', err.message);
        return [];
      }),
      prisma.$queryRawUnsafe(countQuery).catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe(statsQuery).catch(() => [{
        totalContacts: 0, whatsappReady: 0, emailReady: 0, bothReady: 0, customer360Count: 0, uploadedCount: 0
      }])
    ]);

    let total = totalRes[0]?.count || 0;
    let summary = statsRes[0] || {
      totalContacts: 0,
      whatsappReady: 0,
      emailReady: 0,
      bothReady: 0,
      customer360Count: 0,
      uploadedCount: 0
    };

    // Auto-sync if master data is empty on initial load
    if (summary.totalContacts === 0) {
      const synced = await syncCustomer360Internal();
      if (synced > 0) {
        [contacts, totalRes, statsRes] = await Promise.all([
          prisma.$queryRawUnsafe(contactsQuery).catch(() => []),
          prisma.$queryRawUnsafe(countQuery).catch(() => [{ count: 0 }]),
          prisma.$queryRawUnsafe(statsQuery).catch(() => [{
            totalContacts: 0, whatsappReady: 0, emailReady: 0, bothReady: 0, customer360Count: 0, uploadedCount: 0
          }])
        ]);
        total = totalRes[0]?.count || 0;
        summary = statsRes[0] || summary;
      }
    }

    res.json({
      success: true,
      contacts: contacts.map(c => ({
        ...c,
        _id: c.id
      })),
      total,
      summary,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    console.error('[MasterData] Error fetching contacts:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/sync-customer360', async (req, res) => {
  try {
    const syncedCount = await syncCustomer360Internal();
    res.json({
      success: true,
      message: `Successfully synchronized and de-duplicated ${syncedCount} contacts into Master Data.`,
      syncedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. BULK UPLOAD / INGEST CONTACTS (CSV/Excel/Document contacts)
 * Automatically dedupes by phone number and upserts into Master Data
 */
router.post('/upload', async (req, res) => {
  try {
    await ensureMasterContactsTable();

    const { contacts, sourceLabel = 'Broadcast Upload' } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: 'No contacts provided for upload.' });
    }

    let validCount = 0;
    let newCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    const seenPhonesInBatch = new Set();
    const validBatch = [];

    for (const row of contacts) {
      const rawPhone = row.phone || row.mobile || row.contact || row.Phone || row['Phone Number'] || '';
      const rawName = row.name || row.Name || row.fullName || row['Customer Name'] || 'Recipient';
      const rawEmail = row.email || row.Email || row['Email Address'] || '';
      const rawCampus = row.campus || row.Campus || 'UniVerse Campus';

      const phone = normalizePhone(rawPhone);
      if (!phone || phone.length < 7) continue;

      if (seenPhonesInBatch.has(phone)) {
        duplicateCount++;
        continue;
      }
      seenPhonesInBatch.add(phone);

      validBatch.push({
        phone,
        name: String(rawName).trim() || 'Recipient',
        email: String(rawEmail).trim().toLowerCase(),
        campus: String(rawCampus).trim() || 'UniVerse Campus'
      });
      validCount++;
    }

    if (validBatch.length === 0) {
      return res.status(400).json({ message: 'No valid phone numbers found in the uploaded data. Phone numbers must have at least 7 digits.' });
    }

    // Ingest with upsert
    for (const item of validBatch) {
      const id = crypto.randomUUID();
      const safeSource = String(sourceLabel);

      try {
        const result = await prisma.$executeRawUnsafe(`
          INSERT INTO mastercontacts (
            id, phone, name, email, campus, source, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (phone) DO UPDATE SET
            name = CASE WHEN mastercontacts.name IN ('Recipient', '') THEN EXCLUDED.name ELSE mastercontacts.name END,
            email = CASE WHEN mastercontacts.email = '' THEN EXCLUDED.email ELSE mastercontacts.email END,
            "updatedAt" = NOW()
        `, id, item.phone, item.name, item.email, item.campus, safeSource);

        if (result > 0) newCount++;
        else updatedCount++;
      } catch (rowErr) {
        console.error('[MasterData] Row upload error:', rowErr.message);
      }
    }

    res.json({
      success: true,
      message: `Processed ${validBatch.length} unique contacts: added/updated in Master Data.`,
      stats: {
        totalRows: contacts.length,
        validCount,
        newCount,
        updatedCount,
        batchDuplicatesRemoved: duplicateCount
      },
      contacts: validBatch
    });
  } catch (err) {
    console.error('[MasterData] Bulk upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. ADD SINGLE CONTACT MANUALLY
 */
router.post('/contact', async (req, res) => {
  try {
    await ensureMasterContactsTable();

    const { name, phone, email, campus = 'UniVerse Campus', notes = '' } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Contact Name and Phone Number are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ message: 'Invalid phone number provided.' });
    }

    const id = crypto.randomUUID();

    await prisma.$executeRawUnsafe(`
      INSERT INTO mastercontacts (
        id, phone, name, email, campus, source, metadata, "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 'Manual Entry', $6::jsonb, NOW())
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = CASE WHEN EXCLUDED.email != '' THEN EXCLUDED.email ELSE mastercontacts.email END,
        campus = EXCLUDED.campus,
        "updatedAt" = NOW()
    `, id, cleanPhone, name.trim(), (email || '').trim().toLowerCase(), campus.trim(), JSON.stringify({ notes: notes.trim() }));

    res.json({
      success: true,
      message: `Contact "${name}" (${cleanPhone}) saved to Master Data.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. EXPORT ALL MASTER DATA (CSV)
 */
router.get('/export', async (req, res) => {
  try {
    await ensureMasterContactsTable();

    const contacts = await prisma.$queryRawUnsafe(`
      SELECT name, phone, email, campus, source, "orderCount", "totalSpent", "createdAt" 
      FROM mastercontacts 
      ORDER BY "updatedAt" DESC;
    `).catch(() => []);

    let csv = 'Name,Phone Number,Email,Campus,Source,Orders Placed,Total Spent (INR),Added On\n';

    for (const c of contacts) {
      const cleanName = `"${(c.name || '').replace(/"/g, '""')}"`;
      const cleanPhone = `"${(c.phone || '').replace(/"/g, '""')}"`;
      const cleanEmail = `"${(c.email || '').replace(/"/g, '""')}"`;
      const cleanCampus = `"${(c.campus || '').replace(/"/g, '""')}"`;
      const cleanSource = `"${(c.source || '').replace(/"/g, '""')}"`;
      const orders = c.orderCount || 0;
      const spent = (c.totalSpent || 0).toFixed(2);
      const date = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '';

      csv += `${cleanName},${cleanPhone},${cleanEmail},${cleanCampus},${cleanSource},${orders},${spent},${date}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="universe_master_data_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
