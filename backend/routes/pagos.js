const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../db');

/* ── TASAS DE CAMBIO APROXIMADAS vs USD ──
   Se actualizan manualmente o via API externa.
   Para producción, integrar con exchangerate-api.com o similar. */
const TASAS = {
  USD: 1,
  COP: 4150,
  EUR: 0.92,
  BRL: 5.05,
  MXN: 17.15,
  PEN: 3.73,
  CLP: 945,
  ARS: 870,
  PAB: 1,        // paridad con USD
  CRC: 520,
  GTQ: 7.79,
  HNL: 24.75,
  BOB: 6.91,
  DOP: 59.5
};

const SIMBOLOS = {
  USD:'$', COP:'$', EUR:'€', BRL:'R$', MXN:'$',
  PEN:'S/', CLP:'$', ARS:'$', PAB:'B/.', CRC:'₡',
  GTQ:'Q', HNL:'L', BOB:'Bs.', DOP:'RD$'
};

/* ── CONVERTIR PRECIO ── */
router.get('/convertir', async (req, res) => {
  const { monto_usd, moneda } = req.query;
  const tasa = TASAS[moneda];
  if (!tasa) return res.status(400).json({ error: 'Moneda no soportada' });
  const convertido = (parseFloat(monto_usd) * tasa).toFixed(2);
  res.json({
    monto_usd: parseFloat(monto_usd),
    moneda,
    tasa,
    convertido: parseFloat(convertido),
    simbolo: SIMBOLOS[moneda] || moneda,
    tasas: TASAS,
    simbolos: SIMBOLOS
  });
});

/* ── CREAR PEDIDO Y GENERAR LINK DE PAGO ──
   Con access_token de MercadoPago se genera preference dinámica.
   Sin token, se usa el link fijo y se guarda el pedido como pendiente. */
router.post('/crear-pedido', auth, async (req, res) => {
  try {
    const { moneda = 'COP' } = req.body;

    // Obtener carrito del usuario
    const carrito = await db.query(`
      SELECT ci.cantidad, p.id AS producto_id, p.nombre, p.precio_usd
      FROM carrito_items ci JOIN productos p ON p.id=ci.producto_id
      WHERE ci.usuario_id=$1
    `, [req.userId]);

    if (!carrito.rows.length)
      return res.status(400).json({ error: 'El carrito está vacío' });

    // Calcular total en USD
    const totalUSD = carrito.rows.reduce(
      (sum, item) => sum + (parseFloat(item.precio_usd) * item.cantidad), 0
    );

    const tasa     = TASAS[moneda] || 1;
    const totalMon = (totalUSD * tasa).toFixed(2);

    // Guardar pedido en BD
    const pedidoRes = await db.query(`
      INSERT INTO pedidos(usuario_id, monto_usd, moneda_pago, monto_moneda, estado)
      VALUES($1,$2,$3,$4,'pendiente') RETURNING id
    `, [req.userId, totalUSD.toFixed(2), moneda, totalMon]);

    const pedidoId = pedidoRes.rows[0].id;

    // Guardar items del pedido
    for (const item of carrito.rows) {
      await db.query(`
        INSERT INTO pedido_items(pedido_id, producto_id, nombre, precio_usd, cantidad)
        VALUES($1,$2,$3,$4,$5)
      `, [pedidoId, item.producto_id, item.nombre, item.precio_usd, item.cantidad]);
    }

    // ── INTENTO CON MERCADOPAGO API ──
    const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const BACKEND  = process.env.BACKEND_URL || 'http://localhost:3001';
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

    let linkPago = `https://link.mercadopago.com.co/inversionespaloverde`;
    let preferenceId = null;

    if (MP_TOKEN && MP_TOKEN !== 'AQUI_VA_TU_ACCESS_TOKEN') {
      try {
        const { MercadoPagoConfig, Preference } = require('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
        const preference = new Preference(client);

        const items = carrito.rows.map(item => ({
          id: String(item.producto_id),
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: parseFloat((parseFloat(item.precio_usd) * tasa).toFixed(2)),
          currency_id: moneda === 'PAB' ? 'USD' : moneda
        }));

        const pref = await preference.create({
          body: {
            items,
            back_urls: {
              success: `${BACKEND}/api/pagos/webhook-success?pedido_id=${pedidoId}`,
              failure: `${FRONTEND}?pago=fallido`,
              pending: `${FRONTEND}?pago=pendiente`
            },
            auto_return: 'approved',
            notification_url: `${BACKEND}/api/pagos/webhook`,
            metadata: { pedido_id: pedidoId, usuario_id: req.userId }
          }
        });

        preferenceId = pref.id;
        linkPago     = pref.init_point;

        await db.query('UPDATE pedidos SET mp_preference_id=$1 WHERE id=$2', [preferenceId, pedidoId]);
      } catch (mpErr) {
        console.error('MercadoPago API error, usando link fijo:', mpErr.message);
        // fallback al link fijo
      }
    }

    res.json({
      ok: true,
      pedido_id: pedidoId,
      total_usd: totalUSD.toFixed(2),
      moneda,
      total_moneda: totalMon,
      simbolo: SIMBOLOS[moneda] || moneda,
      link_pago: linkPago,
      preference_id: preferenceId,
      modo: preferenceId ? 'mercadopago_api' : 'link_fijo'
    });

  } catch (e) {
    console.error('crear pedido error:', e);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
});

/* ── WEBHOOK DE MERCADOPAGO (notificación de pago) ── */
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responder rápido a MP
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!MP_TOKEN || MP_TOKEN === 'AQUI_VA_TU_ACCESS_TOKEN') return;

    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const client  = new MercadoPagoConfig({ accessToken: MP_TOKEN });
    const payment = new Payment(client);
    const pago    = await payment.get({ id: data.id });

    if (pago.status !== 'approved') return;

    const pedidoId = pago.metadata?.pedido_id;
    if (!pedidoId) return;

    await marcarPagado(pedidoId, String(data.id));
  } catch (e) {
    console.error('webhook error:', e);
  }
});

/* ── WEBHOOK SUCCESS REDIRECT (back_url de MP) ── */
router.get('/webhook-success', async (req, res) => {
  try {
    const { pedido_id, payment_id, status } = req.query;

    if (status === 'approved' && pedido_id) {
      await marcarPagado(pedido_id, payment_id);
      const url = await buildWhatsAppUrl(pedido_id);
      return res.redirect(url);
    }

    // Si no approved, redirigir al frontend con estado
    const FRONTEND = process.env.FRONTEND_URL || '/';
    res.redirect(`${FRONTEND}?pago=${status || 'desconocido'}`);
  } catch (e) {
    console.error('webhook-success error:', e);
    res.redirect('/');
  }
});

/* ── CONFIRMAR PAGO MANUAL (para link fijo sin webhook) ──
   El frontend llama a este endpoint cuando detecta ?pago=aprobado en la URL */
router.post('/confirmar-manual', auth, async (req, res) => {
  try {
    const { pedido_id } = req.body;
    if (!pedido_id) return res.status(400).json({ error: 'pedido_id requerido' });

    // Verificar que el pedido es de este usuario
    const ped = await db.query(
      'SELECT * FROM pedidos WHERE id=$1 AND usuario_id=$2',
      [pedido_id, req.userId]
    );
    if (!ped.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });

    await marcarPagado(pedido_id, 'manual');
    const url = await buildWhatsAppUrl(pedido_id);
    res.json({ ok: true, whatsapp_url: url });
  } catch (e) {
    console.error('confirmar manual error:', e);
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
});

/* ── HISTORIAL DE PEDIDOS ── */
router.get('/mis-pedidos', auth, async (req, res) => {
  try {
    const pedidos = await db.query(`
      SELECT p.*, 
             json_agg(json_build_object(
               'nombre', pi.nombre, 'cantidad', pi.cantidad, 'precio_usd', pi.precio_usd
             )) AS items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
      WHERE p.usuario_id = $1
      GROUP BY p.id
      ORDER BY p.creado_en DESC
    `, [req.userId]);
    res.json({ pedidos: pedidos.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

/* ════ HELPERS ════ */

async function marcarPagado(pedidoId, paymentId) {
  const ya = await db.query('SELECT estado FROM pedidos WHERE id=$1', [pedidoId]);
  if (!ya.rows.length || ya.rows[0].estado === 'pagado') return;

  await db.query(`
    UPDATE pedidos SET estado='pagado', mp_payment_id=$1, pagado_en=NOW()
    WHERE id=$2
  `, [paymentId, pedidoId]);

  // Vaciar carrito del usuario
  const ped = await db.query('SELECT usuario_id FROM pedidos WHERE id=$1', [pedidoId]);
  if (ped.rows.length) {
    await db.query('DELETE FROM carrito_items WHERE usuario_id=$1', [ped.rows[0].usuario_id]);
  }
}

async function buildWhatsAppUrl(pedidoId) {
  const WA = process.env.WHATSAPP_NUMBER || '573183177682';

  const ped = await db.query(`
    SELECT p.*, u.nombre, u.correo,
           json_agg(json_build_object(
             'nombre',pi.nombre,'cantidad',pi.cantidad,'precio_usd',pi.precio_usd
           )) AS items
    FROM pedidos p
    JOIN usuarios u ON u.id=p.usuario_id
    LEFT JOIN pedido_items pi ON pi.pedido_id=p.id
    WHERE p.id=$1 GROUP BY p.id, u.nombre, u.correo
  `, [pedidoId]);

  if (!ped.rows.length) return `https://wa.me/${WA}`;

  const d      = ped.rows[0];
  const items  = (d.items || []).filter(i => i.nombre);
  const lista  = items.map(i => `• ${i.nombre} x${i.cantidad} — $${parseFloat(i.precio_usd).toFixed(2)} USD`).join('\n');
  const simb   = { USD:'$',COP:'$',EUR:'€',BRL:'R$',MXN:'$',PEN:'S/',CLP:'$',ARS:'$',PAB:'B/.',CRC:'₡',GTQ:'Q',HNL:'L',BOB:'Bs.',DOP:'RD$' };
  const s      = simb[d.moneda_pago] || d.moneda_pago;

  const msg =
`¡Hola William! 👋 Acabo de realizar un pago en Palo Verde Esmeralda ✅

👤 Cliente: ${d.nombre || d.correo}
📧 Correo: ${d.correo}
🛒 Pedido #${d.id}

🪙 Productos:
${lista}

💵 Total USD: $${parseFloat(d.monto_usd).toFixed(2)}
💳 Pagado en ${d.moneda_pago}: ${s}${parseFloat(d.monto_moneda).toFixed(2)}
📅 Fecha: ${new Date(d.pagado_en||Date.now()).toLocaleString('es-CO',{timeZone:'America/Bogota'})}

¡Quedo atento a la confirmación de mi pedido! 💚`;

  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}

module.exports = router;
