/**
 * Integración con Google Sheets API mediante Service Account.
 * Soporta credenciales locales (./google-credentials.json) y
 * credenciales en Render (/etc/secrets/google-credentials.json).
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const getAuth = () => {
  // Render pone secret files en /etc/secrets/
  const renderPath = '/etc/secrets/google-credentials.json';
  const localPath = path.join(__dirname, 'google-credentials.json');
  const keyFile = fs.existsSync(renderPath) ? renderPath : localPath;

  if (!fs.existsSync(keyFile)) {
    throw new Error(
      'No se encontró google-credentials.json (ni en local ni en /etc/secrets/)'
    );
  }

  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

async function appendRowToSheet(fila) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || 'Solicitudes!A:Z';

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID no está configurado');
  }

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [fila] },
  });

  return response.data;
}

module.exports = { appendRowToSheet };
