const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'paloverde_secret';

module.exports = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token  = header.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userCorreo = decoded.correo;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
