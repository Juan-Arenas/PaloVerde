const express = require('express');
const router = express.Router();
const db = require('../db');

// LISTAR TODOS LOS PRODUCTOS
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos WHERE disponible=TRUE ORDER BY id');
    res.json({ ok: true, productos: result.rows });
  } catch (e) {
    console.error('productos error:', e);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// OBTENER UN PRODUCTO
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos WHERE id=$1', [req.params.id]);
    if (!result.rows.length)
      return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true, producto: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

module.exports = router;
