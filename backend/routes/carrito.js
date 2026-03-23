const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// VER CARRITO
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ci.id, ci.cantidad, p.id as producto_id, p.nombre, p.precio_usd, p.imagen_url, p.material
       FROM carrito_items ci
       JOIN productos p ON p.id = ci.producto_id
       WHERE ci.usuario_id = $1`,
      [req.userId]
    );
    res.json({ ok: true, items: result.rows });
  } catch (e) {
    console.error('carrito get error:', e);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// AGREGAR AL CARRITO
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { producto_id, cantidad = 1 } = req.body;
    if (!producto_id)
      return res.status(400).json({ error: 'producto_id es obligatorio' });

    await db.query(
      `INSERT INTO carrito_items(usuario_id, producto_id, cantidad)
       VALUES($1,$2,$3)
       ON CONFLICT(usuario_id, producto_id)
       DO UPDATE SET cantidad = carrito_items.cantidad + $3`,
      [req.userId, producto_id, cantidad]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('carrito post error:', e);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

// ACTUALIZAR CANTIDAD
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad < 1)
      return res.status(400).json({ error: 'Cantidad inválida' });

    await db.query(
      'UPDATE carrito_items SET cantidad=$1 WHERE id=$2 AND usuario_id=$3',
      [cantidad, req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
});

// ELIMINAR ITEM
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM carrito_items WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

// VACIAR CARRITO
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM carrito_items WHERE usuario_id=$1', [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

module.exports = router;
