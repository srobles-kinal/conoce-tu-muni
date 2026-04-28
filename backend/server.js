/**
 * Servidor Express para el formulario "Conoce tu Muni"
 * Municipalidad de Guatemala
 *
 * Decisión de arquitectura: NO usamos JWT.
 * El formulario es público (no hay usuarios registrados).
 * Defensas activas: rate-limiting, CORS whitelist, validación allow-list,
 * reCAPTCHA contra bots.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { appendRowToSheet } = require('./googleSheets');
const { uploadFileToDrive } = require('./googleDrive');
const { enviarCorreoConfirmacion } = require('./emailService');
const { verificarRecaptcha } = require('./recaptchaService');

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================
// MIDDLEWARES GLOBALES
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origen no permitido por CORS: ' + origin));
    },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
});
app.use('/api/', limiter);

// ============================================================
// MULTER
// ============================================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido. Solo PDF, PNG o JPG.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const fileFields = upload.fields([
  { name: 'archivoDpis', maxCount: 1 },
  { name: 'cartaFacultad', maxCount: 1 },
  { name: 'archivoSire', maxCount: 1 },
]);

// ============================================================
// CONSTANTES Y VALIDACIONES
// ============================================================
// Whitelist de tipos de transporte (solo los permitidos cuando hay parqueo)
const TIPOS_TRANSPORTE = [
  'vehiculo_propio',
  'motocicleta',
  'bicicleta',
  'bus_microbus',
];

// Tipos que requieren número de placa (todos excepto bicicleta)
const TIPOS_QUE_REQUIEREN_PLACA = [
  'vehiculo_propio',
  'motocicleta',
  'bus_microbus',
];

// Regex para placa guatemalteca - flexible:
// Acepta formatos como: P-123ABC, M-123ABC, P123ABC, P-123-ABC
// Letras al inicio (1-3), guión opcional, números (1-4), letras/números (0-4)
const PLACA_REGEX = /^[A-Z]{1,3}-?[0-9]{1,4}-?[A-Z0-9]{0,4}$/i;

const validarPayload = (body) => {
  const errores = [];
  const soloDigitos = (v) => (v || '').replace(/\s/g, '');

  // Solicitante
  if (!body.solicitanteNombre?.trim()) errores.push('Nombre del solicitante es obligatorio');
  if (!/^\d{13}$/.test(soloDigitos(body.solicitanteDpi || '')))
    errores.push('DPI del solicitante debe tener 13 dígitos');
  if (!/^\d{8}$/.test(soloDigitos(body.solicitanteTelefono || '')))
    errores.push('Teléfono del solicitante debe tener 8 dígitos');

  // Categoría
  if (!['universitario', 'turista', 'educativo'].includes(body.categoria))
    errores.push('Categoría de recorrido inválida');

  if (body.categoria === 'universitario') {
    if (!body.universidad?.trim()) errores.push('Nombre de la universidad es obligatorio');
    if (!body.facultad?.trim()) errores.push('Facultad es obligatoria');
    if (!['individual', 'institucional'].includes(body.modalidad))
      errores.push('Modalidad inválida');
  }

  if (body.categoria === 'educativo') {
    if (!['primaria', 'basicos', 'diversificado'].includes(body.tipoRecorrido))
      errores.push('Tipo de recorrido educativo inválido');
    if (!body.establecimiento?.trim()) errores.push('Establecimiento educativo es obligatorio');
    if (!body.cantidadEstudiantes || Number(body.cantidadEstudiantes) <= 0)
      errores.push('Cantidad de estudiantes inválida');
  }

  if (!body.fechaRecorrido) errores.push('Fecha propuesta es obligatoria');
  if (!body.horaLlegada) errores.push('Hora de llegada es obligatoria');
  if (!body.tiempoEstimado?.trim()) errores.push('Tiempo estimado es obligatorio');

  // Necesita parqueo (sí/no)
  if (!['si', 'no'].includes(body.necesitaParqueo))
    errores.push('Selección de parqueo inválida');

  // Si necesita parqueo, debe especificar tipo de transporte
  if (body.necesitaParqueo === 'si') {
    if (!TIPOS_TRANSPORTE.includes(body.tipoTransporte))
      errores.push('Tipo de transporte inválido');

    // Si el tipo de transporte requiere placa, validarla
    if (TIPOS_QUE_REQUIEREN_PLACA.includes(body.tipoTransporte)) {
      const placa = (body.numeroPlaca || '').trim().toUpperCase();
      if (!placa) {
        errores.push('Número de placa es obligatorio');
      } else if (!PLACA_REGEX.test(placa)) {
        errores.push('Formato de placa inválido (ej: P-123ABC)');
      }
    }
  }

  // Responsable
  if (!body.responsableNombre?.trim()) errores.push('Nombre del responsable es obligatorio');
  if (!/^\d{13}$/.test(soloDigitos(body.responsableDpi || '')))
    errores.push('DPI del responsable debe tener 13 dígitos');
  if (!/^\d{8}$/.test(soloDigitos(body.responsableTelefono || '')))
    errores.push('Teléfono del responsable debe tener 8 dígitos');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.responsableCorreo || ''))
    errores.push('Correo del responsable inválido');

  return errores;
};

// ============================================================
// RUTAS
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'conoce-tu-muni', timestamp: new Date().toISOString() });
});

app.post('/api/solicitudes', (req, res) => {
  fileFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }

    try {
      const body = req.body;

      // 1) reCAPTCHA
      const recaptchaResult = await verificarRecaptcha(
        body.recaptchaToken,
        req.ip || req.connection.remoteAddress
      );
      if (!recaptchaResult.valido) {
        return res.status(400).json({
          ok: false,
          error: 'Verificación de seguridad falló. Por favor intenta de nuevo.',
          detalle: process.env.NODE_ENV !== 'production' ? recaptchaResult.razon : undefined,
        });
      }

      // 2) Validación
      const errores = validarPayload(body);
      if (errores.length > 0) {
        return res.status(400).json({ ok: false, errores });
      }

      // 3) Subida de archivos
      const subirSiExiste = async (campo) => {
        const file = req.files?.[campo]?.[0];
        if (!file) return { link: '', nombre: '' };
        const result = await uploadFileToDrive(file);
        return { link: result.link, nombre: result.nombre };
      };

      const [dpisUp, cartaUp, sireUp] = await Promise.all([
        subirSiExiste('archivoDpis'),
        subirSiExiste('cartaFacultad'),
        subirSiExiste('archivoSire'),
      ]);

      const archivos = {
        archivoDpis: dpisUp.link,
        cartaFacultad: cartaUp.link,
        archivoSire: sireUp.link,
      };

      // Etiquetas legibles
      const necesitaParqueoLabel = body.necesitaParqueo === 'si' ? 'Sí' : 'No';

      const tipoTransporteLabel = {
        vehiculo_propio: 'Vehículo propio',
        motocicleta: 'Motocicleta',
        bicicleta: 'Bicicleta',
        bus_microbus: 'Bus / Microbús',
      }[body.tipoTransporte] || '';

      const esMismaPersona =
        body.solicitanteEsResponsable === 'true' ||
        body.solicitanteEsResponsable === true;

      // Normalizar placa a mayúsculas
      const placaFormateada = (body.numeroPlaca || '').trim().toUpperCase();

      // 4) Fila para Sheets — RETROCOMPATIBLE (nueva columna AC al final)
      const fila = [
        new Date().toISOString(),     // A: Timestamp
        body.solicitanteNombre,        // B
        body.solicitanteDpi,           // C
        body.solicitanteTelefono,      // D
        body.categoria,                // E
        body.modalidad || '',          // F
        body.tipoRecorrido || '',      // G
        body.universidad || '',        // H
        body.facultad || '',           // I
        body.establecimiento || '',    // J
        body.rangoEdades || '',        // K
        body.cantidadEstudiantes || '', // L
        body.fechaRecorrido,           // M
        body.horaLlegada,              // N
        body.tiempoEstimado,           // O
        body.dpiVerificado === 'true' ? 'Sí' : 'No', // P
        body.sireAdjunto || '',        // Q
        body.comentarios || '',        // R
        body.responsableNombre,        // S
        body.responsableDpi,           // T
        body.responsableTelefono,      // U
        body.responsableCorreo,        // V
        archivos.archivoDpis,          // W
        archivos.cartaFacultad,        // X
        archivos.archivoSire,          // Y
        necesitaParqueoLabel,          // Z: Parqueo (era Transporte/Parqueo)
        esMismaPersona ? 'Sí' : 'No',  // AA
        tipoTransporteLabel,           // AB
        placaFormateada,               // AC: NUEVA — Número de placa
      ];

      await appendRowToSheet(fila);

      // 5) Correo
      try {
        await enviarCorreoConfirmacion(body, archivos);
      } catch (mailErr) {
        console.warn('⚠️ No se pudo enviar correo de confirmación:', mailErr.message);
      }

      return res.json({
        ok: true,
        mensaje: 'Solicitud registrada correctamente. Recibirás confirmación por correo.',
        archivos,
      });
    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      return res.status(500).json({
        ok: false,
        error: 'Error interno al guardar la solicitud. Intenta de nuevo.',
        detalle: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
