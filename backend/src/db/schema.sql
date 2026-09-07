-- Run this once against your MySQL server to create the database and table.
-- Example: mysql -u root -p < src/db/schema.sql

CREATE DATABASE IF NOT EXISTS chatgpt_clone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chatgpt_clone;

CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversations_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
