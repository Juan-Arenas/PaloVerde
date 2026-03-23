require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    /\.netlify\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'Palo Verde Esmeralda API', ts: new Date() });
});

// RUTAS
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/carrito',   require('./routes/carrito'));
app.use('/api/pagos',     require('./routes/pagos'));

// INICIAR
async function init() {
  try {
    await db.query('SELECT 1');
    console.log('✅ PostgreSQL conectado');

    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120),
        correo VARCHAR(200) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        precio_usd DECIMAL(10,2) NOT NULL,
        imagen_url VARCHAR(500),
        material VARCHAR(200),
        quilates DECIMAL(5,2),
        categoria VARCHAR(80),
        disponible BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS carrito_items (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
        cantidad INT DEFAULT 1,
        agregado_en TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, producto_id)
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id),
        monto_usd DECIMAL(10,2) NOT NULL,
        moneda_pago VARCHAR(10) DEFAULT 'COP',
        monto_moneda DECIMAL(14,2),
        mp_preference_id VARCHAR(255),
        mp_payment_id VARCHAR(255),
        estado VARCHAR(40) DEFAULT 'pendiente',
        whatsapp_enviado BOOLEAN DEFAULT FALSE,
        creado_en TIMESTAMP DEFAULT NOW(),
        pagado_en TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pedido_items (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id),
        nombre VARCHAR(200),
        precio_usd DECIMAL(10,2),
        cantidad INT
      );
    `);
    console.log('✅ Tablas listas');

    const count = await db.query('SELECT COUNT(*) FROM productos');
    if (parseInt(count.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO productos (nombre, descripcion, precio_usd, imagen_url, material, quilates, categoria) VALUES
        ('Esmeralda Muzo Hexagonal', 'Esmeralda colombiana certificada, talla hexagonal natural.', 2850, 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&auto=format&fit=crop&q=85', 'Oro 18k', 2.8, 'esmeraldas'),
        ('Anillo Selva Imperial', 'Anillo oro blanco 18k con esmeralda oval colombiana.', 3200, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=85', 'Oro blanco 18k', 1.5, 'anillos'),
        ('Collar Bosque Eterno', 'Collar cadena oro amarillo con colgante esmeralda.', 2100, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=85', 'Oro amarillo 18k', 1.2, 'collares'),
        ('Pulsera Raices Doradas', 'Pulsera oro 18k con tres esmeraldas baguette.', 1480, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=85', 'Oro 18k', 0.9, 'pulseras'),
        ('Arete Gota Muzo', 'Aretes oro 18k con esmeralda lagrima.', 1950, 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=500&auto=format&fit=crop&q=85', 'Oro 18k', 1.1, 'aretes')
      `);
      console.log('✅ Productos iniciales insertados');
    }

    app.listen(PORT, () => console.log(`🚀 Palo Verde API corriendo en puerto ${PORT}`));
  } catch (e) {
    console.error('❌ Error iniciando servidor:', e);
    process.exit(1);
  }
}

init();
