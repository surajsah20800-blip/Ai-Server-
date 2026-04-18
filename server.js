import express from "express";
  import { GoogleGenAI } from "@google/genai";

  const PORT = process.env.PORT || 3000;
  const p1 = "AIzaSyDaP";
  const p2 = "VjBZ9gq1o7dkm8k";
  const p3 = "Amb_ax70OcXe9lw";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || (p1 + p2 + p3);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const mem = {};

  const PROMPT = `Tumhara naam Mr. Jenix hai. Tum Mr. Suraj Sir ki ijaad ho.
  Agar naam pucho: "Main Mr. Jenix hoon! 😎"
  Agar kisne banaya pucho: "Mr. Suraj Sir ne! 🙏"
  Emojis use karo. User ki language mein jawab do (Hindi/English/Urdu/koi bhi language).
  Jokes karo. Helpful raho. Insaan jaisi baat karo.
  Jitna zaroorat ho utna jawab do!`;

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
    // Accept ANY field name that Auto Reply apps use
    const body = req.body || {};
    const userMessage = body.message || body.msg || body.text || body.query || body.content || body.input || body.userMessage || "";
    const sessionId = body.sessionId || body.session_id || body.userId || body.user_id || body.sender || body.from || ("s" + Date.now());

    console.log("Incoming:", JSON.stringify({ userMessage: userMessage.substring(0, 50), sessionId }));

    if (!userMessage || userMessage.trim() === "") {
      return res.status(200).json({ reply: "Kuch toh likho bhai! 😄", response: "Kuch toh likho bhai! 😄", text: "Kuch toh likho bhai! 😄" });
    }

    const sid = sessionId.toString();
    if (!mem[sid]) mem[sid] = [];
    mem[sid].push({ role: "user", parts: [{ text: userMessage }] });

    // Timeout promise - 25 seconds max
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 25000)
    );

    try {
      const aiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: mem[sid],
        config: {
          systemInstruction: PROMPT,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const r = await Promise.race([aiPromise, timeoutPromise]);
      const reply = r.text || "Oops! 😅";
      mem[sid].push({ role: "model", parts: [{ text: reply }] });
      if (mem[sid].length > 10) mem[sid] = mem[sid].slice(-10);

      // Multiple response fields for compatibility with all Auto Reply apps
      res.json({ reply, response: reply, text: reply, message: reply, answer: reply, sessionId: sid });
    } catch (e) {
      console.error("Error:", e.message);
      const fallback = e.message === "timeout"
        ? "Thoda busy hoon abhi, dobara try karo! 😅"
        : "Oops! Kuch gadbad ho gayi 😅 Dobara try karo!";
      res.status(200).json({ reply: fallback, response: fallback, text: fallback, message: fallback, answer: fallback });
    }
  });

  app.get("/api/gemini/history/:sid", (req, res) => res.json(mem[req.params.sid] || []));
  app.delete("/api/gemini/history/:sid", (req, res) => { delete mem[req.params.sid]; res.json({ ok: true }); });

  app.listen(PORT, "0.0.0.0", () => console.log("✅ Mr. Jenix AI Server running on port " + PORT));
  