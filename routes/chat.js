const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Init Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

router.post('/', async (req, res) => {
    try {
        if (!genAI) {
            throw new Error("API Key belum disetting di .env!");
        }

        const userMessage = req.body.message;
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash" 
        });

        const prompt = `
            Role: Kamu adalah 'LuxeBot', asisten toko furniture 'LuxeSpace'.
            Tone: Elegan, mewah, membantu. Bahasa Indonesia.
            Konteks Produk: 
            - Chesterfield Sofa (Klasik, Mewah)
            - Oak Minimalist Table (Kayu Jati, Kuat)
            - ErgoMaster Chair (Ergonomis, Kerja)
            - Scandi Lamp (Estetik)
            
            Tugas: Jawab pertanyaan user berikut dengan ringkas (max 3 kalimat):
            "${userMessage}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ ERROR AI:", error.message);
        res.status(500).json({ 
            reply: "Maaf, LuxeBot sedang maintenance sebentar. (Error: " + error.message + ")"
        });
    }
});

module.exports = router;