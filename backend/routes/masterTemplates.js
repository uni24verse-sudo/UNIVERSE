const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const { getFrontendUrl } = require('../config/urls');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

function bufferToStream(buffer) {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
}

router.use(superAdminAuth);

/**
 * UPLOAD TEMPLATE IMAGE (Cloudinary)
 */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'universe_templates' },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      bufferToStream(req.file.buffer).pipe(stream);
    });

    res.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      url: uploadResult.secure_url
    });
  } catch (err) {
    console.error('Template image upload error:', err);
    res.status(500).json({ message: 'Failed to upload image: ' + err.message });
  }
});

/**
 * 1. GET ALL MASTER TEMPLATES
 */
router.get('/', async (req, res) => {
  try {
    const { channel, category, search } = req.query;

    const where = {
      status: { not: 'Archived' }
    };

    if (channel && channel !== 'all') where.channel = channel;
    if (category && category !== 'all') where.category = category;
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { body: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.masterTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(templates.map(t => ({ ...t, _id: t.id })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. GET SINGLE TEMPLATE
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.masterTemplate.findUnique({
      where: { id: req.params.id }
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ ...template, _id: template.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. CREATE MASTER TEMPLATE
 */
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      channel, 
      category, 
      headerType, 
      headerMediaUrl, 
      headerText, 
      body, 
      footer, 
      buttons, 
      subject, 
      emailPreheader, 
      emailHeroImageUrl, 
      emailCtaText, 
      emailCtaUrl 
    } = req.body;

    if (!name || !channel || !body) {
      return res.status(400).json({ message: 'Name, channel, and body are required.' });
    }

    // Extract dynamic variables from text
    const varMatches = (body + ' ' + (subject || '')).match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const variables = [...new Set(varMatches.map(v => v.replace(/[{}]/g, '')))];

    const saved = await prisma.masterTemplate.create({
      data: {
        id: crypto.randomUUID(),
        name,
        channel,
        category: category || 'Marketing & Offers',
        headerType: headerType || 'NONE',
        headerMediaUrl: headerMediaUrl || '',
        headerText: headerText || '',
        body,
        footer: footer || 'UniVerse • Smart Campus Ordering',
        buttons: buttons || [],
        subject: subject || '',
        emailPreheader: emailPreheader || '',
        emailHeroImageUrl: emailHeroImageUrl || '',
        emailCtaText: emailCtaText || 'Open UniVerse',
        emailCtaUrl: emailCtaUrl || getFrontendUrl(),
        variables,
        status: 'Active'
      }
    });

    res.status(201).json({ ...saved, _id: saved.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. UPDATE MASTER TEMPLATE
 */
router.put('/:id', async (req, res) => {
  try {
    const { 
      name, 
      channel, 
      category, 
      headerType, 
      headerMediaUrl, 
      headerText, 
      body, 
      footer, 
      buttons, 
      subject, 
      emailPreheader, 
      emailHeroImageUrl, 
      emailCtaText, 
      emailCtaUrl,
      status
    } = req.body;

    let variables = undefined;
    if (body !== undefined || subject !== undefined) {
      const combined = (body || '') + ' ' + (subject || '');
      const varMatches = combined.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      variables = [...new Set(varMatches.map(v => v.replace(/[{}]/g, '')))];
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (channel !== undefined) updateData.channel = channel;
    if (category !== undefined) updateData.category = category;
    if (headerType !== undefined) updateData.headerType = headerType;
    if (headerMediaUrl !== undefined) updateData.headerMediaUrl = headerMediaUrl;
    if (headerText !== undefined) updateData.headerText = headerText;
    if (body !== undefined) updateData.body = body;
    if (footer !== undefined) updateData.footer = footer;
    if (buttons !== undefined) updateData.buttons = buttons;
    if (subject !== undefined) updateData.subject = subject;
    if (emailPreheader !== undefined) updateData.emailPreheader = emailPreheader;
    if (emailHeroImageUrl !== undefined) updateData.emailHeroImageUrl = emailHeroImageUrl;
    if (emailCtaText !== undefined) updateData.emailCtaText = emailCtaText;
    if (emailCtaUrl !== undefined) updateData.emailCtaUrl = emailCtaUrl;
    if (variables !== undefined) updateData.variables = variables;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.masterTemplate.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ ...updated, _id: updated.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. DELETE / ARCHIVE TEMPLATE
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.masterTemplate.update({
      where: { id: req.params.id },
      data: { status: 'Archived' }
    });
    res.json({ success: true, message: 'Template archived successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
