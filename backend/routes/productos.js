const express = require('express');
const router  = express.Router();
const db      = require('../db');

/* ── LISTAR PRODUCTOS ── */
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let query  = 'SELECT * FROM productos WHERE disponible=TRUE';
    const vals = [];
    if (categoria && categoria !== 'todo') {
      query += ' AND categoria=$1';
      vals.push(categoria);
    }
    query += ' ORDER BY id ASC';
    const result = await db.query(query, vals);
    res.json({ productos: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/* ── PRODUCTO POR ID ── */
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ producto: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

module.exports = router;
