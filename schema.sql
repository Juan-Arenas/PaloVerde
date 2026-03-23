-- ══════════════════════════════════════════════
-- PALO VERDE ESMERALDA — Esquema de base de datos
-- Ejecutar en Railway PostgreSQL
-- ══════════════════════════════════════════════

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(120),
  correo       VARCHAR(200) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  creado_en    TIMESTAMP DEFAULT NOW()
);

-- PRODUCTOS (catálogo)
CREATE TABLE IF NOT EXISTS productos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(200) NOT NULL,
  descripcion  TEXT,
  precio_usd   DECIMAL(10,2) NOT NULL,
  imagen_url   VARCHAR(500),
  material     VARCHAR(200),
  quilates     DECIMAL(5,2),
  categoria    VARCHAR(80),
  disponible   BOOLEAN DEFAULT TRUE,
  creado_en    TIMESTAMP DEFAULT NOW()
);

-- CARRITO
CREATE TABLE IF NOT EXISTS carrito_items (
  id           SERIAL PRIMARY KEY,
  usuario_id   INT REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id  INT REFERENCES productos(id) ON DELETE CASCADE,
  cantidad     INT DEFAULT 1,
  agregado_en  TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, producto_id)
);

-- PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INT REFERENCES usuarios(id),
  monto_usd          DECIMAL(10,2) NOT NULL,
  moneda_pago        VARCHAR(10) DEFAULT 'COP',
  monto_moneda       DECIMAL(14,2),
  mp_preference_id   VARCHAR(255),
  mp_payment_id      VARCHAR(255),
  estado             VARCHAR(40) DEFAULT 'pendiente',
  whatsapp_enviado   BOOLEAN DEFAULT FALSE,
  creado_en          TIMESTAMP DEFAULT NOW(),
  pagado_en          TIMESTAMP
);

-- PEDIDO ITEMS
CREATE TABLE IF NOT EXISTS pedido_items (
  id           SERIAL PRIMARY KEY,
  pedido_id    INT REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id  INT REFERENCES productos(id),
  nombre       VARCHAR(200),
  precio_usd   DECIMAL(10,2),
  cantidad     INT
);

-- PRODUCTOS INICIALES DEL CATÁLOGO
INSERT INTO productos (nombre, descripcion, precio_usd, imagen_url, material, quilates, categoria)
VALUES
  ('Esmeralda Muzo Hexagonal Bruta',
   'Esmeralda colombiana de las minas de Muzo, talla hexagonal natural con certificado GIA.',
   2850.00,
   'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&auto=format&fit=crop&q=85',
   'Oro 18k', 2.8, 'esmeraldas'),

  ('Anillo Selva Imperial',
   'Anillo en oro blanco 18k con esmeralda oval colombiana de Muzo. Pieza única.',
   3200.00,
   'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=85',
   'Oro blanco 18k', 1.5, 'anillos'),

  ('Collar Bosque Eterno',
   'Collar cadena en oro amarillo con colgante de esmeralda colombiana.',
   2100.00,
   'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=85',
   'Oro amarillo 18k', 1.2, 'collares'),

  ('Pulsera Raíces Doradas',
   'Pulsera artesanal en oro 18k con tres esmeraldas colombianas talla baguette.',
   1480.00,
   'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=85',
   'Oro 18k', 0.9, 'pulseras'),

  ('Arete Gota Muzo',
   'Aretes tipo gota en oro 18k con esmeralda colombiana talla lágrima.',
   1950.00,
   'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=500&auto=format&fit=crop&q=85',
   'Oro 18k', 1.1, 'aretes')
ON CONFLICT DO NOTHING;
