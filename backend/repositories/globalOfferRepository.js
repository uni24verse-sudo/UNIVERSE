const prisma = require('../config/prisma');
const crypto = require('crypto');

class GlobalOfferRepository {
  /**
   * Ensure table exists before queries
   */
  async ensureTable() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS global_offers (
          id VARCHAR(64) PRIMARY KEY,
          code VARCHAR(64) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT DEFAULT '',
          "discountType" VARCHAR(64) NOT NULL,
          "discountValue" FLOAT NOT NULL,
          "minOrderValue" FLOAT DEFAULT 0,
          "maxDiscountCap" FLOAT DEFAULT 0,
          "startDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "endDate" TIMESTAMP WITH TIME ZONE,
          "badgeText" VARCHAR(64) DEFAULT '',
          "bannerText" VARCHAR(255) DEFAULT '',
          "isActive" BOOLEAN DEFAULT true,
          "isGlobal" BOOLEAN DEFAULT true,
          "applicableStores" JSONB DEFAULT '[]'::jsonb,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (e) {
      console.warn('[globalOfferRepo] ensureTable note:', e.message);
    }
  }

  /**
   * Format DB row to camelCase JS object
   */
  formatRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      code: (row.code || '').toUpperCase().trim(),
      title: row.title,
      description: row.description || '',
      discountType: row.discountType,
      discountValue: Number(row.discountValue) || 0,
      minOrderValue: Number(row.minOrderValue) || 0,
      maxDiscountCap: Number(row.maxDiscountCap) || 0,
      startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
      endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
      badgeText: row.badgeText || (
        row.discountType?.includes('PERCENTAGE') ? `${row.discountValue}% OFF` : `₹${row.discountValue} OFF`
      ),
      bannerText: row.bannerText || '',
      isActive: row.isActive !== false,
      isGlobal: true,
      applicableStores: Array.isArray(row.applicableStores) ? row.applicableStores : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Get all global offers (Admin view)
   */
  async getAll() {
    await this.ensureTable();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM global_offers ORDER BY "createdAt" DESC
    `);
    return rows.map(r => this.formatRow(r));
  }

  /**
   * Get active global offers (Public / Customer Cart view)
   */
  async getActive(storeId = null) {
    await this.ensureTable();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM global_offers 
      WHERE "isActive" = true 
      ORDER BY "discountValue" DESC
    `);
    const allActive = rows.map(r => this.formatRow(r));

    if (!storeId) return allActive;

    // Filter by applicableStores if specified
    return allActive.filter(offer => {
      if (!offer.applicableStores || offer.applicableStores.length === 0) return true;
      return offer.applicableStores.some(s => String(s) === String(storeId));
    });
  }

  /**
   * Create a global platform offer
   */
  async create(data) {
    await this.ensureTable();
    const id = data.id || `global-offer-${crypto.randomBytes(6).toString('hex')}`;
    const code = (data.code || `OFFER${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();
    const title = data.title || `${data.discountValue}% Off on Campus`;
    const description = data.description || '';
    const discountType = data.discountType || 'PERCENTAGE_CART';
    const discountValue = Number(data.discountValue) || 10;
    const minOrderValue = Number(data.minOrderValue) || 0;
    const maxDiscountCap = Number(data.maxDiscountCap) || 0;
    const badgeText = data.badgeText || (
      discountType.includes('PERCENTAGE') ? `${discountValue}% OFF` : `₹${discountValue} OFF`
    );
    const bannerText = data.bannerText || '';
    const isActive = data.isActive !== false;
    const applicableStores = JSON.stringify(Array.isArray(data.applicableStores) ? data.applicableStores : []);
    const startDate = data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString();
    const endDate = data.endDate ? new Date(data.endDate).toISOString() : null;

    // Upsert or insert
    await prisma.$executeRawUnsafe(`
      INSERT INTO global_offers (
        id, code, title, description, "discountType", "discountValue", "minOrderValue", "maxDiscountCap",
        "badgeText", "bannerText", "isActive", "isGlobal", "applicableStores", "startDate", "endDate", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12::jsonb, $13::timestamp with time zone, $14::timestamp with time zone, NOW()
      )
      ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        "discountType" = EXCLUDED."discountType",
        "discountValue" = EXCLUDED."discountValue",
        "minOrderValue" = EXCLUDED."minOrderValue",
        "maxDiscountCap" = EXCLUDED."maxDiscountCap",
        "badgeText" = EXCLUDED."badgeText",
        "bannerText" = EXCLUDED."bannerText",
        "isActive" = EXCLUDED."isActive",
        "applicableStores" = EXCLUDED."applicableStores",
        "updatedAt" = NOW()
    `, id, code, title, description, discountType, discountValue, minOrderValue, maxDiscountCap, badgeText, bannerText, isActive, applicableStores, startDate, endDate);

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM global_offers WHERE id = $1 OR code = $2 LIMIT 1`, id, code);
    return this.formatRow(rows[0]);
  }

  /**
   * Update an existing global offer by ID
   */
  async update(id, data) {
    await this.ensureTable();
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM global_offers WHERE id = $1 LIMIT 1`, id);
    if (!existing || existing.length === 0) return null;

    const prev = this.formatRow(existing[0]);
    const code = (data.code ? data.code.toUpperCase().trim() : prev.code);
    const title = data.title !== undefined ? data.title : prev.title;
    const description = data.description !== undefined ? data.description : prev.description;
    const discountType = data.discountType || prev.discountType;
    const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : prev.discountValue;
    const minOrderValue = data.minOrderValue !== undefined ? Number(data.minOrderValue) : prev.minOrderValue;
    const maxDiscountCap = data.maxDiscountCap !== undefined ? Number(data.maxDiscountCap) : prev.maxDiscountCap;
    const badgeText = data.badgeText !== undefined ? data.badgeText : prev.badgeText;
    const bannerText = data.bannerText !== undefined ? data.bannerText : prev.bannerText;
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : prev.isActive;
    const applicableStores = JSON.stringify(Array.isArray(data.applicableStores) ? data.applicableStores : prev.applicableStores);
    const startDate = data.startDate ? new Date(data.startDate).toISOString() : prev.startDate;
    const endDate = data.endDate ? new Date(data.endDate).toISOString() : prev.endDate;

    await prisma.$executeRawUnsafe(`
      UPDATE global_offers SET
        code = $1,
        title = $2,
        description = $3,
        "discountType" = $4,
        "discountValue" = $5,
        "minOrderValue" = $6,
        "maxDiscountCap" = $7,
        "badgeText" = $8,
        "bannerText" = $9,
        "isActive" = $10,
        "applicableStores" = $11::jsonb,
        "startDate" = $12::timestamp with time zone,
        "endDate" = $13::timestamp with time zone,
        "updatedAt" = NOW()
      WHERE id = $14
    `, code, title, description, discountType, discountValue, minOrderValue, maxDiscountCap, badgeText, bannerText, isActive, applicableStores, startDate, endDate, id);

    const updated = await prisma.$queryRawUnsafe(`SELECT * FROM global_offers WHERE id = $1 LIMIT 1`, id);
    return this.formatRow(updated[0]);
  }

  /**
   * Delete a global offer
   */
  async delete(id) {
    await this.ensureTable();
    await prisma.$executeRawUnsafe(`DELETE FROM global_offers WHERE id = $1`, id);
    return true;
  }
}

module.exports = new GlobalOfferRepository();
