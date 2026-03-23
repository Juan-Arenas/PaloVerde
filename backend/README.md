# 🌿 PALO VERDE ESMERALDA — Guía de Despliegue
## Render.com (backend + BD) + Netlify (frontend)
### Todo 100% GRATIS — Sin tarjeta de crédito

---

## ¿Qué vamos a crear?

```
┌─────────────────────────────────────────────────┐
│  NETLIFY (gratis)          RENDER.COM (gratis)  │
│  ─────────────────         ──────────────────── │
│  frontend/index.html  ←→  backend/server.js     │
│  Paloverde.jpeg            routes/auth.js       │
│  William.png               routes/carrito.js    │
│  Intro.mp4                 routes/pagos.js      │
│                            ↕                    │
│                        PostgreSQL (Render)      │
│                        Base de datos gratis     │
└─────────────────────────────────────────────────┘
```

---

## PARTE 1 — GITHUB (necesario para Render)

> Render necesita que el código esté en GitHub.
> Crea cuenta en github.com si no tienes (gratis).

### Paso 1.1 — Crear repositorio

1. Ve a **https://github.com** → clic **"+"** → **"New repository"**
2. Nombre: `paloverde-backend`
3. Selecciona **"Private"**
4. Clic en **"Create repository"**

### Paso 1.2 — Subir archivos del backend

1. En el repositorio creado, clic en **"uploading an existing file"**
2. Arrastra TODOS los archivos de la carpeta `backend/`:
   - `server.js`, `db.js`, `package.json`, `render.yaml`, `schema.sql`
   - Carpeta `routes/` (con sus 4 archivos .js)
   - Carpeta `middleware/` (con auth.js)
3. Clic en **"Commit changes"** ✅

---

## PARTE 2 — RENDER.COM (backend + base de datos)

### Paso 2.1 — Crear cuenta

1. Ve a **https://render.com**
2. Clic **"Get Started for Free"**
3. Regístrate con **GitHub** (la opción más fácil)

### Paso 2.2 — Crear la base de datos PostgreSQL

1. Panel de Render → **"New +"** → **"PostgreSQL"**
2. Rellena:
   - **Name:** `paloverde-db`
   - **Database:** `paloverde`
   - **User:** `paloverde_user`
   - **Region:** `Oregon (US West)`
   - **Plan:** **Free** ⬅️ muy importante
3. Clic **"Create Database"** — espera ~2 minutos
4. Una vez creada, ábrela y copia el valor de **"Internal Database URL"**
   - Ejemplo: `postgresql://paloverde_user:abc@dpg-xxx.oregon-postgres.render.com/paloverde`
   - **Guárdala**, la usas en el siguiente paso

### Paso 2.3 — Crear el servicio Web (Node.js)

1. **"New +"** → **"Web Service"**
2. **"Connect a repository"** → selecciona `paloverde-backend`
3. Rellena:
   - **Name:** `paloverde-backend`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** **Free** ⬅️
4. Baja a **"Environment Variables"** y añade estas:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *la URL copiada en el paso 2.2* |
| `JWT_SECRET` | `paloverde_muzo_esmeralda_2026_secreto` |
| `MERCADOPAGO_ACCESS_TOKEN` | `AQUI_VA_TU_TOKEN` |
| `WHATSAPP_NUMBER` | `573183177682` |
| `FRONTEND_URL` | `https://paloverde-esmeralda.netlify.app` |
| `BACKEND_URL` | `https://paloverde-backend.onrender.com` |
| `NODE_ENV` | `production` |

5. Clic **"Create Web Service"**
6. Espera ~4 minutos hasta que diga **"Live"** en verde
7. Copia tu URL: `https://paloverde-backend.onrender.com`

### Paso 2.4 — Verificar que funciona

Abre en el navegador:
```
https://paloverde-backend.onrender.com/health
```
Debe responder:
```json
{ "ok": true, "service": "Palo Verde API" }
```
✅ ¡Backend funcionando!

---

## PARTE 3 — NETLIFY (frontend)

### Paso 3.1 — Preparar la carpeta frontend

Asegúrate de tener estos 4 archivos juntos:
```
frontend/
├── index.html
├── Paloverde.jpeg
├── William.png
└── Intro.mp4
```

### Paso 3.2 — Conectar al backend

Abre `index.html` con Bloc de notas o cualquier editor.

Busca esta línea:
```javascript
const API = window.PV_API || 'https://TU-BACKEND.railway.app';
```

Cámbiala por:
```javascript
const API = window.PV_API || 'https://paloverde-backend.onrender.com';
```

Guarda el archivo.

### Paso 3.3 — Subir a Netlify

1. Ve a **https://netlify.com**
2. Clic **"Sign up"** → regístrate con Google o GitHub
3. En el panel verás esta zona:
   > *"Drag and drop your site folder here"*
4. **Arrastra la carpeta `frontend/` completa** a esa zona
5. En ~30 segundos tienes tu web en línea con una URL como:
   `https://magical-emerald-abc123.netlify.app`

### Paso 3.4 — Ponerle un nombre mejor (opcional)

1. Netlify → tu sitio → **"Site configuration"** → **"Change site name"**
2. Escribe: `paloverde-esmeralda`
3. Tu URL queda: `https://paloverde-esmeralda.netlify.app` ✅

---

## PARTE 4 — ACCESS TOKEN DE MERCADO PAGO

> Esto activa el pago 100% automático. Sin esto funciona igual pero el cliente debe hacer clic en "Ya pagué".

### Paso 4.1 — Obtener el token

1. Ve a **https://www.mercadopago.com.co**
2. Inicia sesión → **Tu cuenta → Desarrolladores**
   - O directo: `https://www.mercadopago.com.co/developers/panel`
3. **"Mis credenciales"** → **"Credenciales de producción"**
4. Copia el **"Access Token"** (empieza con `APP_USR-...`)

### Paso 4.2 — Pegarlo en Render

1. Render → `paloverde-backend` → **"Environment"**
2. Busca `MERCADOPAGO_ACCESS_TOKEN`
3. Reemplaza `AQUI_VA_TU_TOKEN` con tu token real
4. **"Save Changes"** → Render redespliega solo

### Paso 4.3 — Configurar Webhook en Mercado Pago

1. Mercado Pago → Desarrolladores → **"Webhooks"**
2. **"Agregar webhook"**:
   - URL: `https://paloverde-backend.onrender.com/api/pagos/webhook`
   - Eventos: ✅ **payment**
3. Guardar ✅

---

## PARTE 5 — MANTENER RENDER DESPIERTO (importante)

> El plan gratis de Render duerme el servidor si no hay visitas en 15 min.
> La primera visita tarda ~40 segundos. Con UptimeRobot lo evitas gratis.

1. Ve a **https://uptimerobot.com** → crea cuenta gratis
2. **"Add New Monitor"**:
   - Type: `HTTP(s)`
   - Friendly Name: `Palo Verde API`
   - URL: `https://paloverde-backend.onrender.com/health`
   - Monitoring Interval: `Every 14 minutes`
3. **"Create Monitor"** ✅

El servidor nunca dormirá.

---

## FLUJO COMPLETO DE COMPRA

```
Cliente entra a paloverde-esmeralda.netlify.app
     ↓
Ve el catálogo → "Añadir al carrito"
     ↓
¿No está registrado? → Modal de registro (correo + contraseña)
     ↓
Producto guardado en carrito (base de datos Render)
     ↓
Clic en "Carrito" → ve sus productos y total
     ↓
"Proceder al pago" → elige moneda (COP, USD, EUR...)
     ↓
Ve el total convertido → "Pagar con tarjeta"
     ↓
Mercado Pago se abre → paga con tarjeta débito/crédito
     ↓
Webhook notifica al backend → pedido marcado como pagado
     ↓
WhatsApp se abre automáticamente con el mensaje:

  "¡Hola William! Acabo de pagar en Palo Verde 💚
   Cliente: Juan Pérez | juan@gmail.com
   Pedido #42
   • Esmeralda Muzo x1 — $2.850 USD
   Total COP: $11.827.500
   Fecha: 23/3/2026..."

El cliente solo toca ENVIAR → William recibe el pedido ✅
```

---

## RESUMEN DE URLS

| Servicio | URL |
|----------|-----|
| **Tu web** | `https://paloverde-esmeralda.netlify.app` |
| **Backend** | `https://paloverde-backend.onrender.com` |
| **Health check** | `https://paloverde-backend.onrender.com/health` |

---

## MONEDAS DISPONIBLES

USD · COP · EUR · BRL · MXN · PEN · CLP · ARS · PAB · CRC · GTQ · HNL · BOB · DOP

---

## SOPORTE

- 📱 WhatsApp: **+57 318 3177682**
- 🎵 TikTok: **@paloverde_esmeral**
