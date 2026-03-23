const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '573183177682';
const MP_LINK = 'https://link.mercadopago.com.co/inversionespaloverde';

// CREAR PEDIDO Y OBTENER LINK DE PAGO
router.post('/crear', authMiddleware, async (req, res) => {
  try {
    const { moneda = 'COP', tasa = 1 } = req.body;

    // Obtener items del carrito
    const carritoResult = await db.query(
      `SELECT ci.cantidad, p.id as producto_id, p.nombre, p.precio_usd
       FROM carrito_items ci
       JOIN productos p ON p.id = ci.producto_id
       WHERE ci.usuario_id = $1`,
      [req.userId]
    );

    if (!carritoResult.rows.length)
      return res.status(400).json({ error: 'El carrito está vacío' });

    const items = carritoResult.rows;
    const monto_usd = items.reduce((sum, item) => sum + (item.precio_usd * item.cantidad), 0);
    const monto_moneda = (monto_usd * tasa).toFixed(2);

    // Crear pedido en BD
    const pedidoResult = await db.query(
      `INSERT INTO pedidos(usuario_id, monto_usd, moneda_pago, monto_moneda)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [req.userId, monto_usd, moneda, monto_moneda]
    );
    const pedidoId = pedidoResult.rows[0].id;

    // Guardar items del pedido
    for (const item of items) {
      await db.query(
        `INSERT INTO pedido_items(pedido_id, producto_id, nombre, precio_usd, cantidad)
         VALUES($1,$2,$3,$4,$5)`,
        [pedidoId, item.producto_id, item.nombre, item.precio_usd, item.cantidad]
      );
    }

    // Generar resumen para WhatsApp
    const resumen = items.map(i => `• ${i.nombre} x${i.cantidad} — $${i.precio_usd} USD`).join('\n');
    const mensaje = encodeURIComponent(
      `🌿 *PALO VERDE ESMERALDA*\n` +
      `Pedido #${pedidoId}\n\n` +
      `${resumen}\n\n` +
      `💰 Total: $${monto_usd.toFixed(2)} USD (${monto_moneda} ${moneda})\n\n` +
      `✅ Ya realicé mi pago por Mercado Pago.\n` +
      `Por favor confirmar mi pedido. 🙏`
    );

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;

    res.json({
      ok: true,
      pedidoId,
      mpLink: MP_LINK,
      whatsappUrl,
      monto_usd,
      monto_moneda,
      moneda
    });

  } catch (e) {
    console.error('pagos error:', e);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

// CONFIRMAR PAGO (el cliente dice que ya pagó)
router.post('/confirmar/:pedidoId', authMiddleware, async (req, res) => {
  try {
    await db.query(
      `UPDATE pedidos SET estado='pagado', pagado_en=NOW(), whatsapp_enviado=TRUE
       WHERE id=$1 AND usuario_id=$2`,
      [req.params.pedidoId, req.userId]
    );

    // Vaciar carrito
    await db.query('DELETE FROM carrito_items WHERE usuario_id=$1', [req.userId]);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
});

// VER PEDIDOS DEL USUARIO
router.get('/mis-pedidos', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, 
        json_agg(json_build_object('nombre', pi.nombre, 'cantidad', pi.cantidad, 'precio_usd', pi.precio_usd)) as items
       FROM pedidos p
       LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
       WHERE p.usuario_id = $1
       GROUP BY p.id
       ORDER BY p.creado_en DESC`,
      [req.userId]
    );
    res.json({ ok: true, pedidos: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

module.exports = router;
