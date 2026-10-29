
/**
 * 📂 plugins/fortuna.js
 * 🥠 WHATSAPP-BOT — GALLETA DE LA FORTUNA
 *
 * Características:
 * - Imagen y texto en un solo mensaje.
 * - 40% fortuna rara.
 * - 40% fortuna normal.
 * - 20% fortuna mala.
 * - Evita repetir frases hasta agotar cada categoría.
 * - Guarda las frases utilizadas en un JSON.
 * - Descarga la imagen con timeout y respaldo local.
 * - Compatible con handlers ES Modules.
 */

import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'fortunas.json')
const IMAGE_URL = 'https://files.catbox.moe/xli6lh.jpg'
const IMAGE_CACHE = path.join(DIR, 'fortuna.jpg')
const IMAGE_TIMEOUT = 12000
const MAX_IMAGE_SIZE = 8 * 1024 * 1024

// ============================================================
// 📁 PREPARAR CARPETA
// ============================================================

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true })
}

// ============================================================
// 🥠 FORTUNAS
// ============================================================

const normales = [
  'Algo bueno está por llegar a tu vida.',
  'Hoy es un gran día para intentar algo nuevo.',
  'Una sorpresa agradable te espera pronto.',
  'Confía en tu intuición, no fallará.',
  'Tu esfuerzo dará frutos antes de lo que crees.',
  'La suerte favorece a los valientes.',
  'Hoy recibirás buenas noticias.',
  'La paciencia será tu mejor aliada.',
  'Alguien piensa mucho en ti.',
  'Un cambio positivo está en camino.'
]

const raras = [
  '🍀 Tendrás un golpe de suerte inesperado.',
  '💎 Una oportunidad única aparecerá muy pronto.',
  '✨ El universo conspira fuertemente a tu favor.',
  '🔥 Hoy atraerás algo que deseas mucho.',
  '🌟 Un sueño importante comenzará a cumplirse.',
  '👑 Tendrás reconocimiento de alguien importante.',
  '🚀 Un avance rápido llegará a tu vida.',
  '💰 Algo relacionado al dinero mejorará.',
  '🧭 Tomarás una decisión que cambiará tu futuro.',
  '🎯 Lograrás algo que creías imposible.'
]

const malas = [
  '💀 Hoy no es tu día… pero mañana puede ser peor.',
  '🥲 Una siesta habría sido mejor idea.',
  '😿 Algo saldrá mal… pero será gracioso después.',
  '🍞 Cuidado con lo que comes hoy.',
  '📉 Tus planes pueden fallar… improvisa.',
  '🐌 Tendrás un día lento y extraño.',
  '🌧️ Mejor evita discusiones hoy.',
  '🤡 Harás algo vergonzoso sin querer.',
  '📱 Alguien te ignorará hoy.',
  '🪫 Tu energía estará baja… descansa.'
]

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function loadDB() {
  const inicial = {
    usadas: [],
    usadasRaras: [],
    usadasMalas: []
  }

  try {
    if (!fs.existsSync(FILE)) return inicial

    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

    for (const key of Object.keys(inicial)) {
      if (!Array.isArray(data[key])) data[key] = []
    }

    return data
  } catch (error) {
    console.error('[FORTUNA] Error leyendo JSON:', error.message)
    return inicial
  }
}

function saveDB(db) {
  try {
    const temporal = `${FILE}.tmp`

    fs.writeFileSync(
      temporal,
      JSON.stringify(db, null, 2),
      'utf8'
    )

    fs.renameSync(temporal, FILE)
  } catch (error) {
    console.error('[FORTUNA] Error guardando JSON:', error.message)
  }
}

// ============================================================
// 🔮 ELEGIR FRASE SIN REPETIR
// ============================================================

function obtenerFrase(lista, clave, db) {
  if (!Array.isArray(db[clave])) db[clave] = []

  const usadas = new Set(db[clave])
  let disponibles = lista.filter(frase => !usadas.has(frase))

  if (disponibles.length === 0) {
    db[clave] = []
    disponibles = [...lista]
  }

  const indice = Math.floor(Math.random() * disponibles.length)
  const frase = disponibles[indice]

  db[clave].push(frase)

  return frase
}

// ============================================================
// 🖼️ PREPARAR IMAGEN
// Intenta descargarla y guardar una copia local.
// Si falla, utiliza la URL directamente.
// ============================================================

async function descargarImagen() {
  if (
    fs.existsSync(IMAGE_CACHE) &&
    fs.statSync(IMAGE_CACHE).size > 0
  ) {
    return IMAGE_CACHE
  }

  if (typeof fetch !== 'function') {
    throw new Error('Este Node.js no dispone de fetch global.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    IMAGE_TIMEOUT
  )

  try {
    const response = await fetch(IMAGE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 WhatsApp-Bot'
      }
    })

    if (!response.ok) {
      throw new Error(`Catbox respondió HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''

    if (!contentType.startsWith('image/')) {
      throw new Error('La URL no devolvió un archivo de imagen.')
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) {
      throw new Error('La imagen está vacía o supera el tamaño permitido.')
    }

    fs.writeFileSync(IMAGE_CACHE, buffer)

    console.log('[FORTUNA] Imagen guardada en caché.')
    return IMAGE_CACHE
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================================
// 🎲 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, { conn }) => {
  try {
    const db = loadDB()
    const rand = Math.random()

    let frase
    let tipo

    if (rand < 0.40) {
      tipo = '🍀 FORTUNA RARA'
      frase = obtenerFrase(raras, 'usadasRaras', db)
    } else if (rand < 0.80) {
      tipo = '🥠 FORTUNA NORMAL'
      frase = obtenerFrase(normales, 'usadas', db)
    } else {
      tipo = '💀 FORTUNA MALA'
      frase = obtenerFrase(malas, 'usadasMalas', db)
    }

    saveDB(db)

    const texto = `${tipo}

╭━━━━━━━━━━━━━━━━━━╮
┃ 🔮 *Mensaje del destino*
┃
┃ ${frase}
╰━━━━━━━━━━━━━━━━━━╯

✨ El destino ha hablado... 🥠`

    // Intentar preparar la imagen.
    // La fortuna se envía una sola vez, con imagen y texto juntos.
    let imagen

    try {
      imagen = await descargarImagen()
    } catch (error) {
      console.error(
        '[FORTUNA] No se pudo descargar la imagen:',
        error.message
      )
    }

    // Primero se intenta enviar la imagen descargada.
    // Si no está disponible, se intenta con la URL original.
    if (imagen) {
      await conn.sendMessage(
        m.chat,
        {
          image: fs.readFileSync(imagen),
          caption: texto
        },
        { quoted: m }
      )

      console.log(`[FORTUNA] ${tipo} enviada con imagen local.`)
      return
    }

    // Respaldo: URL directa, siempre con el texto en el mismo mensaje.
    await conn.sendMessage(
      m.chat,
      {
        image: { url: IMAGE_URL },
        caption: texto
      },
      { quoted: m }
    )

    console.log(`[FORTUNA] ${tipo} enviada con imagen por URL.`)

  } catch (error) {
    console.error(
      '[FORTUNA] Error enviando la fortuna:',
      error
    )

    // No mandar otro mensaje con el texto automáticamente:
    // evita duplicados si WhatsApp recibió el mensaje pero falló la respuesta.
    try {
      await m.reply(
        '❌ No se pudo enviar la fortuna. Revisá la consola e intentá nuevamente. 🥠'
      )
    } catch (replyError) {
      console.error(
        '[FORTUNA] Error enviando aviso:',
        replyError.message
      )
    }
  }
}

handler.help = ['fortuna']
handler.tags = ['fun']
handler.command = ['fortuna']

export default handler
