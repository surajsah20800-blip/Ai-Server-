import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const PORT = process.env.PORT || 3000;
  const p1 = "AIzaSyDaP";
  const p2 = "VjBZ9gq1o7dkm8k";
  const p3 = "Amb_ax70OcXe9lw";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || (p1 + p2 + p3);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const mem = {};

  const PROMPT = `Tumhara naam Mr. Jenix hai. Tum Mr. Suraj Sir ki ijaad (invention) ho.
  Tum ek funny, warm aur helpful AI ho.
  Agar koi tumhara naam puche toh bolo "Main Mr. Jenix hoon! 😎"
  Agar koi puche tumhe kisne banaya toh bolo "Mujhe Mr. Suraj Sir ne banaya hai! 🙏"
  Emojis zaroor use karo. User ki language mein jawab do (Hindi/English/Urdu/koi bhi language).
  Jokes maro, helpful raho, bilkul insaan jaisi baat karo!`;

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  app.get("/", (_, res) => res.json({ status: "ok", message: "Mr. Jenix AI Server Live! 🚀 by Mr. Suraj Sir" }));
  app.get("/health", (_, res) => res.status(200).send("OK"));

  app.post("/api/gemini/chat", async (req, res) => {
    const { message, sessionId } = req.body || {};
    if (!message) return res.status(400).json({ error: "message field required" });
    const sid = sessionId || "s" + Date.now();
    if (!mem[sid]) mem[sid] = [];
    mem[sid].push({ role: "user", parts: [{ text: message }] });
    try {
      const r = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: mem[sid],
        config: { systemInstruction: PROMPT, maxOutputTokens: 8192 }
      });
      const reply = r.text || "Oops! 😅";
      mem[sid].push({ role: "model", parts: [{ text: reply }] });
      if (mem[sid].length > 30) mem[sid] = mem[sid].slice(-30);
      res.json({ reply, sessionId: sid });
    } catch (e) {
      console.error("Gemini error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/gemini/history/:sid", (req, res) => res.json(mem[req.params.sid] || []));
  app.delete("/api/gemini/history/:sid", (req, res) => { delete mem[req.params.sid]; res.json({ ok: true }); });

  app.listen(PORT, "0.0.0.0", () => console.log("✅ Mr. Jenix AI Server running on port " + PORT));
  