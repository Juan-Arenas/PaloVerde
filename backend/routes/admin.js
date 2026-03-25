const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'paloverde_secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'paloverde2026admin';

/* ── AUTH MIDDLEWARE ADMIN ── */
function adminAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'No autorizado' });
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/* ── LOGIN ADMIN ── */
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ ok: true, token });
});

/* ── STATS ── */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [prod, ped, vent, usr] = await Promise.all([
      db.query('SELECT COUNT(*) FROM productos'),
      db.query("SELECT COUNT(*) FROM pedidos WHERE estado='pagado'"),
      db.query("SELECT COALESCE(SUM(monto_usd),0) as total FROM pedidos WHERE estado='pagado'"),
      db.query('SELECT COUNT(*) FROM usuarios')
    ]);
    res.json({
      ok: true,
      productos:   parseInt(prod.rows[0].count),
      pedidos:     parseInt(ped.rows[0].count),
      ventas_usd:  parseFloat(vent.rows[0].total),
      usuarios:    parseInt(usr.rows[0].count)
    });
  } catch (e) {
    console.error('admin stats error:', e);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/* ── LISTAR PRODUCTOS (admin, incluye no disponibles) ── */
router.get('/productos', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos ORDER BY id DESC');
    res.json({ ok: true, productos: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/* ── CREAR PRODUCTO ── */
router.post('/productos', adminAuth, async (req, res) => {
  try {
    const { nombre, descripcion, precio_usd, precio_original_usd, imagen_url, material, quilates, categoria, disponible } = req.body;
    if (!nombre || !precio_usd) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    // Asegurarse de que la columna existe
    await db.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_original_usd DECIMAL(10,2)
    `).catch(() => {});

    const result = await db.query(
      `INSERT INTO productos (nombre, descripcion, precio_usd, precio_original_usd, imagen_url, material, quilates, categoria, disponible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, descripcion || '', precio_usd, precio_original_usd || null, imagen_url || '', material || '', quilates || null, categoria || 'general', disponible !== false]
    );
    res.status(201).json({ ok: true, producto: result.rows[0] });
  } catch (e) {
    console.error('admin crear producto error:', e);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

/* ── ACTUALIZAR PRODUCTO ── */
router.put('/productos/:id', adminAuth, async (req, res) => {
  try {
    const { nombre, descripcion, precio_usd, precio_original_usd, imagen_url, material, quilates, categoria, disponible } = req.body;
    if (!nombre || !precio_usd) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    await db.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_original_usd DECIMAL(10,2)
    `).catch(() => {});

    const result = await db.query(
      `UPDATE productos SET nombre=$1, descripcion=$2, precio_usd=$3, precio_original_usd=$4,
       imagen_url=$5, material=$6, quilates=$7, categoria=$8, disponible=$9
       WHERE id=$10 RETURNING *`,
      [nombre, descripcion || '', precio_usd, precio_original_usd || null, imagen_url || '', material || '', quilates || null, categoria || 'general', disponible !== false, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true, producto: result.rows[0] });
  } catch (e) {
    console.error('admin actualizar producto error:', e);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

/* ── ELIMINAR PRODUCTO ── */
router.delete('/productos/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM carrito_items WHERE producto_id=$1', [req.params.id]);
    await db.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('admin eliminar producto error:', e);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

/* ── LISTAR PEDIDOS (admin) ── */
router.get('/pedidos', adminAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.correo, u.nombre as usuario_nombre,
        COALESCE(json_agg(json_build_object(
          'nombre', pi.nombre, 'cantidad', pi.cantidad, 'precio_usd', pi.precio_usd
        )) FILTER (WHERE pi.id IS NOT NULL), '[]') as items
       FROM pedidos p
       LEFT JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
       GROUP BY p.id, u.correo, u.nombre
       ORDER BY p.creado_en DESC
       LIMIT 100`
    );
    res.json({ ok: true, pedidos: result.rows });
  } catch (e) {
    console.error('admin pedidos error:', e);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

module.exports = router;