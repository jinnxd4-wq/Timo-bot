// ============================================
//           JINXXX - BOT DE WHATSAPP
//           Desarrollador: Jinn
//           WhatsApp: 5354185002
// ============================================

const { startBot } = require("./main");
const settings   = require("./settings");

console.log("============================================");
console.log(`   🤖 ${settings.bot.name} - Bot de WhatsApp`);
console.log(`   👨‍💻 Desarrolladores : Jinn y Nevi`);
console.log(`   📞 Contactos      : 5354185002 / 18096758983`);
console.log(`   ⚙️  Prefijo        : ${settings.prefix}`);
console.log("============================================\n");

// --- MANEJO DE ERRORES GLOBALES ---
process.on("uncaughtException", (err) => {
  console.error("❌ Error no capturado:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Promesa rechazada:", reason);
});

// --- INICIAR BOT ---
startBot().catch((err) => {
  console.error("❌ Error al iniciar el bot:", err.message);
  process.exit(1);
});
