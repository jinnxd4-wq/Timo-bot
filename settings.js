// ============================================
//           CONFIGURACIÓN DEL BOT
//           Desarrolladores: Jinn y Nevi
//           WhatsApp: 5354185002 / 18096758983
// ============================================

require("dotenv").config();

const settings = {

  // --- GRUPOS ---
  groups: {
    welcome: true,
    goodbye: true,
    antiLink: true,
  },

  // --- OWNER ---
  owner: {
    allowOnlyOwnersCommands: true,
  },

  // --- BAILEYS ---
  baileys: {
    authFolder: process.env.AUTH_FOLDER || "./auth_info", // Carpeta donde se guarda la sesión
    subBotsFolder: process.env.SUB_BOTS_FOLDER || "./auth_info_subbots", // Carpeta base para sesiones de sub-bots (!code)
    printQRInTerminal: true,                              // Muestra el QR en la terminal para escanear
    browser: ["Ubuntu", "Chrome", "20.0.04"],                 // Perfil reconocido por WhatsApp (necesario para que el código de vinculación funcione)
    syncFullHistory: false,                               // Sincronizar historial completo (recomendado: false)
    markOnlineOnConnect: true,                            // Aparecer en línea al conectar
  },

  // --- PREFIJO DE COMANDOS ---
  prefix: process.env.BOT_PREFIX || "!",                 // Cambia esto en el .env

  // --- BASE DE DATOS ---
  database: {
    type: process.env.DB_TYPE || "mysql",                // Opciones: "mysql" | "mongodb" | "sqlite"
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || "whatsapp_bot",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    // Para MongoDB usa esto en su lugar:
    // uri: process.env.MONGO_URI || "mongodb://localhost:27017/whatsapp_bot",
  },

  // --- CONFIGURACIÓN GENERAL ---
  bot: {
    name: process.env.BOT_NAME || "Timo-WaBot",              // Nombre del bot
    language: "es",                                       // Idioma por defecto
    timezone: "America/Mexico_City",                      // Zona horaria
    maxRetries: 3,                                        // Reintentos en caso de error
    ownerNumber: process.env.OWNER_NUMBER || "5354185002", // Número principal del dueño del bot (compatibilidad)
    secondaryOwnerNumber: process.env.SECONDARY_OWNER_NUMBER || "18096758983", // Número secundario (compatibilidad)
    // Lista de números owner. Acepta cualquier cantidad separados por coma en la variable de entorno OWNER_NUMBERS.
    // Ej: OWNER_NUMBERS=5354185002,18096758983,34911223344
    ownerNumbers: (process.env.OWNER_NUMBERS || "5354185002,18096758983")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean),
  },

};

module.exports = settings;
