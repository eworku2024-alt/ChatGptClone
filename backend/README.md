# ChatGPT Clone — Backend

Express + MySQL backend implementing the two chat APIs from the project spec:

- `GET /api/chat/conversations` — returns the latest 100 saved messages, oldest → newest.
- `POST /api/chat/conversations` — saves a user question, calls the AI provider (Anthropic),
  saves the assistant's answer, and returns both saved rows.

The assistant is restricted server-side (via a system prompt) to software engineering,
programming, computer science, and IT topics, and politely declines everything else.

## 1. Install dependencies

```bash
cd chatgpt-clone-backend
npm install
```

## 2. Set up the database

Make sure MySQL is running locally, then create the database and table:

```bash
mysql -u root -p < src/db/schema.sql
```

This creates a `chatgpt_clone` database with a `conversations` table
(`id`, `role`, `content`, `token_count`, `created_at`).

## 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — your local MySQL credentials.
- `GEMINI_API_KEY` — your free Google Gemini API key (from https://aistudio.google.com/apikey). No credit card required.
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash`; change if you want a different model.
- `PORT` — defaults to `3777` to match the frontend's `API_BASE_URL`.
- `CLIENT_ORIGIN` — the frontend's dev server URL (e.g. `http://localhost:5173`), used for CORS.

## 4. Run the server

```bash
npm run dev    # with nodemon, auto-restarts on file changes
# or
npm start      # plain node
```

You should see:

```
MySQL connection established.
Server running at http://localhost:3777
```

## 5. Test with Postman

**GET** `http://localhost:3777/api/chat/conversations` — no body.

**POST** `http://localhost:3777/api/chat/conversations` with a raw JSON body:

```json
{ "question": "What is a closure in JavaScript?" }
```

Try an off-topic question too, to confirm the assistant redirects instead of answering:

```json
{ "question": "What should I eat for dinner?" }
```

## 6. Connect the frontend

The provided React frontend already points at `http://localhost:3777/api`
(see `API_BASE_URL` in `App.jsx`), so once this server is running on port 3777,
starting the frontend dev server should connect automatically — no frontend changes needed.

## Project structure

```
chatgpt-clone-backend/
├── package.json
├── .env.example
├── README.md
└── src/
    ├── server.js              # entry point — loads env, verifies DB, starts listening
    ├── app.js                 # express app, middleware, route mounting, error handling
    ├── config/
    │   └── db.js               # mysql2 connection pool
    ├── db/
    │   └── schema.sql          # database + table creation script
    ├── routes/
    │   └── chatRoutes.js       # GET/POST /api/chat/conversations routes
    ├── controllers/
    │   └── chatController.js   # request validation + orchestration
    └── services/
        ├── conversationService.js  # all DB reads/writes for conversations
        └── aiService.js            # Anthropic API call + system prompt
```

## Notes on behavior (matches the documented spec)

- `POST` is **not idempotent** — every successful call inserts a new user row and a new
  assistant row, even for a repeated question.
- The AI context uses only the **latest 5** previous rows, loaded *before* the new user
  message is inserted, plus the new question itself.
- The visible chat history (`GET`) returns up to **100** rows, independent of the 5-row
  AI context window.
- Validation: `question` must be a non-empty string after trimming, max 65,535 characters.
- Error responses use `{"status": false, "message": "..."}`; success responses use
  `{"success": true, "message": "...", "data": {...}}`, matching the API doc exactly.
