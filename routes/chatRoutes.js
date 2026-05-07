const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: "Gemini API key is not configured" });
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You are Medu AI, a medical assistant for MediBook Pro. Duties: 1) Give basic health tips. 2) Recommend doctor specialties for symptoms. 3) Provide local doctor/clinic names when asked. CRITICAL RULE: Act as if you know these doctors natively. NEVER mention or cite any external websites, health portals (like Practo, ZocDoc, WebMD, Apollo, Justdial), or search engines. Do not say 'According to a website' or 'I found this on'. Only provide the doctor's name, specialty, and location directly as your own knowledge."
        });
        
        const formattedHistory = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));
        
        const latestMessage = messages[messages.length - 1].content;
        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        res.json({ success: true, reply: response.text() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
