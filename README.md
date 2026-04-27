# Conoce tu Muni — Sistema de Solicitud de Recorrido

Aplicación full stack para gestionar solicitudes de recorridos turísticos y educativos de la Municipalidad de Guatemala.

**Stack:**
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Multer
- **Base de datos:** Google Sheets (vía Service Account)
- **Almacenamiento de archivos:** Google Drive (vía Apps Script puente)
- **Correos:** Apps Script + MailApp
- **Despliegue:** Vercel (frontend) + Render (backend)

---

## 📁 Estructura

```
conoce-tu-muni-form/
├── apps-script/         # Código que va en script.google.com
├── backend/             # API Express
└── frontend/            # App React
```

---

## 🧩 1. Configurar servicios de Google

### 1.1 Google Sheets

1. Crea una hoja en [sheets.google.com](https://sheets.google.com): **"Conoce tu Muni - Solicitudes"**
2. Renombra la pestaña a **`Solicitudes`**
3. En la fila 1 pega los encabezados (separados por tabs):
   ```
   Timestamp	Solicitante Nombre	Solicitante DPI	Solicitante Teléfono	Categoría	Modalidad	Tipo Recorrido	Universidad	Facultad	Establecimiento	Rango Edades	Cantidad Estudiantes	Fecha	Hora Llegada	Tiempo Estimado	DPI Verificado	SIRE Adjunto	Comentarios	Responsable Nombre	Responsable DPI	Responsable Teléfono	Responsable Correo	Archivo DPIs	Carta Facultad	Archivo SIRE
   ```
4. Copia el **ID** de la URL (`docs.google.com/spreadsheets/d/`**ESTO_ES_EL_ID**`/edit`)

### 1.2 Google Cloud (Service Account para Sheets)

1. [console.cloud.google.com](https://console.cloud.google.com) → Nuevo proyecto: `conoce-tu-muni`
2. Habilita **Google Sheets API**
3. **IAM y administración → Cuentas de servicio → Crear**
4. Nombre: `conoce-tu-muni-bot`, rol: **Editor**
5. En la cuenta creada → pestaña **Claves → Agregar clave → Crear nueva clave → JSON**
6. Renombra el archivo descargado a `google-credentials.json` y muévelo a `backend/`
7. Comparte tu Google Sheet con el `client_email` del JSON como **Editor**

### 1.3 Google Drive (carpeta destino)

1. Ve a [drive.google.com](https://drive.google.com) (con tu cuenta personal con cuota)
2. Crea carpeta: **"Conoce tu Muni - Archivos"**
3. Copia el ID de la URL
4. Compártela con el mismo `client_email` del service account como Editor (opcional, el Apps Script ya tiene acceso por ser tu cuenta)

### 1.4 Google Apps Script (puente para Drive y correos)

> **¿Por qué Apps Script?** Los service accounts de Google Cloud NO tienen cuota de Drive. Usamos un Apps Script bajo tu cuenta personal (15 GB gratis) como puente para subir archivos y enviar correos.

1. Ve a [script.google.com](https://script.google.com) con tu **cuenta personal** (la que tiene los 15 GB)
2. Nuevo proyecto → nombre: `ConoceMuni - Upload Bridge`
3. Borra todo y pega el contenido de `apps-script/Code.gs`
4. Genera un token aleatorio en terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
5. Reemplaza `PEGA_AQUI_TU_TOKEN` en el script por ese valor (lo necesitarás también en `.env`)
6. Guarda con Ctrl+S
7. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - **Ejecutar como:** `Yo (tu-email@gmail.com)` ← **CRÍTICO**
   - **Quién tiene acceso:** `Cualquier usuario`
8. Autoriza permisos (Drive y Gmail)
9. Copia la **URL del Web App** (la usarás como `APPS_SCRIPT_URL`)

---

## 🛠️ 2. Backend — Ejecución local

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus IDs y URLs
npm run dev
```

El servidor arranca en `http://localhost:4000`. Endpoint de salud: `/api/health`.

### Variables de entorno (`backend/.env`)

```env
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173,https://tu-app.vercel.app

GOOGLE_SHEET_ID=...
GOOGLE_SHEET_RANGE=Solicitudes!A:Z

GOOGLE_DRIVE_FOLDER_ID=...
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
APPS_SCRIPT_SECRET=tu_token_largo_aleatorio

# Opcional: copia de cada correo a la Muni
MUNI_EMAIL_CC=
```

### Pruebas opcionales

```bash
# Probar Drive
node test-drive.js

# Probar correo (edita el archivo primero con tu correo)
node test-email.js
```

---

## 🎨 3. Frontend — Ejecución local

### 3.1 Imágenes

Antes de arrancar, agrega tus imágenes en `frontend/src/assets/`:
- `logo.png` — Logo del header
- `footer.png` — Imagen del footer (panorámica recomendada)

Si tus archivos tienen otros nombres, ajusta los imports en `Header.jsx` y `Footer.jsx`.

### 3.2 Arrancar

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`.

### Variables (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
```

---

## 🚀 4. Despliegue en producción

### 4.1 Subir a GitHub

```bash
git init
git branch -M main
git add .
git status   # verificar que .env y google-credentials.json NO aparezcan
git commit -m "Conoce tu Muni - versión inicial"
git remote add origin https://github.com/TU-USUARIO/conoce-tu-muni-form.git
git push -u origin main
```

### 4.2 Backend en Render

1. [render.com](https://render.com) → **New → Web Service**
2. Conecta tu repo de GitHub
3. Configuración:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Variables de entorno (todas excepto las credenciales):
   - `PORT=4000`
   - `ALLOWED_ORIGINS` (lo actualizas después con la URL de Vercel)
   - `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`
5. **Secret Files** → Add Secret File:
   - Filename: `google-credentials.json`
   - Contents: pega el JSON completo
6. **Create Web Service**
7. Anota la URL: `https://conoce-tu-muni-api.onrender.com`

### 4.3 Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Importa el repo
3. Configuración:
   - **Root Directory:** `frontend`
   - Framework: Vite (auto)
4. Variable de entorno:
   - `VITE_API_URL=https://conoce-tu-muni-api.onrender.com`
5. **Deploy**

### 4.4 Conectar (CORS)

En Render → Environment → edita `ALLOWED_ORIGINS`:
```
http://localhost:5173,https://tu-app.vercel.app
```

### 4.5 Mantener backend despierto (opcional)

Render free duerme tras 15 min sin tráfico (50 seg de cold-start). Para evitarlo:

1. [uptimerobot.com](https://uptimerobot.com) → Add New Monitor
2. URL: `https://conoce-tu-muni-api.onrender.com/api/health`
3. Interval: 5 minutes

---

## 🔒 Seguridad

- `.env` y `google-credentials.json` NUNCA suben a Git (revisa `.gitignore`)
- El Apps Script tiene un `SECRET_TOKEN` que debe coincidir con `APPS_SCRIPT_SECRET` del backend
- Rate limiting: 20 requests/IP cada 15 min
- Validación doble: cliente + servidor
- CORS con whitelist explícita

## 🐛 Errores comunes

| Error | Solución |
|---|---|
| `ERR_OSSL_UNSUPPORTED` | El JSON de credenciales está mal o falta. Regenera. |
| `Service Accounts do not have storage quota` | Estás subiendo a Drive directamente con service account. Usa el Apps Script puente. |
| `Faltan parámetros para sendEmail` | Apps Script no se redesplegó como nueva versión. |
| `CORS blocked` | URL de Vercel no está en `ALLOWED_ORIGINS` de Render. |
| `Failed to fetch` | Backend dormido (espera 50 seg) o mal `VITE_API_URL`. |

## 🔄 Flujo de actualizaciones

```bash
git add .
git commit -m "Descripción"
git push
```

Vercel y Render redeployan automáticamente.

## 📋 Checklist de despliegue

- [ ] Repo en GitHub sin secretos
- [ ] Apps Script desplegado con cuenta personal
- [ ] Backend en Render con Secret File configurado
- [ ] Frontend en Vercel con `VITE_API_URL` correcto
- [ ] CORS configurado con URL de Vercel
- [ ] Test end-to-end: formulario → Sheet + Drive + Correo
- [ ] UptimeRobot pingueando (opcional)
