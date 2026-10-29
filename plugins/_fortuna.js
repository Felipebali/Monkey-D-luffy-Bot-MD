
/**
 * 📂 plugins/fortuna.js
 * 🥠 WHATSAPP-BOT — GALLETA DE LA FORTUNA
 */

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'fortunas.json')

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

function loadDB() {
  try {
    if (!fs.existsSync(file)) {
      return {
        usadas: [],
        usadasRaras: [],
        usadasMalas: []
      }
    }

    const db = JSON.parse(fs.readFileSync(file, 'utf8') || '{}')

    if (!Array.isArray(db.usadas)) db.usadas = []
    if (!Array.isArray(db.usadasRaras)) db.usadasRaras = []
    if (!Array.isArray(db.usadasMalas)) db.usadasMalas = []

    return db
  } catch (error) {
    console.error('[FORTUNA] Error leyendo la base de datos:', error)

    return {
      usadas: [],
      usadasRaras: [],
      usadasMalas: []
    }
  }
}

function saveDB(db) {
  try {
    fs.writeFileSync(file, JSON.stringify(db, null, 2))
  } catch (error) {
    console.error('[FORTUNA] Error guardando la base de datos:', error)
  }
}

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

function obtenerFrase(lista, clave, db) {
  if (!Array.isArray(db[clave])) db[clave] = []

  // Reinicia la lista cuando todas las frases ya se utilizaron.
  const disponibles = lista.filter(
    frase => !db[clave].includes(frase)
  )

  if (disponibles.length === 0) {
    db[clave] = []
    disponibles.push(...lista)
  }

  const frase = disponibles[Math.floor(Math.random() * disponibles.length)]
  db[clave].push(frase)

  return frase
}

const handler = async (m, { conn }) => {
  try {
    const db = loadDB()
    const rand = Math.random()

    let frase
    let tipo

    // 40% rara, 40% normal y 20% mala.
    if (rand < 0.40) {
      tipo = '🍀 *FORTUNA RARA*'
      frase = obtenerFrase(raras, 'usadasRaras', db)
    } else if (rand < 0.80) {
      tipo = '🥠 *FORTUNA NORMAL*'
      frase = obtenerFrase(normales, 'usadas', db)
    } else {
      tipo = '💀 *FORTUNA MALA*'
      frase = obtenerFrase(malas, 'usadasMalas', db)
    }

    saveDB(db)

    const texto =
`${tipo}

╭━━━━━━━━━━━━━━━━━━╮
┃ 🔮 *Mensaje del destino*
┃
┃ "${frase}"
╰━━━━━━━━━━━━━━━━━━╯

✨ El destino ha hablado... 🥠`

    // Enviar únicamente texto, sin descargar ni adjuntar imágenes.
    await conn.sendMessage(
      m.chat,
      { text: texto },
      { quoted: m }
    )

  } catch (error) {
    console.error('[FORTUNA] Error al enviar el mensaje:', error)

    try {
      await m.reply('❌ La galleta de la fortuna se rompió 😭🥠\nIntentá nuevamente.')
    } catch (replyError) {
      console.error('[FORTUNA] Tampoco se pudo enviar el aviso:', replyError)
    }
  }
}

handler.help = ['fortuna']
handler.tags = ['fun']
handler.command = ['fortuna']

export default handler
