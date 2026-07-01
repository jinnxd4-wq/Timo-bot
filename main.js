// ============================================
//           JINXXX - BOT DE WHATSAPP
//           Desarrolladores: Jinn y Nevi
//           WhatsApp: 5354185002 / 18096758983
// ============================================

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const chalk = require("chalk");
const cfonts = require("cfonts");
const pino = require("pino");
const readlineSync = require("readline-sync");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const { exec } = require("child_process");
const os = require("os");
const util = require("util");
const execPromise = util.promisify(exec);
const yts = require("yt-search");

const settings = require("./settings");
const economy = require("./economy");
const {
  cmdBalance, cmdDaily, cmdWork, cmdCrime, cmdSlut,
  cmdDeposit, cmdWithdraw, cmdGiveCoins, cmdCoinFlip,
  cmdRoulette, cmdSteal, cmdEconomyBoard, cmdEconomyInfo,
  cmdMonthly, cmdCoffer, cmdCasino, cmdPPT,
  cmdAdventure, cmdDungeon, cmdHunt, cmdFish, cmdMine, cmdInvoke, cmdHeal,
  cmdMath, checkMathAnswer,
} = economy;

const gacha = require("./gacha");
const {
  cmdRollWaifu, cmdClaim, cmdHarem, cmdCharInfo, cmdDeleteWaifu,
  cmdGiveChar, cmdTrade, cmdSetFav, cmdDelFav, cmdVote,
  cmdWaifusTop, cmdFavTop, cmdSerieList, cmdSerieInfo, cmdGachaInfo,
  cmdSetClaimMsg, cmdDelClaimMsg, cmdHaremShop, cmdSell, cmdBuyChar,
  cmdRemoveSale, cmdCharImage, cmdGiveAllHarem, cmdRobWaifu,
} = gacha;

const profiles = require("./profiles");
const {
  cmdProfile, cmdLevel, cmdLeaderboard,
  cmdSetDescription, cmdDelDescription,
  cmdSetGenre, cmdDelGenre,
  cmdSetBirthday, cmdDelBirthday,
  cmdSetHobby, cmdDelHobby,
  cmdMarry, cmdDivorce,
  cmdAfk, checkAfk,
  addMessageXP,
} = profiles;

// ════════════════════════════════════════════════════════════
//   HELPERS GENERALES
// ════════════════════════════════════════════════════════════

async function fetchJson(url, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function isYTUrl(url = "") {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url);
}

function getVideoId(text = "") {
  const raw = String(text || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  return (
    raw.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|[?&]v=)([a-zA-Z0-9_-]{11})/
    )?.[1] || null
  );
}

function sanitizeFileName(name = "video") {
  return String(name)
    .replace(/\.(mp4|mkv|webm|mov|avi)$/i, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "video";
}

function formatBytes(bytes = 0) {
  if (!bytes || Number.isNaN(bytes)) return "Desconocido";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function parseFileSize(size) {
  if (!size) return null;
  const raw = String(size).trim();
  const match = raw.match(/([\d.,]+)\s*(bytes?|b|kb|kib|mb|mib|gb|gib)/i);
  if (!match) return null;
  let valueText = match[1];
  if (valueText.includes(",") && valueText.includes(".")) {
    valueText = valueText.replace(/,/g, "");
  } else {
    valueText = valueText.replace(",", ".");
  }
  const value = Number(valueText);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2].toLowerCase();
  const mult = { b: 1, byte: 1, bytes: 1, kb: 1024, kib: 1024, mb: 1024 ** 2, mib: 1024 ** 2, gb: 1024 ** 3, gib: 1024 ** 3 };
  return Math.round(value * (mult[unit] || 1));
}

async function getRemoteFileSize(url) {
  const head = await fetch(url, { method: "HEAD", headers: { "user-agent": "Mozilla/5.0" } }).catch(() => null);
  let length = head?.headers?.get("content-length");
  let bytes = Number(length);
  if (Number.isFinite(bytes) && bytes > 0) return bytes;
  const range = await fetch(url, { method: "GET", headers: { range: "bytes=0-0", "user-agent": "Mozilla/5.0" } }).catch(() => null);
  const contentRange = range?.headers?.get("content-range");
  const m = contentRange?.match(/\/(\d+)$/);
  if (m?.[1]) { bytes = Number(m[1]); if (Number.isFinite(bytes) && bytes > 0) return bytes; }
  length = range?.headers?.get("content-length");
  bytes = Number(length);
  return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
}

// ════════════════════════════════════════════════════════════
//   YOUTUBE — búsqueda con yt-search + descarga via fare.ink
// ════════════════════════════════════════════════════════════

async function getVideoInfo(input, videoId) {
  if (videoId) {
    try {
      const info = await yts({ videoId });
      if (info?.videoId) return { ...info, url: `https://youtu.be/${info.videoId}`, image: info.thumbnail || info.image };
    } catch {}
  }
  const search = await yts(input);
  return search.videos?.[0] || search.all?.find(v => v.type === "video") || null;
}

async function getYoutubeUrl(input) {
  const id = getVideoId(input);
  if (id) return `https://youtu.be/${id}`;
  if (isYTUrl(input)) return input;
  const search = await yts(input);
  const video = search.videos?.[0] || search.all?.find(v => v.type === "video");
  if (!video?.url) throw new Error("No se encontró un video válido de YouTube");
  return video.url;
}

// ── ytmp3 via fare.ink ────────────────────────────────────────────────────────
async function getAudioFromFare(url) {
  const apiUrl = `https://fare.ink/dl/yta?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Fare API falló: HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.status || !json?.descarga?.url) throw new Error("No se encontró el enlace de descarga.");
  const audioRes = await fetch(json.descarga.url);
  if (!audioRes.ok) throw new Error(`No se pudo descargar el audio: HTTP ${audioRes.status}`);
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  return { buffer, name: json.descarga.archivo || "audio.mp3" };
}

// ── ytmp4 via fare.ink ────────────────────────────────────────────────────────
async function getVideoFromFare(url) {
  const apiUrl = `https://fare.ink/dl/ytv?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Fare API HTTP ${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { throw new Error(`Respuesta inválida de Fare API: ${text.slice(0, 200)}`); }
}

async function getThumbnailBuffer(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.length ? buffer : null;
  } catch { return null; }
}

// ── Comando ytmp3 ─────────────────────────────────────────────────────────────
async function handleYtMp3(sock, from, msg, query) {
  if (!query) {
    await sock.sendMessage(from, {
      text: `Usa: *${settings.prefix}ytmp3 <nombre o URL>*\nEjemplo: *${settings.prefix}ytmp3 Despacito Luis Fonsi*`,
    });
    return;
  }

  await reactToMessage(sock, msg, "⏳");

  try {
    const videoId = getVideoId(query);
    const url = await getYoutubeUrl(query);
    let title = "audio";
    let thumbnail = null;

    try {
      const info = await getVideoInfo(query, videoId);
      if (info) {
        title = info.title || title;
        thumbnail = info.image || info.thumbnail || null;
        const views = Number(info.views || 0).toLocaleString("es");
        const channel = info.author?.name || info.author || "Desconocido";
        const infoMsg =
          `➩ Descargando › *${title}*\n\n` +
          `> ❖ Canal › *${channel}*\n` +
          `> ⴵ Duración › *${info.timestamp || "Desconocido"}*\n` +
          `> ❀ Vistas › *${views}*\n` +
          `> ✩ Publicado › *${info.ago || "Desconocido"}*\n` +
          `> ❒ Enlace › *${url}*`;
        if (thumbnail) {
          await sock.sendMessage(from, { image: { url: thumbnail }, caption: infoMsg }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: infoMsg });
        }
      }
    } catch {}

    if (!isYTUrl(url)) {
      await reactToMessage(sock, msg, "❌");
      await sock.sendMessage(from, { text: "❌ No se encontró un video válido de YouTube." });
      return;
    }

    const audio = await getAudioFromFare(url);
    if (!audio?.buffer?.length) {
      await reactToMessage(sock, msg, "❌");
      await sock.sendMessage(from, { text: "❌ No se pudo descargar el audio. Intenta más tarde." });
      return;
    }

    await sock.sendMessage(from, {
      audio: audio.buffer,
      fileName: audio.name || `${title}.mp3`,
      mimetype: "audio/mpeg",
    }, { quoted: msg });

    await reactToMessage(sock, msg, "✅");
  } catch (err) {
    console.error("[ytmp3] Error:", err.message);
    await reactToMessage(sock, msg, "❌");
    await sock.sendMessage(from, { text: `❌ No pude descargar el audio.\n_${err.message}_` });
  }
}

// ── Comando ytmp4 ─────────────────────────────────────────────────────────────
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

async function handleYtMp4(sock, from, msg, query) {
  if (!query) {
    await sock.sendMessage(from, {
      text: `Usa: *${settings.prefix}ytmp4 <nombre o URL>*\nEjemplo: *${settings.prefix}ytmp4 Despacito Luis Fonsi*`,
    });
    return;
  }

  await reactToMessage(sock, msg, "⏳");

  try {
    const url = await getYoutubeUrl(query);
    const data = await getVideoFromFare(url);

    if (!data?.status || !data?.descarga?.url) {
      await reactToMessage(sock, msg, "❌");
      await sock.sendMessage(from, { text: "❌ No se pudo obtener el video. Intenta más tarde." });
      return;
    }

    const title = data.titulo || "video";
    const channel = data.canal?.nombre || "Desconocido";
    const duration = data.duracion || "Desconocido";
    const views = Number(data.vistas || 0).toLocaleString("es");
    const thumbnail = data.miniatura || null;
    const download = data.descarga;
    const quality = download.calidad || "360p";
    const fileName = sanitizeFileName(title) + ".mp4";

    const sizeBytes =
      parseFileSize(download.tamaño) ||
      (await getRemoteFileSize(download.url).catch(() => null));
    const sizeText = sizeBytes ? formatBytes(sizeBytes) : download.tamaño || "Desconocido";
    const sendAsDocument = sizeBytes ? sizeBytes > MAX_VIDEO_SIZE : false;

    const infoMsg =
      `➩ Descargando › *${title}*\n\n` +
      `> ❖ Canal › *${channel}*\n` +
      `> ⴵ Duración › *${duration}*\n` +
      `> ❀ Vistas › *${views}*\n` +
      `> ❒ Calidad › *${quality}*\n` +
      `> ❒ Tamaño › *${sizeText}*\n` +
      `> ❒ Enlace › *${url}*`;

    if (thumbnail) {
      await sock.sendMessage(from, { image: { url: thumbnail }, caption: infoMsg }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: infoMsg });
    }

    const caption =
      `乂 *Video descargado*\n\n` +
      `> ❒ Calidad › *${quality}*\n` +
      `> ❒ Tamaño › *${sizeText}*`;

    if (sendAsDocument) {
      await sock.sendMessage(from, {
        document: { url: download.url },
        mimetype: "video/mp4",
        fileName,
        caption,
      }, { quoted: msg });
    } else {
      try {
        const thumbBuf = thumbnail ? await getThumbnailBuffer(thumbnail) : null;
        await sock.sendMessage(from, {
          video: { url: download.url },
          mimetype: "video/mp4",
          fileName,
          caption,
          ...(thumbBuf ? { jpegThumbnail: thumbBuf } : {}),
        }, { quoted: msg });
      } catch {
        // Fallback: enviar como documento si el video falla
        await sock.sendMessage(from, {
          document: { url: download.url },
          mimetype: "video/mp4",
          fileName,
          caption,
        }, { quoted: msg });
      }
    }

    await reactToMessage(sock, msg, "✅");
  } catch (err) {
    console.error("[ytmp4] Error:", err.message);
    await reactToMessage(sock, msg, "❌");
    await sock.sendMessage(from, { text: `❌ No pude descargar el video.\n_${err.message}_` });
  }
}

// ── Comando ytsearch ──────────────────────────────────────────────────────────
async function handleYtSearch(sock, from, msg, query) {
  if (!query) {
    await sock.sendMessage(from, {
      text: `Usa: *${settings.prefix}ytsearch <título>*\nEjemplo: *${settings.prefix}ytsearch Despacito*`,
    });
    return;
  }

  await reactToMessage(sock, msg, "🔍");

  try {
    const results = await yts(query);
    const videos = results.all.filter(v => v.type === "video" || v.type === "channel").slice(0, 8);

    if (!videos.length) {
      await reactToMessage(sock, msg, "❌");
      await sock.sendMessage(from, { text: `❌ No encontré resultados para *"${query}"*.` });
      return;
    }

    const sep = "\n\n╾─┄─ ─〬─ ┄─╼\n\n";
    const text = videos.map(v => {
      if (v.type === "video") {
        return (
          `➩ *Título ›* *${v.title}*\n\n` +
          `> ⴵ *Duración ›* ${v.timestamp}\n` +
          `> ❖ *Subido ›* ${v.ago}\n` +
          `> ✿ *Vistas ›* ${v.views?.toLocaleString?.() || v.views}\n` +
          `> ❒ *Url ›* ${v.url}`
        ).trim();
      }
      if (v.type === "channel") {
        return (
          `> ❖ Canal › *${v.name}*\n` +
          `> ❒ Url › ${v.url}\n` +
          `> ❀ Suscriptores › ${v.subCountLabel || "N/A"}\n` +
          `> ✿ Videos › ${v.videoCount || "N/A"}`
        ).trim();
      }
      return null;
    }).filter(Boolean).join(sep);

    // Enviar con thumbnail del primer video
    const firstVideo = videos.find(v => v.type === "video");
    if (firstVideo?.thumbnail) {
      try {
        const thumbBuf = await getThumbnailBuffer(firstVideo.thumbnail);
        if (thumbBuf) {
          await sock.sendMessage(from, { image: thumbBuf, caption: text }, { quoted: msg });
          await reactToMessage(sock, msg, "✅");
          return;
        }
      } catch {}
    }

    await sock.sendMessage(from, { text }, { quoted: msg });
    await reactToMessage(sock, msg, "✅");
  } catch (err) {
    console.error("[ytsearch] Error:", err.message);
    await reactToMessage(sock, msg, "❌");
    await sock.sendMessage(from, { text: `❌ Error al buscar: _${err.message}_` });
  }
}

// ════════════════════════════════════════════════════════════
//   PINTEREST via fare.ink
// ════════════════════════════════════════════════════════════

async function getPinterestDownload(url) {
  try {
    const res = await fetchJson(`https://fare.ink/dl/pin?url=${encodeURIComponent(url)}`);
    if (!res.status || !res.resultado?.url) return null;
    const data = res.resultado;
    const filename = data.filename || "";
    const mediaUrl = data.url || "";
    const isVideo = /\.mp4(?:$|\?)/i.test(filename) || /\.mp4(?:$|\?)/i.test(mediaUrl);
    const ext = filename.split(".").pop() || (isVideo ? "mp4" : "jpg");
    return {
      type: isVideo ? "video" : "image",
      title: data.titulo || null,
      author: data.autor || null,
      format: ext,
      url: mediaUrl,
      thumbnail: data.thumbnail || mediaUrl,
      filename: filename || `pinterest.${ext}`,
    };
  } catch { return null; }
}

async function getPinterestSearch(query) {
  try {
    const res = await fetchJson(`https://fare.ink/search/pin?q=${encodeURIComponent(query)}&limit=20`);
    if (!res.status || !Array.isArray(res.results) || !res.results.length) return [];
    return res.results
      .filter(d => d?.descarga)
      .map(d => {
        const tipo = String(d.tipo || "").toLowerCase();
        const descarga = d.descarga || null;
        const isVideo = tipo === "video" || /\.mp4(?:$|\?)/i.test(descarga || "");
        return {
          type: isVideo ? "video" : "image",
          title: d.titulo || null,
          name: d.autor || null,
          likes: d.likes || null,
          image: descarga,
          url: d.url || null,
        };
      });
  } catch { return []; }
}

async function handlePinterest(sock, from, msg, query) {
  if (!query) {
    await sock.sendMessage(from, {
      text: `Usa: *${settings.prefix}pinterest <búsqueda o enlace>*\nEjemplo: *${settings.prefix}pinterest aesthetic room*`,
    });
    return;
  }

  await reactToMessage(sock, msg, "🔍");

  const isPinterestUrl = /^https?:\/\//.test(query);

  try {
    if (isPinterestUrl) {
      // ── Descarga por URL directa ──
      await sock.sendMessage(from, { text: `📥 Descargando desde Pinterest...` });
      const data = await getPinterestDownload(query);

      if (!data) {
        await reactToMessage(sock, msg, "❌");
        await sock.sendMessage(from, { text: "❌ No se pudo obtener el contenido del enlace." });
        return;
      }

      const caption =
        `🌸 *Pinterest Download*\n\n` +
        (data.title  ? `📌 *Título ›* ${data.title}\n`  : "") +
        (data.author ? `👤 *Autor ›* ${data.author}\n`  : "") +
        (data.format ? `📄 *Formato ›* ${data.format}\n`: "") +
        `🔗 *Enlace ›* ${query}`;

      if (data.type === "video") {
        await sock.sendMessage(from, {
          video: { url: data.url },
          caption,
          mimetype: "video/mp4",
          fileName: data.filename || "pin.mp4",
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          image: { url: data.url },
          caption,
        }, { quoted: msg });
      }

      await reactToMessage(sock, msg, "✅");

    } else {
      // ── Búsqueda por texto ──
      await sock.sendMessage(from, { text: `🔍 Buscando *"${query}"* en Pinterest...` });
      const results = await getPinterestSearch(query);

      if (!results.length) {
        await reactToMessage(sock, msg, "❌");
        await sock.sendMessage(from, {
          text: `❌ No encontré resultados para *"${query}"*.\nIntenta con otro término o en inglés.`,
        });
        return;
      }

      const medias = results.slice(0, 10).filter(r => r.image);
      if (!medias.length) {
        await reactToMessage(sock, msg, "❌");
        await sock.sendMessage(from, { text: "❌ No se pudieron obtener imágenes válidas." });
        return;
      }

      // Enviar hasta 5 imágenes
      const selected = medias.slice(0, 5);
      let enviadas = 0;
      for (let i = 0; i < selected.length; i++) {
        try {
          const r = selected[i];
          const caption =
            `🌸 *Pinterest Search* — ${query}\n\n` +
            (r.title ? `📌 *Título ›* ${r.title}\n` : "") +
            (r.name  ? `👤 *Autor ›* ${r.name}\n`  : "") +
            (r.likes ? `❤️ *Likes ›* ${r.likes}\n`  : "");

          if (r.type === "video") {
            await sock.sendMessage(from, {
              video: { url: r.image },
              caption: enviadas === 0 ? caption : "",
              mimetype: "video/mp4",
            }, enviadas === 0 ? { quoted: msg } : {});
          } else {
            await sock.sendMessage(from, {
              image: { url: r.image },
              caption: enviadas === 0 ? caption : "",
            }, enviadas === 0 ? { quoted: msg } : {});
          }
          enviadas++;
        } catch (e) {
          console.error("[Pinterest] Error enviando item:", e.message);
        }
      }

      if (enviadas === 0) {
        await reactToMessage(sock, msg, "❌");
        await sock.sendMessage(from, { text: "❌ No pude enviar ninguna imagen. Intenta de nuevo." });
        return;
      }

      await reactToMessage(sock, msg, "✅");
    }
  } catch (err) {
    console.error("[Pinterest] Error general:", err.message);
    await reactToMessage(sock, msg, "❌");
    await sock.sendMessage(from, { text: `❌ Error al procesar Pinterest.\n_${err.message}_` });
  }
}

// ════════════════════════════════════════════════════════════
//   REACCIONES ANIME
// ════════════════════════════════════════════════════════════

const REACTION_COMMANDS = {
  hug:    { aliases: ["abrazar"], emoji: "🤗", needMention: true,  text: "le dio un abrazo a" },
  kiss:   { aliases: ["muak"],    emoji: "😘", needMention: true,  text: "le dio un beso a" },
  pat:    { aliases: [],          emoji: "🫳", needMention: true,  text: "acarició a" },
  slap:   { aliases: [],          emoji: "👋", needMention: true,  text: "le dio una bofetada a" },
  cry:    { aliases: ["llorar"],  emoji: "😭", needMention: false, text: "se puso a llorar" },
  dance:  { aliases: ["bailar"],  emoji: "💃", needMention: false, text: "se puso a bailar" },
  lick:   { aliases: ["lamer"],   emoji: "😛", needMention: true,  text: "lamió a" },
  bite:   { aliases: ["morder"],  emoji: "🧛", needMention: true,  text: "mordió a" },
  blush:  { aliases: [],          emoji: "😊", needMention: false, text: "se sonrojó" },
  bonk:   { aliases: [],          emoji: "🔨", needMention: true,  text: "le dio un golpe divertido a" },
  cuddle: { aliases: ["acurrucar"], emoji: "🫂", needMention: true,  text: "se acurrucó con" },
  kill:   { aliases: ["matar"],   emoji: "💀", needMention: true,  text: "atacó dramáticamente a" },
  wave:   { aliases: ["saludar"], emoji: "👋", needMention: false, text: "saludó con la mano" },
  wink:   { aliases: [],          emoji: "😉", needMention: false, text: "guiñó un ojo" },
  smile:  { aliases: ["sonreir"], emoji: "😄", needMention: false, text: "sonrió" },
  sad:    { aliases: ["triste"],  emoji: "😢", needMention: false, text: "expresó tristeza" },
  happy:  { aliases: ["feliz"],   emoji: "🥳", needMention: false, text: "saltó de felicidad" },
  angry:  { aliases: ["enojado"], emoji: "😠", needMention: false, text: "se enojó" },
  shy:    { aliases: ["timido"],  emoji: "🫣", needMention: false, text: "se puso tímido" },
  run:    { aliases: ["correr"],  emoji: "🏃", needMention: false, text: "salió corriendo" },
  eat:    { aliases: ["nom", "comer"], emoji: "🍔", needMention: false, text: "se fue a comer algo delicioso" },

  // ── Nuevas reacciones (nekos.best) ──
  bleh:     { aliases: ["meh"],        emoji: "😝", needMention: false, source: "nekosbest", text: "sacó la lengua" },
  blowkiss: { aliases: ["besito"],     emoji: "😘", needMention: true,  source: "nekosbest", text: "le lanzó un beso a" },
  bored:    { aliases: ["aburrido", "aburrida"], emoji: "🥱", needMention: false, source: "nekosbest", text: "está aburrido/a" },
  clap:     { aliases: ["aplaudir"],   emoji: "👏", needMention: false, source: "nekosbest", text: "está aplaudiendo" },
  handhold: { aliases: ["tomar"],      emoji: "🤝", needMention: true,  source: "nekosbest", text: "le tomó la mano a" },
  highfive: { aliases: ["chocar"],     emoji: "🖐️", needMention: true,  source: "nekosbest", text: "chocó los cinco con" },
  laugh:    { aliases: ["reir"],       emoji: "😂", needMention: false, source: "nekosbest", text: "se está riendo" },
  nope:     { aliases: ["nop"],        emoji: "🙅", needMention: false, source: "nekosbest", text: "dice que no" },
  pout:     { aliases: ["mueca"],      emoji: "😤", needMention: false, source: "nekosbest", text: "está haciendo pucheros" },
  punch:    { aliases: ["golpear", "puñetazo"], emoji: "👊", needMention: true,  source: "nekosbest", text: "le dio un puñetazo a" },
  sleep:    { aliases: ["dormir"],     emoji: "😴", needMention: false, source: "nekosbest", text: "se quedó dormido/a" },
  smug:     { aliases: ["presumir"],   emoji: "😏", needMention: false, source: "nekosbest", text: "está presumiendo" },
  stare:    { aliases: ["mirar"],      emoji: "👀", needMention: true,  source: "nekosbest", text: "se queda mirando fijamente a" },
  think:    { aliases: ["pensar"],     emoji: "🤔", needMention: false, source: "nekosbest", text: "está pensando profundamente" },
  tickle:   { aliases: ["cosquillas"], emoji: "🤭", needMention: true,  source: "nekosbest", text: "le hizo cosquillas a" },
  comfort:  { aliases: ["consolar"],   emoji: "🤗", needMention: true,  source: "purrbot",   text: "está consolando a" },
};

const COMMAND_ALIASES = Object.entries(REACTION_COMMANDS).reduce((acc, [key, value]) => {
  acc[key] = key;
  for (const alias of value.aliases) acc[alias] = key;
  return acc;
}, {});

const WAIFUPICS_MAP = {
  hug: "hug", kiss: "kiss", pat: "pat", slap: "slap", cry: "cry",
  dance: "dance", lick: "lick", bite: "bite", blush: "blush", bonk: "bonk",
  cuddle: "cuddle", kill: "kill", wave: "wave", wink: "wink", smile: "smile",
  sad: "cry", happy: "happy", angry: "angry", shy: "blush", run: "run", eat: "nom",
};

// ════════════════════════════════════════════════════════════
//   UTILIDADES
// ════════════════════════════════════════════════════════════

function formatOwnerNumber(number) {
  return `${number}`.replace(/[^0-9]/g, "");
}

function formatMenuDate(date) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let h = date.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}, ${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function getMessageText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  );
}

function getMentionedJid(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
}

function getQuotedParticipant(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.participant || null;
}

function isOwner(sender, settings) {
  const cleanSender = formatOwnerNumber(`${sender}`.split("@")[0].split(":")[0]);
  const list = [
    ...(settings.bot.ownerNumbers || []),
    settings.bot.ownerNumber,
    settings.bot.secondaryOwnerNumber,
  ]
    .filter(Boolean)
    .map((n) => formatOwnerNumber(`${n}`.split("@")[0].split(":")[0]));
  return list.includes(cleanSender);
}

function getQuotedImageMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || null;
}

function getQuotedVideoMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage || null;
}

function normalizeJid(jid) {
  return jid?.replace(/:[0-9]+@/, "@") || "";
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

async function reactToMessage(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (error) {
    console.error("Error enviando reaccion:", error.message);
  }
}

async function convertGifBufferToMp4(buffer) {
  const tempDir = path.join(process.cwd(), "temp_stickers");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const baseName = `reaction_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const inputPath = path.join(tempDir, `${baseName}.gif`);
  const outputPath = path.join(tempDir, `${baseName}.mp4`);
  fs.writeFileSync(inputPath, buffer);
  try {
    await runFfmpeg([
      "-y", "-i", inputPath,
      "-movflags", "faststart",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-an", outputPath,
    ]);
    return fs.readFileSync(outputPath);
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

async function sendReactionMedia(sock, jid, media, caption, mentions = []) {
  if (!media) {
    await sock.sendMessage(jid, { text: caption, mentions });
    return;
  }
  const mediaUrl = typeof media === "string" ? media : media.url;
  const ext = mediaUrl.split("?")[0].split(".").pop().toLowerCase();
  const isGif = ext === "gif";
  const isMp4 = ext === "mp4" || (typeof media === "object" && media.isVideo);
  try {
    const res = await fetch(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; WhatsApp/2.0)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let buffer = Buffer.from(await res.arrayBuffer());

    if (isGif) {
      buffer = await convertGifBufferToMp4(buffer);
      await sock.sendMessage(jid, { video: buffer, gifPlayback: true, caption, mentions, mimetype: "video/mp4", fileLength: buffer.length });
    } else if (isMp4) {
      await sock.sendMessage(jid, { video: buffer, gifPlayback: true, caption, mentions, mimetype: "video/mp4", fileLength: buffer.length });
    } else {
      await sock.sendMessage(jid, { image: buffer, caption, mentions, mimetype: "image/jpeg" });
    }
  } catch (err) {
    console.error("Error enviando media reaccion:", err.message);
    await sock.sendMessage(jid, { text: `${caption}\n\n🔗 ${mediaUrl}`, mentions });
  }
}

async function fetchWaifuPics(endpoint) {
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${endpoint}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    const url = json?.url;
    if (!url) return null;
    return { url, isVideo: url.endsWith(".mp4") };
  } catch (e) {
    console.error("[waifu.pics] Error:", e.message);
    return null;
  }
}

async function fetchNekosBest(endpoint) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    const url = json?.results?.[0]?.url;
    if (!url) return null;
    return { url, isVideo: false };
  } catch (e) {
    console.error("[nekos.best] Error:", e.message);
    return null;
  }
}

async function fetchPurrbot(endpoint) {
  try {
    const res = await fetch(`https://api.purrbot.site/v2/img/sfw/${endpoint}/gif`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error || !json?.link) return null;
    return { url: json.link, isVideo: false };
  } catch (e) {
    console.error("[purrbot] Error:", e.message);
    return null;
  }
}

async function fetchPPCouple() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json");
    if (!res.ok) return null;
    const data = await res.json();
    return data[Math.floor(Math.random() * data.length)] || null;
  } catch { return null; }
}

// Extrae solo los dígitos del usuario, ignorando dominio (@s.whatsapp.net / @lid) y sufijo de dispositivo (:NN)
function bareNumber(jid) {
  return `${jid || ""}`.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

async function isAdmin(sock, groupJid, userJid, msg) {
  const metadata = await sock.groupMetadata(groupJid);
  // Candidatos: el JID que tenemos del remitente, y cualquier JID alternativo que WhatsApp
  // adjunte en el mensaje (algunos grupos usan @lid en vez de @s.whatsapp.net para los participantes).
  const candidates = new Set(
    [
      userJid,
      msg?.key?.participantAlt,
      msg?.key?.participantPn,
      msg?.key?.participantLid,
    ]
      .filter(Boolean)
      .map(bareNumber)
  );

  return metadata.participants.some((p) => {
    if (p.admin !== "admin" && p.admin !== "superadmin") return false;
    const participantIds = [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(bareNumber);
    return participantIds.some((id) => candidates.has(id));
  });
}

async function isBotAdmin(sock, groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const botCandidates = new Set(
    [sock.user?.id, sock.user?.lid].filter(Boolean).map(bareNumber)
  );
  return metadata.participants.some((p) => {
    if (p.admin !== "admin" && p.admin !== "superadmin") return false;
    const participantIds = [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(bareNumber);
    return participantIds.some((id) => botCandidates.has(id));
  });
}

async function createStickerFromImage(msg) {
  const buffer = await downloadMediaMessage(msg, "buffer", {}, {});
  const tempDir = path.join(process.cwd(), "temp_stickers");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const baseName = `sticker_${Date.now()}`;
  const inputPath = path.join(tempDir, `${baseName}.jpg`);
  const outputPath = path.join(tempDir, `${baseName}.webp`);
  fs.writeFileSync(inputPath, buffer);
  await runFfmpeg([
    "-y", "-i", inputPath,
    "-vf", "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
    "-vcodec", "libwebp", "-lossless", "1", "-compression_level", "6",
    "-qscale", "100", "-preset", "photo", "-loop", "0", "-an", "-vsync", "0", outputPath,
  ]);
  const stickerBuffer = fs.readFileSync(outputPath);
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);
  return stickerBuffer;
}

async function createStickerFromVideo(msg) {
  const buffer = await downloadMediaMessage(msg, "buffer", {}, {});
  const tempDir = path.join(process.cwd(), "temp_stickers");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const baseName = `video_sticker_${Date.now()}`;
  const inputPath = path.join(tempDir, `${baseName}.mp4`);
  const outputPath = path.join(tempDir, `${baseName}.webp`);
  fs.writeFileSync(inputPath, buffer);
  await runFfmpeg([
    "-y", "-i", inputPath, "-t", "10",
    "-vf", "fps=20,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
    "-vcodec", "libwebp", "-lossless", "0", "-compression_level", "4",
    "-qscale", "80", "-loop", "0", "-an", "-preset", "default", "-vsync", "0", outputPath,
  ]);
  const stickerBuffer = fs.readFileSync(outputPath);
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);
  return stickerBuffer;
}

async function handleAnimeReaction(sock, msg, sender, from, commandKey) {
  const config = REACTION_COMMANDS[commandKey];
  if (!config) return false;
  const mention = getMentionedJid(msg);
  if (config.needMention && !mention) {
    await sock.sendMessage(from, { text: `Debes mencionar a alguien para usar *${settings.prefix}${commandKey}*.` });
    return true;
  }
  const senderTag = `@${sender.split("@")[0]}`;
  const mentions = [sender];
  let text = "";
  if (mention) {
    const targetTag = `@${mention.split("@")[0]}`;
    mentions.push(mention);
    text = `${config.emoji} ${senderTag} ${config.text} ${targetTag}`;
  } else {
    text = `${config.emoji} ${senderTag} ${config.text}`;
  }
  await reactToMessage(sock, msg, config.emoji);
  let mediaUrl;
  if (config.source === "nekosbest") {
    mediaUrl = await fetchNekosBest(commandKey);
  } else if (config.source === "purrbot") {
    mediaUrl = await fetchPurrbot(commandKey === "comfort" ? "comfy" : commandKey);
  } else {
    const endpoint = WAIFUPICS_MAP[commandKey] || commandKey;
    mediaUrl = await fetchWaifuPics(endpoint);
  }
  await sendReactionMedia(sock, from, mediaUrl, text, mentions);
  return true;
}

// ════════════════════════════════════════════════════════════
//   LOGGER
// ════════════════════════════════════════════════════════════
const log = {
  info:    (m) => console.log(chalk.bgBlue.white.bold(" INFO "),    chalk.white(m)),
  success: (m) => console.log(chalk.bgGreen.white.bold(" OK "),     chalk.greenBright(m)),
  warn:    (m) => console.log(chalk.bgYellowBright.black.bold(" WARN "), chalk.yellow(m)),
  error:   (m) => console.log(chalk.bgRed.white.bold(" ERROR "),   chalk.redBright(m)),
};

// ════════════════════════════════════════════════════════════
//   NORMALIZACIÓN DE TELÉFONO
// ════════════════════════════════════════════════════════════
function normalizePhone(input) {
  let s = String(input).replace(/\D/g, "");
  if (!s) return "";
  if (s.startsWith("0")) s = s.replace(/^0+/, "");
  if (s.length === 10 && s.startsWith("3")) s = "57" + s;
  if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2);
  if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2);
  return s;
}

// ════════════════════════════════════════════════════════════
//   MENÚ DE VINCULACIÓN (síncrono, antes de iniciar el bot)
// ════════════════════════════════════════════════════════════
function clearSession() {
  try {
    const sessionDir = settings.baileys.authFolder;
    if (!fs.existsSync(sessionDir)) return;
    for (const file of fs.readdirSync(sessionDir)) {
      try { fs.unlinkSync(path.join(sessionDir, file)); } catch {}
    }
    log.warn("Sesión eliminada — reiniciando para vincular de nuevo...");
  } catch (e) {
    log.error(`clearSession → ${e?.message || e}`);
  }
}

// ════════════════════════════════════════════════════════════
//   SUB-BOTS — conexiones independientes (número vinculado
//   aparte del bot principal, cada uno con su propia sesión)
// ════════════════════════════════════════════════════════════
const subBots = {}; // { [phoneNumber]: { sock, authFolder, connected } }

function subBotAuthFolder(phoneNumber) {
  const base = settings.baileys.subBotsFolder || "./auth_info_subbots";
  return path.join(base, phoneNumber);
}

async function startSubBot(phoneNumber, ownerSock, ownerChatId, ownerMsg) {
  if (subBots[phoneNumber]?.sock) {
    throw new Error(`Ya existe un sub-bot activo o en proceso para ${phoneNumber}.`);
  }

  const authFolder = subBotAuthFolder(phoneNumber);
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const subSock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: false,
    markOnlineOnConnect: settings.baileys.markOnlineOnConnect,
    keepAliveIntervalMs: 25_000,
    shouldIgnoreJid: (jid) => jid.endsWith("@broadcast"),
    generateHighQualityLinkPreview: true,
  });

  subBots[phoneNumber] = { sock: subSock, authFolder, connected: false };

  subSock.ev.on("creds.update", saveCreds);
  subSock.ev.on("messages.upsert", (payload) => handleMessages(subSock, payload));

  let pairingRequested = false;
  let subReconexion = 0;

  subSock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (qr && !state.creds.registered && !pairingRequested) {
      pairingRequested = true;
      try {
        const code = await subSock.requestPairingCode(phoneNumber);
        const formatted = code.match(/.{1,4}/g)?.join("-") || code;
        await ownerSock.sendMessage(ownerChatId, {
          text:
            `╭┈ 𐔌 *Código de Vinculación (Sub-Bot)* 𐦯\n` +
            `│\n` +
            `│  🔢  *${formatted}*\n` +
            `│\n` +
            `│ 📞 Número: *${phoneNumber}*\n` +
            `│\n` +
            `│ ○ Ingresa este código en WhatsApp de ese número:\n` +
            `│ *Dispositivos vinculados →*\n` +
            `│ *Vincular con número de teléfono*\n` +
            `│\n` +
            `│ ⚠️ El código expira en *60 segundos*.\n` +
            `╰────────────────────────────`,
        }, { quoted: ownerMsg });
      } catch (error) {
        delete subBots[phoneNumber];
        try { subSock.end(undefined); } catch {}
        try {
          await ownerSock.sendMessage(ownerChatId, {
            text: `❌ No se pudo generar el código para el sub-bot.\n> ${error?.message || "Error desconocido"}`,
          }, { quoted: ownerMsg });
        } catch {}
      }
    }

    if (connection === "open") {
      if (subBots[phoneNumber]) subBots[phoneNumber].connected = true;
      subReconexion = 0;
      log.success(`Sub-bot ${phoneNumber} conectado.`);
      try {
        await ownerSock.sendMessage(ownerChatId, {
          text: `✅ Sub-bot *${phoneNumber}* vinculado y conectado correctamente.`,
        });
      } catch {}
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0;

      if ([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.multideviceMismatch].includes(reason)) {
        log.warn(`Sub-bot ${phoneNumber} desvinculado — eliminando sesión.`);
        delete subBots[phoneNumber];
        try { fs.rmSync(authFolder, { recursive: true, force: true }); } catch {}
        return;
      }

      subReconexion++;
      if (subReconexion > 10) {
        log.error(`Sub-bot ${phoneNumber}: demasiados reintentos, deteniendo.`);
        delete subBots[phoneNumber];
        return;
      }

      const delay = Math.min(3000 * subReconexion, 30000);
      setTimeout(() => {
        startSubBot(phoneNumber, ownerSock, ownerChatId, ownerMsg).catch((e) => {
          log.error(`Sub-bot ${phoneNumber} → ${e?.message || e}`);
        });
      }, delay);
    }
  });

  return subSock;
}

function stopSubBot(phoneNumber) {
  const entry = subBots[phoneNumber];
  if (!entry) return false;
  try { entry.sock.logout(); } catch {}
  try { entry.sock.end(undefined); } catch {}
  try { fs.rmSync(entry.authFolder, { recursive: true, force: true }); } catch {}
  delete subBots[phoneNumber];
  return true;
}

let opcion = "";
let phoneNumber = "";
const methodCodeQR = process.argv.includes("--qr");
const methodCode   = process.argv.includes("--code");

function chooseLinkMethod() {
  const credsPath = path.join(settings.baileys.authFolder, "creds.json");
  if (fs.existsSync(credsPath)) return; // ya hay sesión, no preguntar

  if (methodCodeQR) { opcion = "1"; return; }
  if (methodCode) {
    opcion = "2";
    console.log(chalk.bold.redBright(`\nIngresa tu número de WhatsApp (con código de país, ej: +18091234567)\n${chalk.bold.magentaBright("---> ")}`));
    phoneNumber = normalizePhone(readlineSync.question(""));
    return;
  }

  // Banner
  try {
    cfonts.say(settings.bot.name, { align: "center", gradient: ["magenta", "cyan"] });
    cfonts.say("WhatsApp Bot", { font: "console", align: "center", gradient: ["cyan", "blue"] });
  } catch {}

  opcion = readlineSync.question(
    chalk.bold.white("\n╔══════════════════════════════════════╗\n") +
    chalk.bold.white("║   Selecciona cómo vincular el bot:   ║\n") +
    chalk.bold.white("╠══════════════════════════════════════╣\n") +
    chalk.blueBright("║  1. 📷 Código QR                     ║\n") +
    chalk.cyan(      "║  2. 🔢 Código de texto (8 dígitos)   ║\n") +
    chalk.bold.white("╚══════════════════════════════════════╝\n") +
    chalk.bold.magentaBright("--> ")
  );
  while (!/^[1-2]$/.test(opcion)) {
    log.error("Opción inválida. Escribe 1 o 2.");
    opcion = readlineSync.question(chalk.bold.magentaBright("--> "));
  }
  if (opcion === "2") {
    console.log(chalk.bold.redBright(`\nIngresa tu número de WhatsApp (con código de país, ej: +18091234567)\n${chalk.bold.magentaBright("---> ")}`));
    phoneNumber = normalizePhone(readlineSync.question(""));
  }
}

chooseLinkMethod();

// ════════════════════════════════════════════════════════════
//   BOT PRINCIPAL
// ════════════════════════════════════════════════════════════
let reconexion    = 0;
let bootTime      = Date.now();
let botReady      = false;
let isRestarting  = false;
const retriesLimit = 15;

async function startBot() {
  if (isRestarting) return;
  isRestarting = true;
  bootTime = Date.now();

  const { state, saveCreds } = await useMultiFileAuthState(settings.baileys.authFolder);
  const { version } = await fetchLatestBaileysVersion();

  log.info(`Iniciando ${settings.bot.name} — Baileys ${version.join(".")}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
    browser: settings.baileys.browser,
    syncFullHistory: settings.baileys.syncFullHistory,
    markOnlineOnConnect: settings.baileys.markOnlineOnConnect,
    keepAliveIntervalMs: 25_000,
    shouldIgnoreJid: (jid) => jid.endsWith("@broadcast"),
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingCodeRequested = false;

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications }) => {
    if (qr) {
      if (opcion === "2" && !state.creds.registered && !pairingCodeRequested) {
        pairingCodeRequested = true;
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          const formatted = code.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n" + chalk.bold.white(chalk.bgMagenta("  🔢 Código de vinculación:  ")));
          console.log(chalk.bold.cyanBright(`\n  ${formatted}\n`));
          console.log(chalk.gray("  WhatsApp → Dispositivos vinculados → Vincular con número de teléfono\n"));
        } catch (err) {
          log.error(`Error al generar código: ${err?.message || err}`);
          log.warn("Reinicia el bot y elige la opción 1 (QR) como alternativa.");
        }
      } else if (opcion !== "2") {
        console.log(chalk.green.bold("\n📷 Escanea este QR con WhatsApp:\n"));
        qrcode.generate(qr, { small: true });
      }
    }

    if (isNewLogin)                   log.info("Nuevo dispositivo detectado.");
    if (receivedPendingNotifications) log.warn("Cargando mensajes pendientes, espera un momento...");

    if (connection === "open") {
      reconexion   = 0;
      isRestarting = false;
      botReady     = true;
      bootTime     = Date.now();
      log.success(`${settings.bot.name} conectado como ${sock.user?.name || sock.user?.id}`);
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0;
      isRestarting = false;

      if ([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.multideviceMismatch].includes(reason)) {
        log.warn(`Desvinculado (${reason}) — limpiando sesión...`);
        botReady = false;
        clearSession();
        process.exit(1);
      }
      if (reason === DisconnectReason.connectionReplaced) {
        log.warn("Conexión reemplazada — cerrá la otra sesión antes de reconectar.");
        return;
      }

      reconexion++;
      if (reconexion > retriesLimit) {
        log.error(`Demasiados reintentos (${retriesLimit}) — limpiando sesión corrupta...`);
        botReady = false;
        reconexion = 0;
        clearSession();
        process.exit(1);
      }

      const reasonMessages = {
        [DisconnectReason.connectionLost]:   "Se perdió la conexión.",
        [DisconnectReason.connectionClosed]: "Conexión cerrada.",
        [DisconnectReason.restartRequired]:  "Se requiere reinicio.",
        [DisconnectReason.timedOut]:         "Tiempo de conexión agotado.",
        [DisconnectReason.badSession]:       "Sesión inválida.",
      };
      const delay = Math.min(3000 * reconexion, 30000);
      log.warn(`${reasonMessages[reason] || `Desconexión (${reason})`} Reconectando en ${delay / 1000}s... (${reconexion}/${retriesLimit})`);
      setTimeout(startBot, delay);
    }
  });

  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      if (!id.endsWith("@g.us")) return;
      for (const participant of participants) {
        const tag = `@${participant.split("@")[0]}`;
        if (action === "add" && settings.groups?.welcome) {
          await sock.sendMessage(id, {
            text: `Bienvenido ${tag} al grupo. Esperamos que la pases bien.`,
            mentions: [participant],
          });
        }
        if ((action === "remove" || action === "leave") && settings.groups?.goodbye) {
          await sock.sendMessage(id, { text: `${tag} salio del grupo.`, mentions: [participant] });
        }
      }
    } catch (error) {
      console.error("Error en eventos de grupo:", error.message);
    }
  });

  sock.ev.on("messages.upsert", (payload) => handleMessages(sock, payload));
}

// ════════════════════════════════════════════════════════════
//   MANEJADOR DE MENSAJES — reutilizado por el bot principal
//   y por cualquier sub-bot vinculado con !code
// ════════════════════════════════════════════════════════════
async function handleMessages(sock, { messages, type }) {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body = getMessageText(msg).trim();
    const isImage = !!msg.message?.imageMessage;
    const quotedImageMessage = getQuotedImageMessage(msg);
    const quotedVideoMessage = getQuotedVideoMessage(msg);
    const quotedImage = !!quotedImageMessage;
    const isVideo = !!msg.message?.videoMessage;
    const quotedVideo = !!quotedVideoMessage;
    const owner1 = formatOwnerNumber(settings.bot.ownerNumber);
    const owner2 = formatOwnerNumber(settings.bot.secondaryOwnerNumber || "");
    const isGroup = from.endsWith("@g.us");

    // BUG FIX: en chats privados, msg.key.participant no existe
    // remoteJid es el JID del usuario directamente
    const sender = isGroup
      ? (msg.key.participant || msg.key.remoteJid)
      : msg.key.remoteJid;

    const senderIsOwner = isOwner(sender, settings);

    console.log(`Mensaje de ${from}: ${body}`);

    // ── XP automático por mensajes en grupos ──
    if (isGroup) addMessageXP(sender, from);

    // ── AFK: quita el estado AFK si el sender vuelve, y avisa si menciona/cita a un AFK ──
    try {
      await checkAfk(sock, msg, sender, from, getMentionedJid(msg), getQuotedParticipant(msg), economy);
    } catch (error) {
      console.error("Error en checkAfk:", error.message);
    }

    // ── Minijuego de matemáticas: revisa si el mensaje es la respuesta a un problema pendiente ──
    try {
      const answered = await checkMathAnswer(sock, msg, sender, from, body);
      if (answered) return;
    } catch (error) {
      console.error("Error en checkMathAnswer:", error.message);
    }

    // ── Anti-link ──
    if (isGroup && settings.groups?.antiLink && body.match(/https?:\/\/|chat\.whatsapp\.com\//i)) {
      try {
        const senderIsAdmin = await isAdmin(sock, from, sender, msg);
        const botIsAdmin = await isBotAdmin(sock, from);
        if (!senderIsAdmin && !senderIsOwner && botIsAdmin) {
          await sock.sendMessage(from, {
            text: `⛔ Enlaces no permitidos, @${sender.split("@")[0]}.`,
            mentions: [sender],
          });
          await sock.groupParticipantsUpdate(from, [sender], "remove");
          return;
        }
      } catch (error) {
        console.error("Error en anti-link:", error.message);
      }
    }

    if (!body.startsWith(settings.prefix)) return;

    const [rawCommand, ...args] = body.slice(settings.prefix.length).trim().split(" ");
    const command = (rawCommand || "").toLowerCase();
    const mappedReaction = COMMAND_ALIASES[command];

    if (mappedReaction) {
      await handleAnimeReaction(sock, msg, sender, from, mappedReaction);
      return;
    }

    switch (command) {

      // ── BÁSICOS ───────────────────────────────────────────────────────────────
      case "ping":
        await reactToMessage(sock, msg, "🏓");
        await sock.sendMessage(from, { text: "Pong!" });
        break;

      case "info":
        await reactToMessage(sock, msg, "ℹ️");
        await sock.sendMessage(from, {
          text: `*${settings.bot.name}*\nDevs: Jinn y Nevi\nContactos: ${owner1} / ${owner2}\nPrefijo: ${settings.prefix}`,
        });
        break;

      case "owner":
        await reactToMessage(sock, msg, "👑");
        await sock.sendMessage(from, {
          text: `*Owners del bot*\n\n1. Jinn: wa.me/${owner1}\n2. Nevi: wa.me/${owner2}`,
        });
        break;

      case "myid":
        await reactToMessage(sock, msg, "🆔");
        await sock.sendMessage(from, {
          text: `*Tu identificador detectado*\n\nJID completo: ${sender}\nNumero limpio: ${formatOwnerNumber(`${sender}`.split(":")[0])}`,
        });
        break;

      case "help":
      case "menu":
      case "ayuda":
        await reactToMessage(sock, msg, "📋");
        {
          const p = settings.prefix;
          const pkgVersion = require("./package.json").version || "1.0.0";
          const pushName = msg.pushName || "Usuario";
          const totalUsers = (() => {
            try { return Object.keys(economy.loadEconomy()).length; } catch { return 1; }
          })();

          const menuCaption =
              `> 𖧧 ¡Hola! *@${sender.split("@")[0]} 🙃*, Soy *${settings.bot.name}*, Aquí tienes la lista de comandos. *(˶ᵔ ᵕ ᵔ˶)*\n\n` +
              `╭┈ࠢ͜┅ࠦ͜͜╾݊͜─ؕ͜─ׄ͜─֬͜─֟͜─֫͜─ׄ͜─ؕ͜─݊͜┈ࠦ͜┅ࠡ͜͜┈࠭͜͜۰۰͜۰\n` +
              `│✿ *ᴅᴇᴠᴇʟᴏᴘᴇʀ ::* Jinn y Nevi\n` +
              `│ꕥ *ᴛʏᴘᴇ ::* ${senderIsOwner ? "Owner" : "Usuario"}\n` +
              `│⸙ *ᴠᴇʀsɪᴏɴ ::* ^${pkgVersion}\n` +
              `│⚘ *ᴘʀᴇғɪᴊᴏ ::* ${p}\n` +
              `│○ *ᴛɪᴍᴇ ::* ${formatMenuDate(new Date())}\n` +
              `│𓏸 *ᴜsᴇʀs ::* ${totalUsers}\n` +
              `╰ׅ┈ࠢ͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴ ⋱࣭ ᩴ  ⋮֔   ᩴ ⋰╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *ECONOMÍA* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos de Economía para ganar coins y divertirte con tus amigos.\n` +
              `ꕤ *${p}work » ${p}w*\n> Ganar coins trabajando.\n` +
              `ꕤ *${p}balance » ${p}bal » ${p}coins* + <mention>\n> Ver cuántos coins tienes.\n` +
              `ꕤ *${p}coinflip » ${p}flip » ${p}cf* + <cantidad / cara|cruz>\n> Apostar coins en un cara o cruz.\n` +
              `ꕤ *${p}crime*\n> Ganar coins rápido.\n` +
              `ꕤ *${p}daily*\n> Reclamar tu recompensa diaria (con racha).\n` +
              `ꕤ *${p}deposit » ${p}dep » ${p}depositar*\n> Depositar tus coins en el banco.\n` +
              `ꕤ *${p}economyboard » ${p}eboard » ${p}baltop* + <page>\n> Ver el ranking de usuarios con más coins.\n` +
              `ꕤ *${p}casino » ${p}apostar* + <cantidad>\n> Apostar coins en las tragamonedas.\n` +
              `ꕤ *${p}economyinfo » ${p}einfo*\n> Ver tu información de economía y salud.\n` +
              `ꕤ *${p}givecoins » ${p}pay » ${p}coinsgive* + <cantidad / mention>\n> Dar coins a un usuario.\n` +
              `ꕤ *${p}roulette » ${p}rt* + <cantidad / color>\n> Apostar coins en una ruleta.\n` +
              `ꕤ *${p}slut*\n> Ganar coins de forma arriesgada.\n` +
              `ꕤ *${p}steal » ${p}robar » ${p}rob* + <mention>\n> Intentar robar coins a un usuario.\n` +
              `ꕤ *${p}withdraw » ${p}with » ${p}retirar*\n> Retirar tus coins del banco.\n` +
              `ꕤ *${p}minar » ${p}mine*\n> Realizar trabajos de minería y ganar coins.\n` +
              `ꕤ *${p}cofre » ${p}coffer*\n> Reclamar tu cofre (cada 12h).\n` +
              `ꕤ *${p}monthly » ${p}mensual*\n> Reclamar tu recompensa mensual.\n` +
              `ꕤ *${p}aventura » ${p}adventure*\n> Ir de aventuras para ganar coins.\n` +
              `ꕤ *${p}curar » ${p}heal* + <mention>\n> Curar salud para salir de aventuras.\n` +
              `ꕤ *${p}cazar » ${p}hunt*\n> Cazar animales para ganar coins.\n` +
              `ꕤ *${p}fish » ${p}pescar*\n> Ganar coins pescando.\n` +
              `ꕤ *${p}mazmorra » ${p}dungeon*\n> Explorar mazmorras para ganar coins (mayor riesgo).\n` +
              `ꕤ *${p}invoke » ${p}ritual » ${p}invocar*\n> Hacer un ritual arriesgado (cuesta 100 coins).\n` +
              `ꕤ *${p}math* + <facil|medio|dificil|imposible|imposible2>\n> Iniciar un juego de matemáticas.\n` +
              `ꕤ *${p}ppt* + <piedra|papel|tijera>\n> Jugar piedra, papel o tijera con el bot y gana o pierde coins.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *GACHA* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos de Gacha para reclamar e intercambiar personajes.\n` +
              `ꕤ *${p}buycharacter » ${p}buychar » ${p}buyc* + <waifu>\n> Comprar un personaje en venta.\n` +
              `ꕤ *${p}charimage » ${p}waifuimage » ${p}cimage » ${p}wimage* + <waifu>\n> Ver una imagen aleatoria de un personaje.\n` +
              `ꕤ *${p}charinfo » ${p}winfo » ${p}waifuinfo* + <waifu>\n> Ver información de un personaje.\n` +
              `ꕤ *${p}claim » ${p}c » ${p}reclamar* + <cite / waifu>\n> Reclamar un personaje.\n` +
              `ꕤ *${p}delclaimmsg*\n> Restablecer el mensaje al reclamar un personaje.\n` +
              `ꕤ *${p}deletewaifu » ${p}delwaifu » ${p}delchar* + <waifu>\n> Eliminar un personaje reclamado.\n` +
              `ꕤ *${p}favoritetop » ${p}favtop*\n> Ver el top de personajes favoritos.\n` +
              `ꕤ *${p}gachainfo » ${p}ginfo » ${p}infogacha*\n> Ver tu información de gacha.\n` +
              `ꕤ *${p}giveallharem* + <mention>\n> Regalar todos tus personajes a otro usuario.\n` +
              `ꕤ *${p}givechar » ${p}givewaifu » ${p}regalar* + <waifu / mention>\n> Regalar un personaje a otro usuario.\n` +
              `ꕤ *${p}harem » ${p}waifus » ${p}claims* + <mention>\n> Ver tus personajes reclamados.\n` +
              `ꕤ *${p}haremshop » ${p}tiendawaifus » ${p}wshop* + <page>\n> Ver los personajes en venta.\n` +
              `ꕤ *${p}removesale » ${p}removerventa* + <waifu>\n> Eliminar un personaje en venta.\n` +
              `ꕤ *${p}robwaifu » ${p}robarwaifu* + <mention>\n> Intentar robar un personaje a otro usuario.\n` +
              `ꕤ *${p}rollwaifu » ${p}rw » ${p}roll*\n> Waifu o husbando aleatorio.\n` +
              `ꕤ *${p}sell » ${p}vender* + <valor> <waifu>\n> Poner un personaje a la venta.\n` +
              `ꕤ *${p}serieinfo » ${p}ainfo » ${p}animeinfo* + <nombre>\n> Información de un anime.\n` +
              `ꕤ *${p}serielist » ${p}slist » ${p}animelist*\n> Listar series del bot.\n` +
              `ꕤ *${p}setclaimmsg » ${p}setclaim* + <texto>\n> Modificar el mensaje al reclamar un personaje.\n` +
              `ꕤ *${p}trade » ${p}intercambiar* + <tu personaje / personaje 2>\n> Intercambiar un personaje con otro usuario.\n` +
              `ꕤ *${p}vote » ${p}votar* + <waifu>\n> Votar por un personaje para subir su valor.\n` +
              `ꕤ *${p}waifusboard » ${p}waifustop » ${p}topwaifus » ${p}wtop* + <page>\n> Ver el top de personajes con mayor valor.\n` +
              `ꕤ *${p}setfavourite » ${p}setfav* + <waifu>\n> Establecer tu claim favorito.\n` +
              `ꕤ *${p}deletefav » ${p}delfav* + <waifu>\n> Borrar tu claim favorito.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *DESCARGAS* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜\n` +
              `> ✐ Comandos de Descargas para descargar archivos de varias fuentes.\n` +
              `ꕤ *${p}play » ${p}mp3 » ${p}playaudio » ${p}ytaudio » ${p}ytmp3* + <url|búsqueda>\n> Descargar una canción de YouTube.\n` +
              `ꕤ *${p}ytmp4 » ${p}yt » ${p}mp4 » ${p}playvideo » ${p}ytvideo* + <url|búsqueda>\n> Descargar un vídeo de YouTube.\n` +
              `ꕤ *${p}pinterest » ${p}pin* + <url|búsqueda>\n> Buscar y descargar imágenes de Pinterest.\n` +
              `ꕤ *${p}ytsearch » ${p}search » ${p}yts* + <búsqueda>\n> Buscar videos de YouTube.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *PERFILES* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos de Perfil para ver y configurar tu perfil.\n` +
              `ꕤ *${p}profile » ${p}perfil* + <mention>\n> Ver tu perfil o el de un usuario.\n` +
              `ꕤ *${p}leaderboard » ${p}lboard » ${p}lb* + <page>\n> Top de usuarios con más experiencia.\n` +
              `ꕤ *${p}level » ${p}lvl* + <mention>\n> Ver tu nivel y experiencia actual.\n` +
              `ꕤ *${p}setgenre* + <hombre|mujer>\n> Establecer tu género.\n` +
              `ꕤ *${p}delgenre*\n> Eliminar tu género.\n` +
              `ꕤ *${p}setbirth* + <dia/mes/año>\n> Establecer tu fecha de cumpleaños.\n` +
              `ꕤ *${p}delbirth*\n> Borrar tu fecha de cumpleaños.\n` +
              `ꕤ *${p}setdescription » ${p}setdesc* + <texto>\n> Establecer tu descripción.\n` +
              `ꕤ *${p}deldescription » ${p}deldesc*\n> Eliminar tu descripción de perfil.\n` +
              `ꕤ *${p}marry » ${p}casarse* + <mention>\n> Casarte con alguien.\n` +
              `ꕤ *${p}divorce » ${p}divorciarse*\n> Divorciarte de tu pareja.\n` +
              `ꕤ *${p}setpasatiempo » ${p}sethobby* + <texto>\n> Establecer tu pasatiempo.\n` +
              `ꕤ *${p}delpasatiempo » ${p}delhobby*\n> Eliminar tu pasatiempo del perfil.\n` +
              `ꕤ *${p}afk* + <motivo>\n> Activar el modo ausente (AFK).\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *GRUPOS* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos para administradores de grupos.\n` +
              `ꕤ *${p}tagall*\n> Menciona a todos en el grupo.\n` +
              `ꕤ *${p}abrir » ${p}open*\n> Abre el grupo para que todos puedan escribir.\n` +
              `ꕤ *${p}cerrar » ${p}close*\n> Cierra el grupo para solo administradores.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *ANIME* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos de reacciones de Anime.\n` +
              `ꕤ *${p}waifu » ${p}neko*\n> Buscar una waifu aleatoria.\n` +
              `ꕤ *${p}ppcouple » ${p}ppcp*\n> Generar imágenes para amistades o parejas.\n` +
              `ꕤ *${p}hug » ${p}abrazar*, *${p}kiss » ${p}muak*, *${p}pat*, *${p}slap*, *${p}cry » ${p}llorar*, *${p}dance » ${p}bailar*, *${p}lick » ${p}lamer*, *${p}bite » ${p}morder*, *${p}blush*, *${p}bonk* + <mention>\n` +
              `ꕤ *${p}cuddle » ${p}acurrucar*, *${p}kill » ${p}matar*, *${p}wave » ${p}saludar*, *${p}wink*, *${p}smile » ${p}sonreir*, *${p}sad » ${p}triste*, *${p}happy » ${p}feliz*, *${p}angry » ${p}enojado*, *${p}shy » ${p}timido*, *${p}run » ${p}correr*, *${p}eat » ${p}comer* + <mention>\n` +
              `ꕤ *${p}blowkiss » ${p}besito*, *${p}handhold » ${p}tomar*, *${p}highfive » ${p}chocar*, *${p}punch » ${p}golpear*, *${p}stare » ${p}mirar*, *${p}tickle » ${p}cosquillas*, *${p}comfort » ${p}consolar* + <mention>\n` +
              `ꕤ *${p}bleh » ${p}meh*, *${p}bored » ${p}aburrido*, *${p}clap » ${p}aplaudir*, *${p}laugh » ${p}reir*, *${p}nope*, *${p}pout » ${p}mueca*, *${p}sleep » ${p}dormir*, *${p}smug » ${p}presumir*, *${p}think » ${p}pensar*\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *GENERAL* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜\n` +
              `> ✐ Comandos generales del bot.\n` +
              `ꕤ *${p}ping*\n> Medir tiempo de respuesta del bot.\n` +
              `ꕤ *${p}info*\n> Muestra información del bot.\n` +
              `ꕤ *${p}owner*\n> Muestra los owners del bot.\n` +
              `ꕤ *${p}myid*\n> Muestra el número que detecta el bot.\n` +
              `ꕤ *${p}help » ${p}menu » ${p}ayuda*\n> Muestra esta lista de comandos.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ\n\n` +

              `╭┈ࠢ͜─ׄ֟፝͜─ׄ͜─ׄ͜╴𐔌 *OWNER* 𐦯╶͜─ׄ͜─ׄ֟፝͜─ׄ͜─ׄ͜\n` +
              `> ✐ Comandos exclusivos para los dueños del bot.\n` +
              `ꕤ *${p}estado*\n> Muestra el estado del bot.\n` +
              `ꕤ *${p}broadcast » ${p}bc* + <mensaje>\n> Envía un mensaje a los chats del bot.\n` +
              `ꕤ *${p}setprefix* + <valor>\n> Cambia el prefijo del bot.\n` +
              `ꕤ *${p}restart » ${p}reiniciar*\n> Reinicia el bot.\n` +
              `ꕤ *${p}update » ${p}fix*\n> Actualiza el bot con \`git pull\`.\n` +
              `ꕤ *${p}code » ${p}vincular* + <número>\n> Generar código de vinculación para un sub-bot.\n` +
              `ꕤ *${p}exec » ${p}ex » ${p}e* + <código>\n> Ejecuta código JavaScript en el bot.\n` +
              `ꕤ *${p}shell » ${p}r* + <comando>\n> Ejecuta un comando en la terminal del servidor.\n` +
              `╰ׅ͜─֟͜─͜─ٞ͜─͜─๊͜─͜─๋͜─⃔═̶፝֟͜═̶⃔─๋͜─͜─͜─๊͜─ٞ͜─͜─֟͜┈ࠢ͜╯ׅ`;

          try {
            const menuVideo = fs.readFileSync(path.join(__dirname, "menu.mp4"));
            await sock.sendMessage(from, {
              video: menuVideo,
              mimetype: "video/mp4",
              caption: menuCaption,
              mentions: [sender],
            });
          } catch (error) {
            console.error("No se pudo enviar menu.mp4:", error.message);
            await sock.sendMessage(from, { text: menuCaption, mentions: [sender] });
          }
        }
        break;

      // ── OWNER ─────────────────────────────────────────────────────────────────
      case "code":
      case "codigo":
      case "vincular": {
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }

        const phoneArg = args[0]?.replace(/[^0-9]/g, "");
        if (!phoneArg || phoneArg.length < 7) {
          await sock.sendMessage(from, {
            text:
              `📱 *Vincular Sub-Bot*\n\n` +
              `Usa: *${settings.prefix}code <número>*\n` +
              `Ej: *${settings.prefix}code 18091234567*\n\n` +
              `> ○ El número debe incluir el código de país sin + ni espacios.`,
          }, { quoted: msg });
          break;
        }

        if (subBots[phoneArg]) {
          await sock.sendMessage(from, {
            text:
              `⚠️ Ya hay un sub-bot activo o en proceso para *${phoneArg}*.\n` +
              `Usa *${settings.prefix}unlink ${phoneArg}* para eliminarlo primero.`,
          }, { quoted: msg });
          break;
        }

        await reactToMessage(sock, msg, "🔢");
        try {
          await startSubBot(phoneArg, sock, from, msg);
        } catch (error) {
          await sock.sendMessage(from, {
            text: `❌ No se pudo iniciar el sub-bot.\n> ${error?.message || "Error desconocido"}`,
          }, { quoted: msg });
        }
        break;
      }

      case "unlink":
      case "desvincular": {
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }

        const phoneArg = args[0]?.replace(/[^0-9]/g, "");
        if (!phoneArg) {
          await sock.sendMessage(from, { text: `Usa: *${settings.prefix}unlink <número>*` }, { quoted: msg });
          break;
        }
        const removed = stopSubBot(phoneArg);
        await sock.sendMessage(from, {
          text: removed ? `✅ Sub-bot *${phoneArg}* desvinculado.` : `⚠️ No había ningún sub-bot activo para *${phoneArg}*.`,
        }, { quoted: msg });
        break;
      }

      case "sublist":
      case "sublista": {
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }

        const nums = Object.keys(subBots);
        if (!nums.length) {
          await sock.sendMessage(from, { text: "No hay sub-bots activos." }, { quoted: msg });
          break;
        }
        const list = nums.map((n) => `• ${n} — ${subBots[n].connected ? "🟢 conectado" : "🟡 vinculando..."}`).join("\n");
        await sock.sendMessage(from, { text: `*Sub-bots activos:*\n${list}` }, { quoted: msg });
        break;
      }

      case "estado":
        await reactToMessage(sock, msg, "📊");
        await sock.sendMessage(from, {
          text:
            `*Estado del bot*\n\n` +
            `Nombre: ${settings.bot.name}\n` +
            `Prefijo: ${settings.prefix}\n` +
            `Grupos: ${settings.groups ? "activo" : "inactivo"}\n` +
            `Owner mode: ${settings.owner?.allowOnlyOwnersCommands ? "activo" : "inactivo"}`,
        });
        break;

      case "broadcast":
      case "bc":
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        if (!args.length) { await sock.sendMessage(from, { text: `Usa *${settings.prefix}broadcast mensaje*` }); break; }
        await reactToMessage(sock, msg, "📢");
        try {
          const textToSend = `*Broadcast del bot*\n\n${args.join(" ")}`;
          // BUG FIX: sock.store no siempre existe; usar el store de Baileys correctamente
          const chatsMap = sock.store?.chats?.all?.() || [];
          const chats = Array.isArray(chatsMap)
            ? chatsMap.map(c => c.id)
            : Object.keys(sock.store?.chats || {});
          if (!chats.length) {
            await sock.sendMessage(from, { text: "No hay chats disponibles para el broadcast." });
            break;
          }
          let sent = 0;
          for (const jid of chats) {
            try { await sock.sendMessage(jid, { text: textToSend }); sent++; } catch {}
          }
          await sock.sendMessage(from, { text: `Broadcast enviado a ${sent} chats.` });
        } catch (error) {
          console.error("Error en broadcast:", error.message);
          await sock.sendMessage(from, { text: "No pude enviar el broadcast." });
        }
        break;

      case "setprefix":
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        await reactToMessage(sock, msg, "⚙️");
        await sock.sendMessage(from, { text: "El prefijo se cambia en settings.js o en el .env usando BOT_PREFIX." });
        break;

      case "restart":
      case "reiniciar":
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        await reactToMessage(sock, msg, "♻️");
        await sock.sendMessage(from, { text: "✎ Reiniciando el bot...\n> *Espere un momento...*" });
        setTimeout(() => process.exit(0), 1500);
        break;

      // ⚠️ Ejecuta código JavaScript en el proceso del bot. Solo para el owner: equivale a control total del servidor.
      case "exec":
      case "ex":
      case "e": {
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        const codeText = args.join(" ");
        if (!codeText.trim()) {
          await sock.sendMessage(from, { text: "Debes escribir código a ejecutar. Ej: *!e 1+1*" });
          break;
        }
        await reactToMessage(sock, msg, "🕒");
        try {
          const isExpr = command === "e";
          const wrapped = isExpr ? `return (${codeText})` : codeText;
          const fn = new Function(
            "sock", "msg", "from", "sender", "args", "settings", "economy", "require", "process",
            `return (async () => { ${wrapped} })();`
          );
          const result = await fn(sock, msg, from, sender, args, settings, economy, require, process);
          await reactToMessage(sock, msg, "✔️");
          const out = typeof result === "string" ? result : util.inspect(result, { depth: 1 });
          await sock.sendMessage(from, { text: out.slice(0, 4000) || "✅ Ejecutado sin valor de retorno." }, { quoted: msg });
        } catch (error) {
          await reactToMessage(sock, msg, "✖️");
          await sock.sendMessage(from, { text: `❌ Error:\n${String(error?.stack || error).slice(0, 4000)}` }, { quoted: msg });
        }
        break;
      }

      // ⚠️ Ejecuta comandos directamente en la terminal del servidor. Solo para el owner.
      case "shell":
      case "r": {
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        const shellCmd = args.join(" ");
        if (!shellCmd.trim()) {
          await sock.sendMessage(from, { text: "Debes escribir un comando a ejecutar. Ej: *!shell ls*" });
          break;
        }
        await reactToMessage(sock, msg, "🕒");
        try {
          const { stdout, stderr } = await execPromise(shellCmd, { timeout: 30000 });
          await reactToMessage(sock, msg, "✔️");
          const out = (stdout?.trim() ? stdout : "") + (stderr?.trim() ? `\n${stderr}` : "");
          await sock.sendMessage(from, { text: out.trim().slice(0, 4000) || "✅ Comando ejecutado sin salida." }, { quoted: msg });
        } catch (error) {
          await reactToMessage(sock, msg, "✖️");
          await sock.sendMessage(from, { text: `❌ Error:\n${String(error?.stderr || error?.message || error).slice(0, 4000)}` }, { quoted: msg });
        }
        break;
      }

      case "update":
      case "fix":
        if (!senderIsOwner) { await sock.sendMessage(from, { text: "Este comando es solo para owners." }); break; }
        await reactToMessage(sock, msg, "🔄");
        try {
          const { stdout, stderr } = await execPromise("git pull", { cwd: __dirname, timeout: 60000 });
          const out = stdout?.trim() || "";
          let replyMsg;
          if (out.includes("Already up to date")) {
            replyMsg = "ꕥ *Estado:* Todo está actualizado.";
          } else {
            replyMsg = `*Actualización completada*\n\n${out}${stderr ? `\n${stderr}` : ""}\n\n_Usa !restart para aplicar los cambios._`;
          }
          await sock.sendMessage(from, { text: replyMsg });
        } catch (error) {
          await sock.sendMessage(from, {
            text: `❌ No se pudo actualizar (¿el bot está en un repositorio git?):\n${String(error?.stderr || error?.message || error).slice(0, 2000)}`,
          });
        }
        break;

      // ── STICKER ───────────────────────────────────────────────────────────────
      case "sticker":
      case "s":
        try {
          let targetMessage = msg;
          let stickerBuffer;

          if (!isImage && quotedImage) {
            targetMessage = { key: msg.key, message: { imageMessage: quotedImageMessage } };
          }
          if (!isVideo && quotedVideo) {
            targetMessage = { key: msg.key, message: { videoMessage: quotedVideoMessage } };
          }

          if (!isImage && !quotedImage && !isVideo && !quotedVideo) {
            await sock.sendMessage(from, { text: `Envía o responde a una imagen/video con *${settings.prefix}sticker*.` });
            break;
          }

          await reactToMessage(sock, msg, "🖼️");
          await sock.sendMessage(from, { text: "Creando sticker..." });

          if (isVideo || quotedVideo) {
            stickerBuffer = await createStickerFromVideo(targetMessage);
          } else {
            stickerBuffer = await createStickerFromImage(targetMessage);
          }

          await sock.sendMessage(from, { sticker: stickerBuffer });
          await reactToMessage(sock, msg, "✅");
        } catch (error) {
          console.error("Error creando sticker:", error.message);
          await sock.sendMessage(from, { text: "No pude crear el sticker. Intenta con otra imagen o video corto." });
        }
        break;

      // ── GRUPOS ────────────────────────────────────────────────────────────────
      case "tagall":
        if (!isGroup) { await sock.sendMessage(from, { text: "Este comando solo funciona en grupos." }); break; }
        try {
          const senderIsAdmin = await isAdmin(sock, from, sender, msg);
          if (!senderIsAdmin && !senderIsOwner) {
            await sock.sendMessage(from, { text: "Solo los admins pueden usar este comando." });
            break;
          }
          await reactToMessage(sock, msg, "📢");
          const metadata = await sock.groupMetadata(from);
          const mentions = metadata.participants.map((p) => p.id);
          const text = metadata.participants.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");
          await sock.sendMessage(from, { text: `*Mención a todos*\n\n${text}`, mentions });
        } catch (error) {
          console.error("Error en tagall:", error.message);
          await sock.sendMessage(from, { text: "No pude ejecutar tagall." });
        }
        break;

      case "abrir":
      case "open":
        if (!isGroup) { await sock.sendMessage(from, { text: "Este comando solo funciona en grupos." }); break; }
        try {
          const senderIsAdmin = await isAdmin(sock, from, sender, msg);
          if (!senderIsAdmin && !senderIsOwner) { await sock.sendMessage(from, { text: "❌ Solo los admins pueden abrir el grupo." }); break; }
          const botIsAdmin = await isBotAdmin(sock, from);
          if (!botIsAdmin) { await sock.sendMessage(from, { text: "❌ El bot necesita ser admin para hacer esto." }); break; }
          await sock.groupSettingUpdate(from, "not_announcement");
          await reactToMessage(sock, msg, "🔓");
          await sock.sendMessage(from, { text: "🔓 *Grupo abierto.* Todos pueden enviar mensajes." });
        } catch (error) {
          console.error("Error al abrir grupo:", error.message);
          await sock.sendMessage(from, { text: "❌ No pude abrir el grupo." });
        }
        break;

      case "cerrar":
      case "close":
        if (!isGroup) { await sock.sendMessage(from, { text: "Este comando solo funciona en grupos." }); break; }
        try {
          const senderIsAdmin = await isAdmin(sock, from, sender, msg);
          if (!senderIsAdmin && !senderIsOwner) { await sock.sendMessage(from, { text: "❌ Solo los admins pueden cerrar el grupo." }); break; }
          const botIsAdmin = await isBotAdmin(sock, from);
          if (!botIsAdmin) { await sock.sendMessage(from, { text: "❌ El bot necesita ser admin para hacer esto." }); break; }
          await sock.groupSettingUpdate(from, "announcement");
          await reactToMessage(sock, msg, "🔒");
          await sock.sendMessage(from, { text: "🔒 *Grupo cerrado.* Solo los admins pueden enviar mensajes." });
        } catch (error) {
          console.error("Error al cerrar grupo:", error.message);
          await sock.sendMessage(from, { text: "❌ No pude cerrar el grupo." });
        }
        break;

      // ── ANIME / IMÁGENES ──────────────────────────────────────────────────────
      case "waifu":
      case "neko": {
        const emoji = command === "waifu" ? "💕" : "🐱";
        await reactToMessage(sock, msg, emoji);
        const mediaUrl = await fetchWaifuPics(command);
        await sendReactionMedia(sock, from, mediaUrl, `${emoji} Aquí tienes un ${command} aleatorio.`, [sender]);
        break;
      }

      case "ppcouple":
      case "ppcp": {
        await reactToMessage(sock, msg, "💞");
        const pair = await fetchPPCouple();
        if (!pair) { await sock.sendMessage(from, { text: "No pude obtener las imágenes. Intenta de nuevo." }); break; }
        await sendReactionMedia(sock, from, pair.cowo, "💞 *Masculino* ♂", [sender]);
        await sendReactionMedia(sock, from, pair.cewe, "💞 *Femenina* ♀", [sender]);
        break;
      }

      // ── YOUTUBE ───────────────────────────────────────────────────────────────
      case "ytmp4":
      case "yt":
      case "mp4":
      case "playvideo":
      case "ytvideo":
        await handleYtMp4(sock, from, msg, args.join(" "));
        break;

      case "ytmp3":
      case "mp3":
      case "play":
      case "ytaudio":
      case "playaudio":
        await handleYtMp3(sock, from, msg, args.join(" "));
        break;

      case "ytsearch":
      case "yts":
      case "search":
        await handleYtSearch(sock, from, msg, args.join(" "));
        break;

      // ── PINTEREST ─────────────────────────────────────────────────────────────
      case "pinterest":
      case "pin":
        await handlePinterest(sock, from, msg, args.join(" "));
        break;

      // ── ECONOMÍA ──────────────────────────────────────────────────────────────
      case "balance":
      case "bal":
      case "coins": {
        const target = getMentionedJid(msg);
        await cmdBalance(sock, from, sender, target);
        break;
      }

      case "daily":
        await cmdDaily(sock, from, sender);
        break;

      case "work":
      case "w":
        await cmdWork(sock, from, sender);
        break;

      case "crime":
        await cmdCrime(sock, from, sender);
        break;

      case "slut":
        await cmdSlut(sock, from, sender);
        break;

      case "deposit":
      case "dep":
      case "depositar":
        await cmdDeposit(sock, from, sender, args[0]);
        break;

      case "withdraw":
      case "with":
      case "retirar":
        await cmdWithdraw(sock, from, sender, args[0]);
        break;

      case "givecoins":
      case "pay":
      case "coinsgive": {
        const target = getMentionedJid(msg);
        // BUG FIX: la cantidad puede venir en args[0] si no hay @ como arg[0]
        const amount = args.find(a => !a.startsWith("@")) || args[1] || args[0];
        await cmdGiveCoins(sock, from, sender, target, amount);
        break;
      }

      case "coinflip":
      case "flip":
      case "cf":
        await cmdCoinFlip(sock, from, sender, args[0], args[1]);
        break;

      case "roulette":
      case "rt":
        await cmdRoulette(sock, from, sender, args[0], args[1]);
        break;

      case "steal":
      case "robar":
      case "rob": {
        const target = getMentionedJid(msg);
        await cmdSteal(sock, from, sender, target);
        break;
      }

      case "economyboard":
      case "eboard":
      case "baltop":
        await cmdEconomyBoard(sock, from, parseInt(args[0]) || 1);
        break;

      case "economyinfo":
      case "einfo":
        await cmdEconomyInfo(sock, from, sender);
        break;

      case "monthly":
      case "mensual":
        await cmdMonthly(sock, from, sender);
        break;

      case "cofre":
      case "coffer":
        await cmdCoffer(sock, from, sender);
        break;

      case "casino":
      case "apostar":
        await cmdCasino(sock, from, sender, args[0]);
        break;

      case "ppt":
        await cmdPPT(sock, from, sender, args[0], args[1]);
        break;

      case "adventure":
      case "aventura":
        await cmdAdventure(sock, from, sender);
        break;

      case "dungeon":
      case "mazmorra":
        await cmdDungeon(sock, from, sender);
        break;

      case "hunt":
      case "cazar":
        await cmdHunt(sock, from, sender);
        break;

      case "fish":
      case "pescar":
        await cmdFish(sock, from, sender);
        break;

      case "mine":
      case "minar":
        await cmdMine(sock, from, sender);
        break;

      case "invoke":
      case "ritual":
      case "invocar":
        await cmdInvoke(sock, from, sender);
        break;

      case "heal":
      case "curar":
      case "pocion":
      case "potion": {
        const target = getMentionedJid(msg);
        await cmdHeal(sock, from, sender, target);
        break;
      }

      case "math":
        await cmdMath(sock, from, sender, args);
        break;

      // ── GACHA ─────────────────────────────────────────────────────────────────
      case "rollwaifu":
      case "rw":
      case "roll":
        await cmdRollWaifu(sock, msg, sender, from, economy);
        break;

      case "claim":
      case "c":
      case "reclamar":
        await cmdClaim(sock, msg, sender, from, args);
        break;

      case "harem":
      case "waifus":
      case "claims": {
        const mention = getMentionedJid(msg);
        await cmdHarem(sock, msg, sender, from, args, mention);
        break;
      }

      case "charinfo":
      case "winfo":
      case "waifuinfo":
        await cmdCharInfo(sock, msg, from, args);
        break;

      case "delwaifu":
      case "delchar":
      case "deletewaifu":
        await cmdDeleteWaifu(sock, msg, sender, from, args);
        break;

      case "givechar":
      case "givewaifu":
      case "regalar": {
        const mention = getMentionedJid(msg);
        await cmdGiveChar(sock, msg, sender, from, args, mention);
        break;
      }

      case "trade":
      case "intercambiar": {
        const mention = getMentionedJid(msg);
        await cmdTrade(sock, msg, sender, from, args, mention);
        break;
      }

      case "setfav":
      case "setfavourite":
        await cmdSetFav(sock, msg, sender, from, args);
        break;

      case "delfav":
      case "deletefav":
        await cmdDelFav(sock, msg, sender, from);
        break;

      case "vote":
      case "votar":
        await cmdVote(sock, msg, sender, from, args);
        break;

      case "waifustop":
      case "waifusboard":
      case "topwaifus":
      case "wtop":
        await cmdWaifusTop(sock, msg, from, args);
        break;

      case "favoritetop":
      case "favtop":
        await cmdFavTop(sock, msg, from);
        break;

      case "serielist":
      case "slist":
      case "animelist":
        await cmdSerieList(sock, msg, from);
        break;

      case "serieinfo":
      case "ainfo":
      case "animeinfo":
        await cmdSerieInfo(sock, msg, from, args);
        break;

      case "gachainfo":
      case "ginfo":
      case "infogacha":
        await cmdGachaInfo(sock, msg, sender, from);
        break;

      case "setclaimmsg":
      case "setclaim":
        await cmdSetClaimMsg(sock, msg, sender, from, args);
        break;

      case "delclaimmsg":
        await cmdDelClaimMsg(sock, msg, sender, from);
        break;

      case "haremshop":
      case "tiendawaifus":
      case "wshop":
        await cmdHaremShop(sock, msg, from, args);
        break;

      case "sell":
      case "vender":
        await cmdSell(sock, msg, sender, from, args);
        break;

      case "buycharacter":
      case "buychar":
      case "buyc":
        await cmdBuyChar(sock, msg, sender, from, args, economy);
        break;

      case "removesale":
      case "removerventa":
        await cmdRemoveSale(sock, msg, sender, from, args);
        break;

      case "charimage":
      case "waifuimage":
      case "cimage":
      case "wimage":
        await cmdCharImage(sock, msg, from, args);
        break;

      case "giveallharem": {
        const mention = getMentionedJid(msg);
        await cmdGiveAllHarem(sock, msg, sender, from, mention);
        break;
      }

      case "robwaifu":
      case "robarwaifu": {
        const mention = getMentionedJid(msg);
        await cmdRobWaifu(sock, msg, sender, from, mention);
        break;
      }

      // ── PERFILES ──────────────────────────────────────────────────────────────
      case "profile":
      case "perfil": {
        const mention = getMentionedJid(msg);
        await cmdProfile(sock, msg, sender, from, mention, gacha, economy);
        break;
      }

      case "level":
      case "lvl": {
        const mention = getMentionedJid(msg);
        await cmdLevel(sock, msg, sender, from, mention);
        break;
      }

      case "leaderboard":
      case "lboard":
      case "lb":
        await cmdLeaderboard(sock, msg, from, args);
        break;

      case "setdescription":
      case "setdesc":
        await cmdSetDescription(sock, msg, sender, from, args);
        break;

      case "deldescription":
      case "deldesc":
        await cmdDelDescription(sock, msg, sender, from);
        break;

      case "setgenre":
        await cmdSetGenre(sock, msg, sender, from, args);
        break;

      case "delgenre":
        await cmdDelGenre(sock, msg, sender, from);
        break;

      case "setbirth":
        await cmdSetBirthday(sock, msg, sender, from, args);
        break;

      case "delbirth":
        await cmdDelBirthday(sock, msg, sender, from);
        break;

      case "sethobby":
      case "setpasatiempo":
        await cmdSetHobby(sock, msg, sender, from, args);
        break;

      case "delhobby":
      case "delpasatiempo":
        await cmdDelHobby(sock, msg, sender, from);
        break;

      case "afk":
        await cmdAfk(sock, msg, sender, from, args);
        break;

      case "marry":
      case "casarse": {
        const mention = getMentionedJid(msg);
        await cmdMarry(sock, msg, sender, from, mention);
        break;
      }

      case "divorce":
      case "divorciarse":
        await cmdDivorce(sock, msg, sender, from);
        break;

      default:
        // BUG FIX: no responder "comando desconocido" a mensajes normales
        // Solo responder si el body claramente tenía el prefijo
        await sock.sendMessage(from, {
          text: `❓ Comando desconocido. Usa *${settings.prefix}help* para ver los comandos disponibles.`,
        });
        break;
    }
}

module.exports = { startBot };
