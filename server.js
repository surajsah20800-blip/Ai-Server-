import express from "express";
  import { GoogleGenAI } from "@google/genai";
  import pg from "pg";

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set!");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // In-memory session store
  const sessions = {};

  // PostgreSQL (optional)
  let pool = null;
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = pg;
      pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("✅ PostgreSQL connected");
    } catch (e) {
      console.warn("DB failed, using in-memory:", e.message);
      pool = null;
    }
  } else {
    console.log("No DATABASE_URL — using in-memory storage");
  }

  const SYSTEM_PROMPT = `You are an incredibly fun, witty, and warm AI assistant! 🤖✨
  - You love cracking jokes and being playful — but also genuinely helpful 😄
  - You use emojis naturally in responses 🎉
  - You behave like a friendly human — warm, empathetic, curious
  - You speak ANY language the user uses — Hindi, Urdu, English, Arabic, Chinese, Japanese, etc.
  - You ALWAYS respond in the SAME language the user writes in
  - You know everything — science, history, culture, sports, tech, entertainment
  - You remember everything in this conversation
  - You add humor and jokes where appropriate 😂
  Knowledge + humor + emojis + human warmth = YOU! 🌟`;

  async function getHistory(sessionId) {
    if (pool) {
      const res = await pool.query(
        "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
        [sessionId]
      );
      return res.rows;
    }
    return sessions[sessionId] || [];
  }

  async function saveMessage(sessionId, role, content) {
    if (pool) {
      await pool.query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [sessionId, role, content]
      );
    } else {
      if (!sessions[sessionId]) sessions[sessionId] = [];
      sessions[sessionId].push({ role, content });
    }
  }

  app.get("/", (req, res) => res.json({ status: "ok", message: "Gemini AI Server running! 🚀" }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      if (!message) return res.status(400).json({ error: "message is required" });

      const sid = sessionId || `session_${Date.now()}`;
      const history = await getHistory(sid);

      const chatHistory = history.map(r => ({
        role: r.role === "assistant" ? "model" : "user",
        parts: [{ text: r.content }]
      }));

      await saveMessage(sid, "user", message);
      chatHistory.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatHistory,
        config: { maxOutputTokens: 8192, systemInstruction: SYSTEM_PROMPT }
      });

      const reply = response.text || "Sorry, could not generate a response 😅";
      await saveMessage(sid, "assistant", reply);

      res.json({ reply, sessionId: sid });
    } catch (err) {
      console.error("Chat error:", err.message);
      res.status(500).json({ error: "Failed to generate response", details: err.message });
    }
  });

  app.get("/api/gemini/history/:sessionId", async (req, res) => {
    try {
      const history = await getHistory(req.params.sessionId);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/gemini/history/:sessionId", async (req, res) => {
    try {
      if (pool) {
        await pool.query("DELETE FROM chat_messages WHERE session_id = $1", [req.params.sessionId]);
      } else {
        delete sessions[req.params.sessionId];
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
  