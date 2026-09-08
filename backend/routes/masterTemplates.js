const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const MasterTemplate = require('../models/MasterTemplate');

router.use(superAdminAuth);

/**
 * 1. GET ALL MASTER TEMPLATES
 */
router.get('/', async (req, res) => {
  try {
    const { channel, category, search } = req.query;
    const query = { status: { $ne: 'Archived' } };

    if (channel && channel !== 'all') query.channel = channel;
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await MasterTemplate.find(query).sort({ updatedAt: -1 });

    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. GET SINGLE TEMPLATE
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await MasterTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
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

    const newTemplate = new MasterTemplate({
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
      emailCtaUrl: emailCtaUrl || 'https://www.universeorder.co.in',
      variables,
      status: 'Active'
    });

    const saved = await newTemplate.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. UPDATE MASTER TEMPLATE
 */
router.put('/:id', async (req, res) => {
  try {
    const { body, subject } = req.body;
    let variables = undefined;

    if (body || subject) {
      const combined = (body || '') + ' ' + (subject || '');
      const varMatches = combined.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      variables = [...new Set(varMatches.map(v => v.replace(/[{}]/g, '')))];
    }

    const updated = await MasterTemplate.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(variables ? { variables } : {}),
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. DELETE / ARCHIVE TEMPLATE
 */
router.delete('/:id', async (req, res) => {
  try {
    await MasterTemplate.findByIdAndUpdate(req.params.id, { status: 'Archived' });
    res.json({ success: true, message: 'Template archived successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
