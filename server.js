const express = require("express");
  const { GoogleGenAI } = require("@google/genai");
  const { Pool } = require("pg");

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

  // Init DB tables
  async function initDB() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  // Health check
  app.get("/", (req, res) => res.json({ status: "ok", message: "Gemini AI Server is running! 🚀" }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Main chat endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      if (!message) return res.status(400).json({ error: "message is required" });

      const currentSessionId = sessionId || `session_${Date.now()}`;

      // Get chat history
      const historyRes = await pool.query(
        "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
        [currentSessionId]
      );

      const chatHistory = historyRes.rows.map(r => ({
        role: r.role === "assistant" ? "model" : "user",
        parts: [{ text: r.content }]
      }));

      // Save user message
      await pool.query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [currentSessionId, "user", message]
      );

      chatHistory.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatHistory,
        config: { maxOutputTokens: 8192, systemInstruction: SYSTEM_PROMPT }
      });

      const reply = response.text || "Sorry, I could not generate a response 😅";

      // Save assistant message
      await pool.query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [currentSessionId, "assistant", reply]
      );

      res.json({ reply, sessionId: currentSessionId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate response", details: err.message });
    }
  });

  // Get chat history
  app.get("/api/gemini/history/:sessionId", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
        [req.params.sessionId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear history
  app.delete("/api/gemini/history/:sessionId", async (req, res) => {
    try {
      await pool.query("DELETE FROM chat_messages WHERE session_id = $1", [req.params.sessionId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  initDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 Gemini AI Server running on port ${PORT}`));
  }).catch(err => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
  