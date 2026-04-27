/**
 * Apps Script puente para "Conoce tu Muni".
 *
 * INSTRUCCIONES:
 * 1) Pega este código completo en script.google.com
 * 2) Reemplaza PEGA_AQUI_TU_TOKEN por el mismo valor de APPS_SCRIPT_SECRET en el .env del backend
 * 3) Guarda con Ctrl+S
 * 4) Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo (tu cuenta personal con cuota de Drive)
 *    - Quién tiene acceso: Cualquier usuario
 * 5) Copia la URL del Web App y pégala como APPS_SCRIPT_URL en el .env
 *
 * Cuando edites el código y necesites aplicar cambios:
 *    Implementar → Administrar implementaciones → Editar (lápiz)
 *    → Versión: Nueva versión → Implementar
 *    (NO crees una nueva implementación: la URL cambiaría)
 */

const SECRET_TOKEN = 'PEGA_AQUI_TU_TOKEN';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SECRET_TOKEN) {
      return respond({ ok: false, error: 'Token invalido' });
    }

    switch (body.action) {
      case 'upload':
        return handleUpload(body);
      case 'sendEmail':
        return handleSendEmail(body);
      default:
        // Retrocompatibilidad: si no trae action pero sí folderId, asume upload
        if (body.folderId && body.base64) return handleUpload(body);
        return respond({ ok: false, error: 'Accion no reconocida' });
    }
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}

function handleUpload(body) {
  if (!body.folderId || !body.fileName || !body.mimeType || !body.base64) {
    return respond({ ok: false, error: 'Faltan parametros para upload' });
  }
  const decoded = Utilities.base64Decode(body.base64);
  const blob = Utilities.newBlob(decoded, body.mimeType, body.fileName);
  const folder = DriveApp.getFolderById(body.folderId);
  const file = folder.createFile(blob);
  return respond({
    ok: true,
    id: file.getId(),
    link: file.getUrl(),
    nombre: file.getName(),
  });
}

function handleSendEmail(body) {
  if (!body.to || !body.subject || !body.htmlBody) {
    return respond({ ok: false, error: 'Faltan parametros para sendEmail' });
  }
  MailApp.sendEmail({
    to: body.to,
    cc: body.cc || '',
    subject: body.subject,
    htmlBody: body.htmlBody,
    name: body.fromName || 'Conoce tu Muni',
    replyTo: body.replyTo || '',
  });
  return respond({ ok: true });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
