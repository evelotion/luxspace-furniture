const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../config/db"); 
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

router.post('/', async (req, res) => {
    try {
        if (!genAI) throw new Error("API Key belum disetting!");


        const productRes = await db.query("SELECT name, category, description, price FROM products WHERE stock > 0");
        const productContext = productRes.rows.map(p => 
            `- ${p.name} (${p.category}): ${p.description}. Harga: Rp${p.price.toLocaleString()}`
        ).join('\n');

        const userMessage = req.body.message;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 


        const prompt = `
            Role: Kamu adalah 'LuxeBot', asisten toko furniture 'LuxeSpace'.
            Tone: Elegan, mewah, membantu.
            Konteks Produk (DIAMBIL DARI DATABASE): 
            ${productContext}
            
            Tugas: Rekomendasikan produk yang paling sesuai dari daftar di atas berdasarkan pertanyaan user. 
            Jawab dengan ringkas (max 3 kalimat).
            User: "${userMessage}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ reply: response.text() });

    } catch (error) {
        console.error("❌ ERROR AI:", error.message);
        res.status(500).json({ reply: "Maaf, LuxeBot sedang maintenance." });
    }
});

module.exports = router;