const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../db');

/* ── VER CARRITO ── */
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ci.id, ci.cantidad, ci.agregado_en,
             p.id AS producto_id, p.nombre, p.descripcion,
             p.precio_usd, p.imagen_url, p.material, p.categoria
      FROM carrito_items ci
      JOIN productos p ON p.id = ci.producto_id
      WHERE ci.usuario_id = $1
      ORDER BY ci.agregado_en DESC
    `, [req.userId]);
    res.json({ items: result.rows });
  } catch (e) {
    console.error('get cart error:', e);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

/* ── AÑADIR AL CARRITO ── */
router.post('/add', auth, async (req, res) => {
  try {
    const { producto_id, cantidad = 1 } = req.body;
    if (!producto_id) return res.status(400).json({ error: 'Producto requerido' });

    const prod = await db.query('SELECT id FROM productos WHERE id=$1 AND disponible=TRUE', [producto_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    await db.query(`
      INSERT INTO carrito_items(usuario_id, producto_id, cantidad)
      VALUES($1,$2,$3)
      ON CONFLICT(usuario_id, producto_id)
      DO UPDATE SET cantidad = carrito_items.cantidad + $3
    `, [req.userId, producto_id, cantidad]);

    res.json({ ok: true, mensaje: 'Producto añadido al carrito' });
  } catch (e) {
    console.error('add cart error:', e);
    res.status(500).json({ error: 'Error al añadir al carrito' });
  }
});

/* ── ACTUALIZAR CANTIDAD ── */
router.put('/item/:id', auth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (cantidad < 1) return res.status(400).json({ error: 'Cantidad inválida' });

    await db.query(
      'UPDATE carrito_items SET cantidad=$1 WHERE id=$2 AND usuario_id=$3',
      [cantidad, req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

/* ── ELIMINAR ITEM ── */
router.delete('/item/:id', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM carrito_items WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

/* ── VACIAR CARRITO ── */
router.delete('/vaciar', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM carrito_items WHERE usuario_id=$1', [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

module.exports = router;
