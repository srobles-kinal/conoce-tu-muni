/**
 * Test de subida a Google Drive vía Apps Script.
 * Uso: node test-drive.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadFileToDrive } = require('./googleDrive');

(async () => {
  console.log('🔍 Diagnóstico del puente Apps Script (Drive)');
  console.log('   Apps Script URL:', process.env.APPS_SCRIPT_URL ? '✅ configurada' : '❌ falta');
  console.log('   Secret:', process.env.APPS_SCRIPT_SECRET ? '✅ configurado' : '❌ falta');
  console.log('   Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID || '❌ NO CONFIGURADO');
  console.log('');

  try {
    const testPath = path.join(__dirname, 'test-temp.txt');
    fs.writeFileSync(testPath, 'Prueba de subida a Drive');

    const result = await uploadFileToDrive({
      path: testPath,
      originalname: 'prueba-apps-script.txt',
      mimetype: 'text/plain',
    });

    console.log('✅ ÉXITO. Archivo subido:');
    console.log('   Nombre:', result.nombre);
    console.log('   Link:', result.link);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
})();
