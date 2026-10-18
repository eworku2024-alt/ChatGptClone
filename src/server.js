require('dotenv').config();

const app = require('./app');
const { verifyConnection } = require('./config/db');

const PORT = process.env.PORT || 3777;

async function start() {
  try {
    await verifyConnection();
  } catch (err) {
    console.error('Could not connect to MySQL. Check your .env DB_* values.');
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
