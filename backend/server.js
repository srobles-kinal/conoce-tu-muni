/**
 * Servidor Express para el formulario "Conoce tu Muni"
 * Municipalidad de Guatemala
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

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================
// MIDDLEWARES GLOBALES
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS: permite el frontend local y el desplegado
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

// Rate limit: 20 solicitudes por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
});
app.use('/api/', limiter);

// ============================================================
// CONFIGURACIÓN DE MULTER (subida temporal de archivos)
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por archivo
});

const fileFields = upload.fields([
  { name: 'archivoDpis', maxCount: 1 },
  { name: 'cartaFacultad', maxCount: 1 },
  { name: 'archivoSire', maxCount: 1 },
]);

// ============================================================
// VALIDACIONES
// ============================================================
const validarPayload = (body) => {
  const errores = [];

  if (!body.solicitanteNombre?.trim()) errores.push('Nombre del solicitante es obligatorio');
  if (!/^\d{13}$/.test((body.solicitanteDpi || '').replace(/\s/g, '')))
    errores.push('DPI del solicitante debe tener 13 dígitos');
  if (!/^\d{8}$/.test((body.solicitanteTelefono || '').replace(/\s/g, '')))
    errores.push('Teléfono del solicitante debe tener 8 dígitos');

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

  if (!body.responsableNombre?.trim()) errores.push('Nombre del responsable es obligatorio');
  if (!/^\d{13}$/.test((body.responsableDpi || '').replace(/\s/g, '')))
    errores.push('DPI del responsable debe tener 13 dígitos');
  if (!/^\d{8}$/.test((body.responsableTelefono || '').replace(/\s/g, '')))
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
      const errores = validarPayload(body);
      if (errores.length > 0) {
        return res.status(400).json({ ok: false, errores });
      }

      // Subir archivos a Drive vía Apps Script (en paralelo)
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

      // Fila para Google Sheets (orden fijo)
      const fila = [
        new Date().toISOString(),
        body.solicitanteNombre,
        body.solicitanteDpi,
        body.solicitanteTelefono,
        body.categoria,
        body.modalidad || '',
        body.tipoRecorrido || '',
        body.universidad || '',
        body.facultad || '',
        body.establecimiento || '',
        body.rangoEdades || '',
        body.cantidadEstudiantes || '',
        body.fechaRecorrido,
        body.horaLlegada,
        body.tiempoEstimado,
        body.dpiVerificado === 'true' ? 'Sí' : 'No',
        body.sireAdjunto || '',
        body.comentarios || '',
        body.responsableNombre,
        body.responsableDpi,
        body.responsableTelefono,
        body.responsableCorreo,
        archivos.archivoDpis,
        archivos.cartaFacultad,
        archivos.archivoSire,
      ];

      await appendRowToSheet(fila);

      // Enviar correo de confirmación (no bloquea si falla)
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

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
