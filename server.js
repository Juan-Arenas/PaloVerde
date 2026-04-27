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

// Función para inicializar la base de datos automáticamente
const initDB = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Base de datos inicializada (Tablas creadas/verificadas)');
  } catch (err) {
    console.error('Error inicializando la base de datos:', err);
  }
};

// Test connection y ejecutar initDB
pool.connect(async (err, client, release) => {
  if (err) {
    return console.error('Error connecting to database:', err.stack);
  }
  console.log('Connected to PostgreSQL successfully');
  await initDB();
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
