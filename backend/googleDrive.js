/**
 * Puente a Google Drive vía Apps Script Web App.
 *
 * Los service accounts de Google Cloud NO tienen cuota de Drive,
 * así que delegamos el upload a un Apps Script desplegado como Web App
 * que corre bajo la cuenta personal (con 15 GB gratis).
 *
 * Variables de entorno requeridas:
 *   APPS_SCRIPT_URL    - URL del Web App desplegado
 *   APPS_SCRIPT_SECRET - Token compartido con el script
 *   GOOGLE_DRIVE_FOLDER_ID - ID de la carpeta de destino
 */
const fs = require('fs');

async function uploadFileToDrive(file) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!url || !secret || !folderId) {
    throw new Error(
      'Faltan variables: APPS_SCRIPT_URL, APPS_SCRIPT_SECRET o GOOGLE_DRIVE_FOLDER_ID'
    );
  }

  // Nombre amigable con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nombreAmigable = `${timestamp}_${file.originalname}`;

  // Leer archivo local y convertir a base64
  const fileBuffer = fs.readFileSync(file.path);
  const base64 = fileBuffer.toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      action: 'upload',
      folderId,
      fileName: nombreAmigable,
      mimeType: file.mimetype,
      base64,
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Apps Script respondió ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error('Apps Script error: ' + (data.error || 'desconocido'));
  }

  // Borrar archivo temporal local
  fs.unlink(file.path, (err) => {
    if (err) console.warn('No se pudo borrar archivo temporal:', err.message);
  });

  return {
    id: data.id,
    link: data.link,
    nombre: data.nombre,
  };
}

module.exports = { uploadFileToDrive };
