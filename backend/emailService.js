/**
 * Envío de correos vía Apps Script Web App.
 * Usa la misma URL y token que googleDrive.js.
 */

async function enviarCorreoConfirmacion(datos, archivos) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  const muniEmail = process.env.MUNI_EMAIL_CC;

  if (!url || !secret) {
    throw new Error('APPS_SCRIPT_URL o APPS_SCRIPT_SECRET no configurados');
  }

  const htmlBody = construirHtml(datos, archivos);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      action: 'sendEmail',
      to: datos.responsableCorreo,
      cc: muniEmail || '',
      subject: `Confirmación de solicitud de recorrido - Conoce tu Muni`,
      htmlBody,
      fromName: 'Conoce tu Muni - Municipalidad de Guatemala',
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Apps Script correo respondió ${response.status}`);
  }

  const data = await response.json();
  if (!data.ok) throw new Error('Error al enviar correo: ' + data.error);

  return true;
}

function construirHtml(datos, archivos) {
  const categoriaLabel = {
    universitario: 'Universitario',
    turista: 'Turista',
    educativo: 'Establecimiento Educativo',
  }[datos.categoria] || datos.categoria;

  const tipoLabel = {
    primaria: 'Primaria',
    basicos: 'Básicos',
    diversificado: 'Diversificado',
  }[datos.tipoRecorrido] || '';

  let detallesEspecificos = '';
  if (datos.categoria === 'universitario') {
    detallesEspecificos = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Modalidad:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.modalidad)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Universidad:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.universidad)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Facultad:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.facultad)}</td></tr>
    `;
  } else if (datos.categoria === 'educativo') {
    detallesEspecificos = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Nivel:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${tipoLabel}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Establecimiento:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.establecimiento)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Rango de edades:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.rangoEdades)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Cantidad estudiantes:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.cantidadEstudiantes)}</td></tr>
    `;
  }

  const archivosHtml = Object.entries(archivos)
    .filter(([_, link]) => link)
    .map(([campo, link]) => {
      const label = {
        archivoDpis: 'Archivo con DPIs',
        cartaFacultad: 'Carta de facultad',
        archivoSire: 'SIRE',
      }[campo] || campo;
      return `<li style="margin:4px 0;"><a href="${link}" style="color:#1E3A8A;">${label}</a></li>`;
    })
    .join('');

  const archivosBlock = archivosHtml
    ? `<h3 style="color:#1E3A8A;margin-top:24px;">Archivos adjuntos</h3>
       <ul style="padding-left:20px;">${archivosHtml}</ul>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
      <div style="background:#1E3A8A;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;">Conoce tu Muni</h1>
        <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Municipalidad de Guatemala</p>
      </div>

      <div style="background:#fff;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#1E3A8A;margin-top:0;">Hola ${escapeHtml(datos.responsableNombre)},</h2>

        <p>Hemos recibido correctamente tu <b>solicitud de recorrido</b>. A continuación un resumen de los datos registrados:</p>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Categoría:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${categoriaLabel}</td></tr>
          ${detallesEspecificos}
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Fecha propuesta:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.fechaRecorrido)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Hora de llegada:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.horaLlegada)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Tiempo estimado:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.tiempoEstimado)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Solicitante:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(datos.solicitanteNombre)}</td></tr>
        </table>

        ${archivosBlock}

        <div style="margin-top:24px;padding:16px;background:#F5F6FA;border-radius:8px;font-size:13px;color:#666;">
          <b style="color:#1E3A8A;">Próximos pasos:</b>
          <p style="margin:8px 0 0;">Nuestro equipo revisará tu solicitud y te contactará al correo
          <b>${escapeHtml(datos.responsableCorreo)}</b> o al teléfono
          <b>${escapeHtml(datos.responsableTelefono)}</b> para confirmar la fecha y los detalles del recorrido.</p>
        </div>

        <p style="margin-top:24px;font-size:13px;color:#666;">
          Si tienes alguna duda, responde a este correo o comunícate a los canales oficiales de la Municipalidad.
        </p>
      </div>

      <div style="text-align:center;color:#999;font-size:12px;padding:16px;">
        © ${new Date().getFullYear()} Municipalidad de Guatemala · Conoce tu Muni
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { enviarCorreoConfirmacion };
