import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const app = express();

  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.status(200).end(); return; }
    next();
  });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error("❌ GEMINI_API_KEY set nahi hai!");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const memory = {};

  const SYSTEM = "Tum ek bahut funny, warm aur smart AI ho jo emojis use karta hai 🤖. User ki language mein jawab do (Hindi, English, Urdu, Arabic, sab). Jokes maro, helpful raho, duniya ki sari knowledge rakho. Conversation yaad rakho!";

  app.get("/health", (_, res) => res.json({ ok: true }));
  app.get("/", (_, res) => res.json({ status: "running", endpoint: "POST /api/gemini/chat" }));

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const msg = req.body.message;
      const sid = req.body.sessionId || ("s" + Date.now());
      if (!msg) return res.status(400).json({ error: "message required" });

      if (!memory[sid]) memory[sid] = [];
      memory[sid].push({ role: "user", parts: [{ text: msg }] });

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: memory[sid],
        config: { systemInstruction: SYSTEM, maxOutputTokens: 8192 }
      });

      const reply = result.text ?? "Oops! 😅";
      memory[sid].push({ role: "model", parts: [{ text: reply }] });
      if (memory[sid].length > 40) memory[sid] = memory[sid].slice(-40);

      res.json({ reply, sessionId: sid });
    } catch (e) {
      console.error(e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/gemini/history/:sid", (req, res) => {
    res.json(memory[req.params.sid] || []);
  });

  app.delete("/api/gemini/history/:sid", (req, res) => {
    delete memory[req.params.sid];
    res.json({ ok: true });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => console.log("🚀 Server running on port " + PORT));
  