const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/scan', upload.single('menuImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return res.status(401).json({ message: 'Groq API Key (GROQ_API_KEY) is missing on the server settings' });
    }

    const groq = new Groq({ apiKey });

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const prompt = `Extract all menu items from this restaurant menu image. 
    Format the output as a JSON array of objects with exactly these keys: 
    "category" (e.g., Starters, Main Course, Drinks), 
    "name" (the item name), 
    "price" (the cost as a number, remove currency symbols).
    
    Rules:
    - If a category is not explicitly mentioned, group items reasonably.
    - Ensure price is a raw number (e.g., 150 instead of "₹150").
    - If no price is found, use 0.
    - Return ONLY the clean JSON array. No markdown, no explanation, no backticks.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.1,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
    });

    const text = chatCompletion.choices[0].message.content;

    // Clean potential markdown if the model ignores the "ONLY JSON" rule
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text.trim();

    try {
      const items = JSON.parse(cleanJson);
      res.json(items);
    } catch (parseErr) {
      console.error('Groq Parse Error:', text);
      res.status(500).json({
        message: 'AI Scan Parsing Failed',
        error: parseErr.message,
        rawPart: text.substring(0, 100)
      });
    }

  } catch (err) {
    console.error('Groq Scan Error:', err);
    res.status(500).json({
      message: 'Groq Scan Server Error',
      error: err.message || 'Unknown error occurred'
    });
  }
});

module.exports = router;
