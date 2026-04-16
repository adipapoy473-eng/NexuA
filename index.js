// ═══════════════════════════════════════════════════════
// NexusAI — Gemini Chatbot Backend Server
// AI Productivity Program · Hacktiv8 × Google.org × AVPN × ADB
// ═══════════════════════════════════════════════════════

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Default model
const GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";

// ═══════════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════════
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ═══════════════════════════════════════════════
// POST /api/chat — Multi-turn conversation
// ═══════════════════════════════════════════════
app.post("/api/chat", async (req, res) => {
  try {
    const { conversation, config } = req.body;

    // Validate input
    if (!Array.isArray(conversation)) {
      return res.status(400).json({
        error: "Invalid input: 'conversation' must be an array of messages.",
      });
    }

    // Transform to Gemini format
    const contents = conversation.map((msg) => ({
      role: msg.role === "bot" ? "model" : msg.role,
      parts: [{ text: msg.text }],
    }));

    // Generation parameters
    const generationConfig = {
      temperature: config?.temperature ?? 0.7,
      topK: config?.topK ?? 40,
      topP: config?.topP ?? 0.95,
    };

    // System instruction
    const systemInstruction =
      config?.systemInstruction ||
      "Kamu adalah NexusAI, asisten AI yang ramah, cerdas, dan sangat membantu. Jawab dalam bahasa yang sama dengan bahasa pengguna. Berikan jawaban yang informatif, terstruktur, jelas, dan bermanfaat. Gunakan markdown formatting untuk menyusun jawaban yang rapi (heading, list, code blocks). Gunakan emoji sesekali untuk membuat percakapan lebih hidup. Jika ditanya tentang topik sensitif, tetap sopan dan profesional.";

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: contents,
      config: {
        ...generationConfig,
        systemInstruction: systemInstruction,
      },
    });

    const resultText = response.text;
    res.json({ result: resultText });
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    res.status(500).json({
      error: "Failed to generate response from Gemini AI.",
      details: error.message,
    });
  }
});

// ═══════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: GEMINI_MODEL, timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n⚡ NexusAI Server is running!`);
  console.log(`📡 API: http://localhost:${PORT}/api/chat`);
  console.log(`🌐 UI:  http://localhost:${PORT}/`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
