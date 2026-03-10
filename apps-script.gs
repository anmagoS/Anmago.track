/**
 * Apps Script para leer mensajes de Telegram y guardarlos en Sheets
 * Crear un nuevo proyecto en script.google.com y pegar esto
 */

// Configuración
const CONFIG = {
  TELEGRAM_BOT_TOKEN: 'TU_TOKEN_DEL_BOT',
  TELEGRAM_GRUPO_ID: 'TU_GRUPO_ID',
  HOJA_DESTINO: 'Capturas Telegram', // Nombre de la hoja donde guardar
  COLUMNAS: {
    FECHA: 1,
    ID_GUIA: 2,
    TELEFONO: 3,
    LINK_TELEGRAM: 4,
    FECHA_CAPTURA: 5,
    ESTADO: 6
  }
};

/**
 * Función principal para obtener mensajes recientes
 * Programar para ejecutar cada 5 minutos
 */
function obtenerMensajesTelegram() {
  try {
    // Obtener últimas actualizaciones del bot
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getUpdates`;
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (!data.ok) {
      console.error('Error obteniendo mensajes:', data);
      return;
    }
    
    // Procesar mensajes nuevos
    const mensajes = data.result || [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaDestino(ss);
    
    let nuevos = 0;
    
    mensajes.forEach(msg => {
      if (msg.message && msg.message.photo) {
        // Extraer información del caption
        const caption = msg.message.caption || '';
        const idGuia = extraerID(caption);
        const telefono = extraerTelefono(caption);
        const link = `https://t.me/c/${CONFIG.TELEGRAM_GRUPO_ID.replace('-100', '')}/${msg.message.message_id}`;
        
        // Verificar si ya está guardado
        if (!existeEnHoja(hoja, link)) {
          // Guardar en hoja
          const fecha = new Date(msg.message.date * 1000);
          fecha.setHours(fecha.getHours() - 5); // Ajuste Bogotá
          
          hoja.appendRow([
            fecha,
            idGuia,
            telefono,
            link,
            fecha,
            'PENDIENTE'
          ]);
          nuevos++;
        }
      }
    });
    
    console.log(`✅ ${nuevos} mensajes nuevos guardados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Obtener o crear hoja de destino
 */
function obtenerHojaDestino(ss) {
  let hoja = ss.getSheetByName(CONFIG.HOJA_DESTINO);
  
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.HOJA_DESTINO);
    hoja.appendRow([
      'FECHA_EXTRACCION',
      'ID_GUIA',
      'TELEFONO_REMITENTE',
      'LINK_TELEGRAM',
      'FECHA_CAPTURA',
      'ESTADO'
    ]);
    hoja.getRange('1:1').setFontWeight('bold');
  }
  
  return hoja;
}

/**
 * Extraer ID del caption de Telegram
 */
function extraerID(caption) {
  const match = caption.match(/ID: ([A-Z0-9]+)/);
  return match ? match[1] : 'SIN_ID';
}

/**
 * Extraer teléfono del caption
 */
function extraerTelefono(caption) {
  const match = caption.match(/Teléfono: (\d+)/);
  return match ? match[1] : 'SIN_TEL';
}

/**
 * Verificar si un link ya existe en la hoja
 */
function existeEnHoja(hoja, link) {
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === link) return true;
  }
  return false;
}

/**
 * Menú personalizado
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 Telegram')
    .addItem('🔄 Obtener mensajes ahora', 'obtenerMensajesTelegram')
    .addItem('⚙️ Configurar trigger cada 5 min', 'configurarTrigger')
    .addToUi();
}

/**
 * Configurar trigger automático
 */
function configurarTrigger() {
  ScriptApp.newTrigger('obtenerMensajesTelegram')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  SpreadsheetApp.getUi().alert('✅ Trigger configurado cada 5 minutos');
}

// Función de prueba
function test() {
  console.log('🧪 Probando conexión con Telegram...');
  obtenerMensajesTelegram();
}
