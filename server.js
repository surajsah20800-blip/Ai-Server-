import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const PORT = process.env.PORT || 3000;
  const KEY = process.env.GEMINI_API_KEY;

  if (!KEY) { console.error("GEMINI_API_KEY missing!"); process.exit(1); }

  const ai = new GoogleGenAI({ apiKey: KEY });
  const mem = {};
  const PROMPT = "Tum ek funny, warm aur helpful AI ho jo emojis use karta hai. User ki language mein jawab do (Hindi/English/Urdu/koi bhi language). Jokes maro, helpful raho, human jaisa baat karo!";

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Content-Type");
    if(req.method==="OPTIONS"){res.sendStatus(200);return;}
    next();
  });

  app.get("/", (_, res) => res.status(200).json({ status:"ok", message:"Gemini AI Server is Live! 🚀" }));
  app.get("/health", (_, res) => res.status(200).send("OK"));

  app.post("/api/gemini/chat", async (req, res) => {
    const { message, sessionId } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const sid = sessionId || "s" + Date.now();
    if (!mem[sid]) mem[sid] = [];
    mem[sid].push({ role:"user", parts:[{ text:message }] });
    try {
      const r = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: mem[sid],
        config: { systemInstruction: PROMPT, maxOutputTokens: 8192 }
      });
      const reply = r.text || "Oops! 😅";
      mem[sid].push({ role:"model", parts:[{ text:reply }] });
      if (mem[sid].length > 30) mem[sid] = mem[sid].slice(-30);
      res.json({ reply, sessionId: sid });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/gemini/history/:sid", (req,res) => res.json(mem[req.params.sid]||[]));
  app.delete("/api/gemini/history/:sid", (req,res) => { delete mem[req.params.sid]; res.json({ok:true}); });

  app.listen(PORT, "0.0.0.0", () => console.log("✅ Server running on port " + PORT));
  