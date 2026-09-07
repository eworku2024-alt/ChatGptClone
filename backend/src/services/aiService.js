// Uses Google's Gemini API (generous free tier, no credit card required).
// Get a free key at https://aistudio.google.com/apikey
const GEMINI_VERSION_PATH = 'v1beta';

// Retry settings for transient provider errors (503 overloaded, 429 rate limited).
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000; // 1s, then 2s

// Keeps the assistant focused on software engineering / programming / CS / IT topics.
// This lives on the server so the frontend cannot override the assistant's scope or safety rules.
const SYSTEM_PROMPT = `You are a focused programming assistant, similar in spirit to a ChatGPT clone
built for software engineers and IT professionals.

Your scope:
- Help with software engineering, programming, debugging, computer science, and IT questions.
- Explain concepts clearly and practically, with examples when useful.
- Use Markdown formatting when it improves readability.
- Wrap all code examples in properly fenced code blocks with a language tag.
- Never write, explain, or help debug malicious, harmful, or unethical code (malware, exploits,
  credential theft, etc.).

Out of scope:
- If the user asks about something unrelated to programming, software engineering, computer
  science, or IT (e.g. cooking, relationships, general trivia), politely decline and steer the
  conversation back to programming topics. Keep the redirection short and friendly.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Performs a single call to the Gemini generateContent endpoint.
 * Throws an Error with `.code` and, for HTTP failures, `.status` set.
 */
async function callGemini(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    const err = new Error('Failed to reach the AI provider.');
    err.code = 'AI_NETWORK_ERROR';
    err.cause = networkErr;
    throw err;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const err = new Error(`AI provider request failed with status ${response.status}: ${errorBody}`);
    err.code = 'AI_REQUEST_FAILED';
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Calls the Gemini API with prior conversation history plus a new user question.
 * Automatically retries on transient errors (503 Unavailable, 429 Rate Limited)
 * using exponential backoff.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history - prior turns, oldest first
 * @param {string} question - the new, already-trimmed user question
 * @returns {Promise<{answer: string, tokenCount: number}>}
 */
async function getAssistantResponse(history, question) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const err = new Error('AI provider API key is not configured.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/${GEMINI_VERSION_PATH}/models/${model}:generateContent?key=${apiKey}`;

  // Gemini calls the assistant role "model" instead of "assistant"; the DB stores it
  // as "assistant" to keep the API-facing shape consistent, so it gets converted here.
  const contents = [
    ...history.map(row => ({
      role: row.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: row.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];

  const body = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: { maxOutputTokens: 1024 },
  };

  let lastErr;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await callGemini(url, body);

      const answer = (data.candidates?.[0]?.content?.parts || [])
        .map(part => part.text || '')
        .join('')
        .trim();

      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const tokenCount = promptTokens + outputTokens;

      return { answer, tokenCount };
    } catch (err) {
      lastErr = err;

      const isRetryable = err.status === 503 || err.status === 429;
      const hasAttemptsLeft = attempt < MAX_RETRIES;

      if (isRetryable && hasAttemptsLeft) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt); // 1000ms, 2000ms
        console.warn(
          `Gemini request failed with status ${err.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  // Should be unreachable, but keeps the function's return type honest.
  throw lastErr;
}

module.exports = { getAssistantResponse };