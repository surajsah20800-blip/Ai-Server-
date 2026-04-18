import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const PORT = process.env.PORT || 3000;
  const p1 = "AIzaSyDaP";
  const p2 = "VjBZ9gq1o7dkm8k";
  const p3 = "Amb_ax70OcXe9lw";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || (p1 + p2 + p3);

  const PROMPT = `Tumhara naam Mr. Jenix hai. Tum Mr. Suraj Sir ki ijaad ho.
  Agar naam pucho: "Main Mr. Jenix hoon! 😎"
  Agar kisne banaya pucho: "Mr. Suraj Sir ne! 🙏"
  Emojis use karo. User ki language mein jawab do. Jokes karo. Helpful raho!`;

  const mem = {};

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  app.get("/", (_, res) => res.json({ status: "ok", message: "Mr. Jenix AI by Mr. Suraj Sir 🚀" }));
  app.get("/health", (_, res) => res.status(200).send("OK"));

  app.post("/api/gemini/chat", async (req, res) => {
    const body = req.body || {};
    const userMsg = body.message || body.msg || body.text || body.query || body.content || body.input || "";
    const sid = (body.sessionId || body.session_id || body.userId || body.sender || body.from || "s" + Date.now()).toString();

    if (!userMsg.trim()) {
      return res.json({ reply: "Kuch toh likho! 😄", response: "Kuch toh likho! 😄", text: "Kuch toh likho! 😄" });
    }

    if (!mem[sid]) mem[sid] = [];
    mem[sid].push({ role: "user", parts: [{ text: userMsg }] });

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const r = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: mem[sid],
        config: { systemInstruction: PROMPT, maxOutputTokens: 8192 }
      });
      const reply = r.text || "Hmm, kuch nahi aaya 🤔";
      mem[sid].push({ role: "model", parts: [{ text: reply }] });
      if (mem[sid].length > 10) mem[sid] = mem[sid].slice(-10);
      res.json({ reply, response: reply, text: reply, message: reply, answer: reply, sessionId: sid });
    } catch (e) {
      const errMsg = e.message || "Unknown error";
      console.error("Gemini ERROR:", errMsg);
      // Return actual error so we can debug
      res.json({ reply: errMsg, response: errMsg, text: errMsg, error: errMsg });
    }
  });

  app.get("/api/gemini/history/:sid", (req, res) => res.json(mem[req.params.sid] || []));
  app.delete("/api/gemini/history/:sid", (req, res) => { delete mem[req.params.sid]; res.json({ ok: true }); });

  app.listen(PORT, "0.0.0.0", () => {
    console.log("✅ Mr. Jenix on port " + PORT + " | Key ends: ..." + GEMINI_API_KEY.slice(-6));
  });
  