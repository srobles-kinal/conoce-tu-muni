/**
 * Verificación de reCAPTCHA v2 (checkbox "No soy un robot") contra Google.
 *
 * Variables de entorno requeridas:
 *   RECAPTCHA_SECRET_KEY - Secret key del proyecto reCAPTCHA
 *
 * Variable opcional (modo desarrollo):
 *   RECAPTCHA_BYPASS=1   - Salta la verificación (solo para tests locales)
 *
 * Endpoint de Google:
 *   https://www.google.com/recaptcha/api/siteverify
 */

/**
 * Verifica un token de reCAPTCHA contra Google.
 * @param {string} token - Token generado por el widget en el frontend
 * @param {string} remoteIp - IP del cliente (opcional, recomendado por Google)
 * @returns {Promise<{valido: boolean, razon?: string}>}
 */
async function verificarRecaptcha(token, remoteIp) {
  // Bypass solo en desarrollo, nunca en producción
  if (process.env.RECAPTCHA_BYPASS === '1' && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ reCAPTCHA bypass activo (solo desarrollo)');
    return { valido: true };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return {
      valido: false,
      razon: 'RECAPTCHA_SECRET_KEY no configurado en el servidor',
    };
  }

  if (!token) {
    return { valido: false, razon: 'Falta el token de reCAPTCHA' };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) params.append('remoteip', remoteIp);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        valido: false,
        razon: `Google respondió con status ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      const errorCodes = (data['error-codes'] || []).join(', ');
      return {
        valido: false,
        razon: `Google rechazó el token: ${errorCodes || 'desconocido'}`,
      };
    }

    return { valido: true };
  } catch (err) {
    return {
      valido: false,
      razon: 'Error al contactar el servicio de Google: ' + err.message,
    };
  }
}

module.exports = { verificarRecaptcha };
