const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/scan', upload.single('menuImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API Key not configured on server' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert buffer to generative part
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `Extract all menu items from this restaurant menu image. 
    Format the output as a JSON array of objects with exactly these keys: 
    "category" (e.g., Starters, Main Course, Drinks), 
    "name" (the item name), 
    "price" (the cost as a number, remove currency symbols).
    
    Rules:
    - If a category is not explicitly mentioned, group items reasonably.
    - Ensure price is a raw number (e.g., 150 instead of "₹150").
    - If no price is found, omit the item or use 0.
    - Return ONLY the clean JSON array. No markdown, no "json" tags, no explanation.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Improved JSON Extraction: Find the search for the first [ and last ]
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/gi, '').trim();
    
    try {
      const items = JSON.parse(cleanJson);
      res.json(items);
    } catch (parseErr) {
      console.error('--- AI Response Parsing Error ---');
      console.error('Raw Text:', text);
      console.error('Cleaned JSON:', cleanJson);
      res.status(500).json({ 
        message: 'Failed to parse AI response. See server logs for details.',
        raw: text.substring(0, 100) + '...' 
      });
    }

  } catch (err) {
    console.error('Menu Scan Error:', err);
    res.status(500).json({ message: 'Internal server error during scan' });
  }
});

module.exports = router;
