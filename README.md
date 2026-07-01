# 🤖 Timo-WaBot - Bot de WhatsApp

Bot de WhatsApp desarrollado con [Baileys](https://github.com/WhiskeySockets/Baileys) y Node.js.

---

## 👨‍💻 Desarrollador

| Dato | Info |
|------|------|
| Nombre | Jinn y Nevi |
| WhatsApp | 5354185002 / 18096758983 |

---

## 📋 Requisitos

- Node.js v18 o superior
- npm v8 o superior
- MySQL / MongoDB (según configuración)

---

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tuusuario/timo-wabot.git
cd timo-wabot
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura el archivo `settings.js` con tus datos.

4. Instala las dependencias:
```bash
npm install
```

5. Inicia el bot:
```bash
npm start
```

6. Escanea el código QR con WhatsApp.

---

## ⚙️ Configuración

Edita el archivo `settings.js` para personalizar el bot:

```js
BOT_PREFIX=!         // Prefijo de comandos en .env
bot.name: "Timo-WaBot",  // Nombre del bot
database: { ... }     // Datos de tu base de datos
```

---

## 📂 Estructura del proyecto

```
timo-wabot/
├── index.js        # Punto de entrada
├── main.js         # Lógica principal y conexión
├── settings.js     # Configuración del bot
├── package.json    # Dependencias
└── README.md       # Documentación
```

---

## 🗂️ Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `!ping` | Verifica si el bot está activo |
| `!info` | Muestra información del bot |
| `!owner` | Muestra los owners del bot |
| `!myid` | Muestra el número que detecta el bot |
| `!help` / `!menu` / `!ayuda` | Muestra la lista de comandos |
| `!sticker` / `!s` | Crea un sticker desde una imagen o video corto |
| `!tagall` | Menciona a todos en el grupo |
| `!estado` | Muestra el estado del bot |
| `!broadcast` / `!bc` | Envía un mensaje a los chats del bot (solo owners) |
| `!setprefix` | Indica cómo cambiar el prefijo (solo owners) |
| `!restart` / `!reiniciar` | Reinicia el bot (solo owners) |

---

## 📦 Dependencias

| Paquete | Uso |
|---------|-----|
| `@whiskeysockets/baileys` | Conexión con WhatsApp |
| `mysql2` | Base de datos MySQL |
| `mongoose` | Base de datos MongoDB |
| `nodemon` | Reinicio automático en desarrollo |

---

## ⚠️ Aviso

Este bot es de uso personal. No me hago responsable del mal uso que se le pueda dar.

---

## 📄 Licencia

MIT © Jinn y Nevi
