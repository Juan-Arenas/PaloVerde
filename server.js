const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files (index.html)

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render
  }
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to database:', err.stack);
  }
  console.log('Connected to PostgreSQL successfully');
  release();
});

// API Routes

// Save Order
app.post('/api/orders', async (req, res) => {
  const { items, total } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO orders (total, items) VALUES ($1, $2) RETURNING id',
      [total, JSON.stringify(items)]
    );
    res.status(201).json({ success: true, orderId: result.rows[0].id });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ success: false, error: 'Error al procesar el pedido' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
