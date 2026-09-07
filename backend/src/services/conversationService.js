const { pool } = require('../config/db');

function toApiShape(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    tokenCount: row.token_count,
    createdAt: row.created_at,
  };
}

/**
 * Latest `limit` rows in chronological order (oldest -> newest).
 */
async function getRecentMessages(limit) {
  const [rows] = await pool.query(
    'SELECT id, role, content, token_count, created_at FROM conversations ORDER BY id DESC LIMIT ?',
    [limit]
  );
  return rows.reverse();
}

/**
 * Latest 100 messages, mapped to the API response shape, oldest -> newest.
 */
async function getConversationHistory() {
  const rows = await getRecentMessages(100);
  return rows.map(toApiShape);
}

/**
 * Latest 5 messages used purely as AI context (not the API-facing shape).
 */
async function getRecentHistoryForAi() {
  return getRecentMessages(5);
}

async function insertMessage({ role, content, tokenCount = 0 }) {
  const [result] = await pool.query(
    'INSERT INTO conversations (role, content, token_count) VALUES (?, ?, ?)',
    [role, content, tokenCount]
  );
  return getMessageById(result.insertId);
}

async function getMessageById(id) {
  const [rows] = await pool.query(
    'SELECT id, role, content, token_count, created_at FROM conversations WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return toApiShape(rows[0]);
}

module.exports = {
  getConversationHistory,
  getRecentHistoryForAi,
  insertMessage,
};
