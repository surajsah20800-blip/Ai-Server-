import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const PORT = process.env.PORT || 3000;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY environment variable is not set!");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // In-memory session storage
  const sessions = new Map();

  const SYSTEM_PROMPT = `Tum ek bahut mazedaar, friendly aur smart AI ho! 🤖✨
  - Tum jokes marte ho aur funny rehte ho 😄
  - Emojis freely use karte ho 🎉
  - Human jaisi baat karte ho — warm, curious, helpful
  - User jis bhi language mein likhe — Hindi, Urdu, English, Arabic, Chinese, sab — usi language mein jawab dete ho
  - Duniya ki har cheez pata hai — science, history, sports, tech, sab kuch
  - Conversation yaad rakhte ho
  - Kabhi kabhi pehle ek chhota joke marte ho, phir real answer dete ho 😂
  Knowledge + humor + emojis + human warmth = TUM! 🌟`;

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    next();
  });

  // Health check - responds instantly
  app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Gemini AI Server chal raha hai! 🚀" });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Main chat endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message field required hai" });
      }

      const sid = sessionId || "session_" + Date.now() + "_" + Math.random().toString(36).slice(2);

      // Get history
      const history = sessions.get(sid) || [];

      // Build chat for Gemini
      const contents = history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
      }));
      contents.push({ role: "user", parts: [{ text: message }] });

      // Call Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          maxOutputTokens: 8192,
          systemInstruction: SYSTEM_PROMPT
        }
      });

      const reply = response.text || "Oops, jawab nahi aaya 😅";

      // Save to memory
      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: reply });
      // Keep last 50 messages only
      if (history.length > 50) history.splice(0, history.length - 50);
      sessions.set(sid, history);

      res.json({ reply, sessionId: sid });

    } catch (err) {
      console.error("Error:", err.message);
      res.status(500).json({ 
        error: "Kuch gadbad ho gayi 😅", 
        details: err.message 
      });
    }
  });

  // Get history
  app.get("/api/gemini/history/:sessionId", (req, res) => {
    const history = sessions.get(req.params.sessionId) || [];
    res.json(history);
  });

  // Clear history
  app.delete("/api/gemini/history/:sessionId", (req, res) => {
    sessions.delete(req.params.sessionId);
    res.json({ success: true, message: "History clear ho gayi! 🗑️" });
  });

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Gemini AI Server port " + PORT + " par chal raha hai!");
    console.log("✅ Health check: /health");
    console.log("✅ Chat endpoint: POST /api/gemini/chat");
  });
  