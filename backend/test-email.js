/**
 * Test de envío de correo de confirmación.
 * Uso: 1) Reemplaza TU_CORREO@gmail.com por tu correo
 *      2) node test-email.js
 */
require('dotenv').config();
const { enviarCorreoConfirmacion } = require('./emailService');

const CORREO_DE_PRUEBA = 'TU_CORREO@gmail.com'; // ⚠️ REEMPLAZA AQUÍ

(async () => {
  if (CORREO_DE_PRUEBA === 'TU_CORREO@gmail.com') {
    console.error('❌ Editá test-email.js y reemplazá TU_CORREO@gmail.com');
    return;
  }

  try {
    await enviarCorreoConfirmacion(
      {
        categoria: 'universitario',
        modalidad: 'institucional',
        universidad: 'USAC',
        facultad: 'Ingeniería',
        fechaRecorrido: '2026-04-25',
        horaLlegada: '09:00',
        tiempoEstimado: '2 horas',
        solicitanteNombre: 'Test Solicitante',
        responsableNombre: 'Sergio',
        responsableCorreo: CORREO_DE_PRUEBA,
        responsableTelefono: '55555555',
      },
      {
        archivoDpis: 'https://drive.google.com/file/d/test',
        cartaFacultad: '',
        archivoSire: '',
      }
    );
    console.log('✅ Correo enviado, revisá tu bandeja');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
