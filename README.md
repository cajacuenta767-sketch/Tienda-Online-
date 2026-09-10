# DevMarket

Marketplace en español para vender tus propios proyectos de software: sistemas web, plantillas y scripts con código fuente, demo en vivo, historial de actualizaciones, reseñas, favoritos, cupones y membresías. Inspirado en la estructura de tiendas como kosari.net, con diseño propio "Azul océano": modo claro por defecto y modo oscuro con un botón (la elección se recuerda en el navegador).

**Stack:** Node.js 18+ · Express 5 · SQLite (better-sqlite3) · EJS · CSS y JavaScript sin frameworks.

## Qué incluye

| Apartado | Ruta | Descripción |
|---|---|---|
| Inicio | `/` | Hero, destacados, categorías, nuevos lanzamientos, planes, ventajas, últimas actualizaciones |
| Tienda | `/tienda`, `/tienda/categoria/:slug`, `/etiqueta/:slug` | Grid con búsqueda instantánea (sugerencias al escribir), filtros por precio, tecnología, valoración y oferta, orden y paginación |
| Ficha de producto | `/producto/:slug` | Galería, precio y oferta, comprar / carrito / WhatsApp, botón de favorito, características, requisitos, changelog, reseñas con estrellas, licencia, relacionados |
| Favoritos | `/favoritos` | Lista de deseos; funciona sin cuenta (sesión) y se fusiona con la cuenta al iniciar sesión |
| Demo en vivo | `/demo/:slug` | Barra superior + iframe con la demo del producto |
| Nuevos lanzamientos | `/nuevos` | Productos recientes o marcados como nuevos |
| Actualizaciones | `/actualizaciones` | Historial de versiones de todos los productos |
| Membresía | `/membresia` | Planes Mensual / Anual / Vitalicia con comparativa y FAQ |
| Nosotros, Contacto, Términos | `/nosotros`, `/contacto`, `/terminos` | Páginas informativas y formulario de contacto |
| Cuenta | `/login`, `/registro`, `/cuenta` | Compras, descargas, membresía, cambio de contraseña |
| Carrito y pago | `/carrito`, `/pagar`, `/pedidos/:id` | Checkout con cupón de descuento y pago por WhatsApp, Stripe, PayPal, Bitcoin (Culqi preparado) |
| Panel de administración | `/admin` | Productos (imágenes + ZIP + changelog), categorías, planes, cupones, pedidos, moderación de reseñas, usuarios, ajustes, mensajes |

## Instalación

```bash
git clone <este-repositorio> devmarket
cd devmarket
npm install
cp .env.example .env      # edita al menos SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, WHATSAPP_NUMBER
npm run seed              # crea la base de datos con 8 productos de ejemplo, 3 planes y un cliente demo
npm start                 # http://localhost:3000
```

Cuentas creadas por el seed:

- Administrador: el `ADMIN_EMAIL` / `ADMIN_PASSWORD` de tu `.env` (se crea en el primer arranque si no existe ningún admin).
- Cliente demo: `demo@devmarket.local` / `demo12345`.
- Cupones de ejemplo: `BIENVENIDO10` (10 %), `DEV20` (20 % en productos desde $50), `MENOS15` ($15 desde $90).

Para desarrollo con recarga automática: `npm run dev`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor |
| `npm run dev` | Arranca con nodemon |
| `npm run migrate` | Aplica migraciones pendientes (`src/db/migrations/*.sql`) |
| `npm run seed` | Siembra datos de ejemplo; es idempotente, se puede repetir |
| `npm run seed:fresh` | Borra todo y vuelve a sembrar (en producción requiere `SEED_ALLOW_FRESH=true`) |
| `npm run create-admin -- correo clave` | Crea o promueve un administrador |
| `npm test` | Tests con `node --test` y supertest sobre una base en memoria |

## Configuración (`.env`)

| Variable | Descripción |
|---|---|
| `PORT`, `BASE_URL` | Puerto y URL pública absoluta (necesaria para Stripe y PayPal) |
| `SESSION_SECRET` | Cadena larga y aleatoria. En producción el servidor no arranca sin ella |
| `DB_PATH`, `STORAGE_DIR`, `UPLOADS_DIR` | Base SQLite, carpeta de ZIPs (nunca se sirve públicamente) y carpeta de capturas subidas |
| `MAX_ZIP_MB`, `MAX_IMAGE_MB` | Límites de subida (200 MB y 5 MB por defecto) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador inicial |
| `STORE_NAME`, `WHATSAPP_NUMBER`, `SUPPORT_EMAIL`, `BTC_ADDRESS`, `BTC_USD_RATE`, `BTC_RATE_AUTO` | Datos de la tienda. Se copian a la base en el primer arranque y luego se editan en `/admin/ajustes` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Claves de Stripe (vacías = método deshabilitado) |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | Claves de PayPal; `sandbox` o `live` |
| `CULQI_PUBLIC_KEY`, `CULQI_SECRET_KEY` | Reservadas para la integración de Culqi (Perú) |

## Cómo subir un proyecto para venderlo

1. Entra con la cuenta de administrador y ve a **Panel › Productos › Nuevo producto**.
2. Completa título, categoría, descripción corta y larga, características y requisitos (una línea por ítem), etiquetas separadas por coma, precio y precio de oferta opcional.
3. Sube hasta 10 capturas (PNG, JPG, WEBP o GIF) y el **ZIP** con el código. El ZIP se guarda en `STORAGE_DIR`, fuera de la carpeta pública, y solo se entrega a quien compró o tiene membresía activa.
4. Indica la URL de la demo para habilitar el botón **Ver demo en vivo**.
5. Marca **Activo**, y opcionalmente **Destacado** (aparece en inicio) y **Nuevo**.
6. Cada vez que publiques una versión nueva, registra la entrada en **Historial de versiones** desde la misma pantalla; aparecerá en `/actualizaciones` y en la ficha.

## Métodos de pago

Todos los proveedores viven en `src/payments/` y comparten la misma interfaz (`base.js`), de modo que añadir uno nuevo es crear un archivo y registrarlo en `index.js`.

- **WhatsApp**: enlace `wa.me` con el producto y el precio prellenados. Ideal para transferencias, Yape o Plin; el pedido se registra manualmente desde el admin si lo deseas.
- **Stripe Checkout**: redirección a Stripe; el pedido se marca pagado al volver y también por webhook (`POST /pago/stripe/webhook`). Sandbox: usa `sk_test_…`, ejecuta `stripe listen --forward-to localhost:3000/pago/stripe/webhook` y copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET`. Tarjeta de prueba `4242 4242 4242 4242`.
- **PayPal**: botones de PayPal en el checkout (REST v2 mediante `fetch`, sin SDK de servidor). Sandbox: crea una app en developer.paypal.com y usa `PAYPAL_ENV=sandbox`.
- **Bitcoin**: el checkout muestra dirección, monto exacto en BTC (tasa de `btc_usd_rate` o CoinGecko si `BTC_RATE_AUTO=true`) y un código QR. El cliente pulsa «Ya realicé el pago» y el administrador confirma en **Panel › Pedidos** tras verificar la transacción.
- **Culqi (Perú)**: incluido como proveedor "Próximamente". El archivo `src/payments/culqi.js` documenta el flujo a implementar (token de Culqi Checkout → `POST /v2/charges`).

Sin claves configuradas, WhatsApp y Bitcoin funcionan y Stripe/PayPal aparecen como "No configurado".

## Reseñas, favoritos y cupones

- **Reseñas**: solo quienes compraron el producto (o tienen membresía activa) pueden opinar. Quedan pendientes hasta que las apruebes en **Panel › Reseñas**; el promedio con estrellas aparece en la ficha y en las tarjetas, y las últimas aprobadas se muestran en el inicio.
- **Favoritos**: el corazón de cada tarjeta guarda el producto sin recargar la página. Los visitantes sin cuenta los conservan en su sesión y se fusionan con su cuenta al registrarse o iniciar sesión.
- **Cupones**: se crean en **Panel › Cupones** con porcentaje o monto fijo, compra mínima, usos máximos, vencimiento y alcance (todo, solo productos o solo membresías). El cliente lo escribe en el checkout y el descuento queda registrado en el pedido.

## Membresías

Los planes se administran en **Panel › Planes**. Al pagarse un plan se crea una membresía con fecha de fin (o sin ella si es vitalicia). Mientras esté activa, `/cuenta › Descargas` muestra todo el catálogo y `/descargar/:id` entrega cualquier producto.

## Estructura

```
src/
  app.js            Fábrica de la app Express (middlewares, sesión, rutas, errores)
  server.js         Punto de entrada
  config.js         Lectura de .env
  db/               Conexión SQLite, migraciones SQL y almacén de sesiones
  models/           Consultas por tabla (products, orders, memberships, settings…)
  services/         Lógica de negocio: pedidos, acceso a descargas, carrito, subidas
  payments/         Proveedores: whatsapp, stripe, paypal, btc, culqi
  middleware/       auth, csrf, flash, locals, security, errors
  controllers/      Público, cuenta, checkout y admin/
  routes/           Mapa de rutas
views/              Plantillas EJS (partials, pages, auth, account, cart, checkout, admin, errors)
public/             css/app.css, js/app.js, js/checkout.js, img/
scripts/            seed.js, migrate.js, create-admin.js, lib/ (generador de SVG y ZIP)
tests/              smoke, auth, pagos, subidas y funciones (favoritos, reseñas, cupones, búsqueda)
```

## Despliegue

- **Render / Railway**: define las variables del `.env`, `NODE_ENV=production`, y monta un disco persistente para `DB_PATH`, `STORAGE_DIR` y `UPLOADS_DIR` (por ejemplo `/var/data/devmarket.sqlite`, `/var/data/products`, `/var/data/uploads`). Ejecuta `npm run seed` una sola vez si quieres los datos de ejemplo.
- **VPS**: `npm ci --omit=dev`, un proceso con PM2 (`pm2 start src/server.js --name devmarket`) y Nginx como proxy inverso con `client_max_body_size 250m` para permitir ZIPs grandes. Activa HTTPS: las cookies de sesión son `secure` en producción.
- `better-sqlite3` trae binarios para Node 18, 20 y 22. En otras versiones compila desde código fuente (necesita `python3`, `make` y `g++`).

## Seguridad

Contraseñas con bcrypt, sesiones en SQLite con cookie `httpOnly` + `SameSite=Lax`, token CSRF en todos los formularios, límite de intentos de inicio de sesión, archivos de producto fuera de la carpeta pública con nombres aleatorios, subida de imágenes restringida a formatos raster (sin SVG) y verificación de propiedad en cada descarga.

## Roadmap

- Integración de Culqi (tarjetas, Yape y PagoEfectivo en soles).
- Comparador de productos y notificaciones por correo de nuevas versiones.
- Correos transaccionales (confirmación de compra, aviso de vencimiento de membresía).
- Cupones de descuento y reseñas de clientes.

## Licencia

Código de la tienda: úsalo libremente para tu propio negocio. Los productos que vendas llevan la licencia que definas en cada ficha.
