# DevMarket

Marketplace en español para vender tus propios proyectos de software: sistemas web, plantillas y scripts con código fuente, demo en vivo, historial de actualizaciones, reseñas, favoritos, cupones y membresías. Inspirado en la estructura de tiendas como kosari.net, con diseño propio "Azul océano": modo claro por defecto y modo oscuro con un botón (la elección se recuerda en el navegador).

**Stack:** Node.js 18+ · Express 5 · SQLite (better-sqlite3) · EJS · CSS y JavaScript sin frameworks · nodemailer · sharp (opcional).

## Qué incluye

| Apartado | Ruta | Descripción |
|---|---|---|
| Inicio | `/` | Hero, destacados, categorías, nuevos lanzamientos, planes, ventajas, últimas actualizaciones |
| Tienda | `/tienda`, `/tienda/categoria/:slug`, `/etiqueta/:slug` | Grid con búsqueda instantánea (sugerencias al escribir), filtros por precio, tecnología, valoración y oferta, orden y paginación |
| Ficha de producto | `/producto/:slug` | Galería, precio y oferta, comprar / carrito / WhatsApp, botón de favorito, características, requisitos, changelog, reseñas con estrellas, licencia, relacionados |
| Favoritos | `/favoritos` | Lista de deseos; funciona sin cuenta (sesión) y se fusiona con la cuenta al iniciar sesión |
| Paquetes | `/paquetes`, `/paquetes/:slug` | Varios productos con descuento; cada uno se entrega con su licencia |
| Comparador | `/comparar?p=a,b,c` | Hasta tres productos lado a lado (botón ⇄ en cada tarjeta) |
| Blog | `/blog`, `/blog/:slug` | Guías y tutoriales (SEO) gestionados desde el panel |
| SEO | `/sitemap.xml`, `/robots.txt` | Más JSON-LD de producto, Open Graph, canonical y hreflang en cada página |
| Idioma | `?lang=en` | Interfaz en español o inglés (se recuerda en cookie y en la cuenta); campos en inglés opcionales por producto |
| Demo en vivo | `/demo/:slug` | Barra superior + iframe con la demo del producto |
| Nuevos lanzamientos | `/nuevos` | Productos recientes o marcados como nuevos |
| Actualizaciones | `/actualizaciones` | Historial de versiones de todos los productos |
| Membresía | `/membresia` | Planes Mensual / Anual / Vitalicia con comparativa y FAQ |
| Nosotros, Contacto, Términos | `/nosotros`, `/contacto`, `/terminos` | Páginas informativas y formulario de contacto |
| Cuenta | `/login`, `/registro`, `/recuperar`, `/cuenta`, `/cuenta/tickets` | Compras, descargas con enlace temporal firmado, membresía, claves de licencia, tickets de soporte, perfil, verificación de correo y recuperación de contraseña |
| Carrito y pago | `/carrito`, `/pagar`, `/pedidos/:id` | Checkout con cupón de descuento y pago por WhatsApp, Stripe, PayPal, Bitcoin (Culqi preparado) |
| Panel de administración | `/admin` | Productos (arrastrar y soltar imágenes, WebP automático, vídeo, FAQ, contenido del ZIP, versión en inglés, papelera), categorías, planes, paquetes, cupones, pedidos, licencias, métricas con gráficos, clientes (dar acceso, reenviar, bloquear), tickets, reseñas, blog, correos enviados, ajustes, mensajes |

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
| `npm run jobs` | Tareas programadas: vence membresías, avisa 3 días antes del vencimiento, recuerda carritos abandonados (24 h), reintenta correos. Ejecútalo cada hora con cron |
| `npm run backup` | Copia la base de datos (API de backup de SQLite), los ZIPs y las capturas a `BACKUP_DIR`, conservando las últimas `BACKUP_KEEP` |

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
| `CULQI_PUBLIC_KEY`, `CULQI_SECRET_KEY` | Claves de Culqi (Perú). Con ambas, el checkout muestra "Pagar en soles" con Culqi Checkout (tarjeta, Yape, billeteras, agentes) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM` | Correo saliente. Sin SMTP, todos los correos quedan en **Panel › Correos** (bandeja interna) para que puedas verlos |
| `REQUIRE_EMAIL_VERIFICATION` | Si es `true`, hay que verificar el correo antes de comprar |
| `DOWNLOAD_LINK_TTL_MIN` | Minutos de validez de cada enlace de descarga firmado (15 por defecto) |
| `BACKUP_DIR`, `BACKUP_KEEP` | Carpeta y número de copias de seguridad a conservar |
| `DEFAULT_LOCALE` | Idioma por defecto: `es` o `en` |

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

## Correos automáticos

Se envían solos: pedido recibido (pagos manuales), pago confirmado con enlaces de descarga y claves de licencia, nueva versión de un producto comprado, membresía por vencer, carrito abandonado con cupón, restablecer contraseña, verificar correo, respuesta a un ticket, producto asignado por el administrador, y avisos internos al correo de soporte. Sin SMTP quedan en **Panel › Correos**; con SMTP salen al momento y los fallidos se reintentan con `npm run jobs`.

## Licencias

Cada producto comprado genera una clave `DM-XXXX-XXXX-XXXX-XXXX`. El cliente la ve en **Mi cuenta › Licencias** y tus sistemas pueden validarla:

```
POST https://tu-tienda.com/api/licencias/validar
{ "key": "DM-…", "product": "slug-del-producto", "domain": "cliente.com" }
→ { "valid": true, "product": "…", "version": "3.2.0", "activations": 1, "max": 1 }
```

Cada dominio distinto consume una activación (1 por defecto, editable en **Panel › Licencias**), donde también puedes revocar o reiniciar claves.

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

- **Docker**: `docker compose up -d` construye la imagen y guarda datos en el volumen `devmarket-data`. El `Dockerfile` ya apunta la base, los ZIPs, las capturas y las copias a `/data`.
- **Render**: el archivo `render.yaml` crea el servicio web con disco persistente en `/var/data`; solo debes rellenar las variables marcadas.
- **Railway**: `railway.json` define arranque y healthcheck; añade un volumen y las variables del `.env`.

- **Render / Railway**: define las variables del `.env`, `NODE_ENV=production`, y monta un disco persistente para `DB_PATH`, `STORAGE_DIR` y `UPLOADS_DIR` (por ejemplo `/var/data/devmarket.sqlite`, `/var/data/products`, `/var/data/uploads`). Ejecuta `npm run seed` una sola vez si quieres los datos de ejemplo.
- **VPS**: `npm ci --omit=dev`, un proceso con PM2 (`pm2 start src/server.js --name devmarket`) y Nginx como proxy inverso con `client_max_body_size 250m` para permitir ZIPs grandes. Activa HTTPS: las cookies de sesión son `secure` en producción.
- `better-sqlite3` trae binarios para Node 18, 20 y 22. En otras versiones compila desde código fuente (necesita `python3`, `make` y `g++`).

## Seguridad

Contraseñas con bcrypt, sesiones en SQLite con cookie `httpOnly` + `SameSite=Lax`, token CSRF en todos los formularios, límite de intentos de inicio de sesión, archivos de producto fuera de la carpeta pública con nombres aleatorios, subida de imágenes restringida a formatos raster (sin SVG) y verificación de propiedad en cada descarga.

## Qué debes configurar tú

1. **SMTP** para que los correos salgan (Gmail con contraseña de aplicación, Brevo, Mailgun, Resend…).
2. **Claves de Stripe, PayPal y Culqi** según los métodos que quieras cobrar.
3. **`BASE_URL`** con tu dominio real (los enlaces de correos y de pago dependen de él).
4. Un cron cada hora con `npm run jobs` y uno diario con `npm run backup`.

## Roadmap

- PostgreSQL como alternativa a SQLite para varias instancias.
- Cupones automáticos por cumpleaños y programa de afiliados.
- Correos transaccionales (confirmación de compra, aviso de vencimiento de membresía).
- Cupones de descuento y reseñas de clientes.

## Licencia

Código de la tienda: úsalo libremente para tu propio negocio. Los productos que vendas llevan la licencia que definas en cada ficha.
