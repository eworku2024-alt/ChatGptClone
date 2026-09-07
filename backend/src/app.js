const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/api/chat', chatRoutes);

// Basic health check
app.get('/', (req, res) => {
  res.json({ status: true, message: 'ChatGPT clone backend is running.' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: false, message: 'Route not found' });
});

// Generic error handler (safety net for anything thrown outside try/catch)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ status: false, message: 'Something went wrong try again later' });
});

module.exports = app;
