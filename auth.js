const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'paloverde_secret';

/* ── REGISTRO ── */
router.post('/register', async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;
    if (!correo || !password)
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

    const existe = await db.query('SELECT id FROM usuarios WHERE correo=$1', [correo]);
    if (existe.rows.length)
      return res.status(409).json({ error: 'Este correo ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO usuarios(nombre,correo,password) VALUES($1,$2,$3) RETURNING id,nombre,correo',
      [nombre || '', correo.toLowerCase().trim(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ ok: true, token, user: { id: user.id, nombre: user.nombre, correo: user.correo } });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

/* ── LOGIN ── */
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password)
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

    const result = await db.query('SELECT * FROM usuarios WHERE correo=$1', [correo.toLowerCase().trim()]);
    if (!result.rows.length)
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const user = result.rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const token = jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, token, user: { id: user.id, nombre: user.nombre, correo: user.correo } });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/* ── PERFIL (verificar token) ── */
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const result = await db.query('SELECT id,nombre,correo FROM usuarios WHERE id=$1', [req.userId]);
  res.json({ user: result.rows[0] });
});

module.exports = router;
