# Gemini AI Server 🤖

  A fun, multilingual AI chatbot server powered by Google Gemini Flash.

  ## Features
  - 😄 Jokes and humor
  - 🌍 All world languages supported
  - 🧠 Conversation memory (session-based)
  - 📚 Vast knowledge on any topic
  - 🎉 Emoji-rich responses

  ## API Endpoints

  ### Chat
  ```
  POST /api/gemini/chat
  Content-Type: application/json

  {
    "message": "Hello! Ek joke sunao",
    "sessionId": "optional-unique-id"
  }
  ```

  ### Get History
  ```
  GET /api/gemini/history/:sessionId
  ```

  ### Clear History
  ```
  DELETE /api/gemini/history/:sessionId
  ```

  ## Deploy on Railway

  1. Add PostgreSQL service in Railway
  2. Set `GEMINI_API_KEY` environment variable
  3. Deploy!
  