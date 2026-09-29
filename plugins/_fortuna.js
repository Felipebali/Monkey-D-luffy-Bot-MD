// 📂 plugins/fortuna.js — 🥠 GALLETA DE LA FORTUNA
// FELIXCAT_BOT — FELI 2026 PRO

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

// ============================================================
// 📁 DATABASE
// ============================================================

const dir = './database'
const file = path.join(dir, 'fortunas.json')

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

if (!fs.existsSync(file)) {
  fs.writeFileSync(
    file,
    JSON.stringify({
      usadas: [],
      usadasRaras: [],
      usadasMalas: []
    }, null, 2)
  )
}

// ============================================================
// 💾 LOAD / SAVE
// ============================================================

const loadDB = () => {

  try {

    const data =
      fs.readFileSync(
        file,
        'utf8'
      )

    const db =
      JSON.parse(data || '{}')

    // Asegurar estructura
    if (!Array.isArray(db.usadas)) {
      db.usadas = []
    }

    if (!Array.isArray(db.usadasRaras)) {
      db.usadasRaras = []
    }

    if (!Array.isArray(db.usadasMalas)) {
      db.usadasMalas = []
    }

    return db

  } catch (e) {

    console.error(
      '❌ Error leyendo fortunas.json:',
      e
    )

    return {
      usadas: [],
      usadasRaras: [],
      usadasMalas: []
    }
  }
}

const saveDB = data => {

  try {

    fs.writeFileSync(
      file,
      JSON.stringify(
        data,
        null,
        2
      )
    )

  } catch (e) {

    console.error(
      '❌ Error guardando fortunas.json:',
      e
    )
  }
}

// ============================================================
// 🍀 FORTUNAS NORMALES
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

// ============================================================
// ✨ FORTUNAS RARAS
// ============================================================

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

// ============================================================
// 💀 FORTUNAS MALAS
// ============================================================

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
// 🎲 OBTENER FRASE SIN REPETIR
// ============================================================

function obtenerFrase(
  lista,
  usadasKey,
  db
) {

  if (!Array.isArray(db[usadasKey])) {
    db[usadasKey] = []
  }

  // ----------------------------------------------------------
  // Si ya se usaron todas, reiniciar
  // ----------------------------------------------------------

  if (
    db[usadasKey].length >= lista.length
  ) {

    db[usadasKey] = []
  }

  // ----------------------------------------------------------
  // Buscar disponibles
  // ----------------------------------------------------------

  let disponibles =
    lista.filter(
      frase =>
        !db[usadasKey].includes(frase)
    )

  // ----------------------------------------------------------
  // Seguridad
  // ----------------------------------------------------------

  if (!disponibles.length) {

    db[usadasKey] = []

    disponibles = [
      ...lista
    ]
  }

  // ----------------------------------------------------------
  // Elegir aleatoriamente
  // ----------------------------------------------------------

  const frase =
    disponibles[
      Math.floor(
        Math.random() *
        disponibles.length
      )
    ]

  db[usadasKey].push(
    frase
  )

  return frase
}

// ============================================================
// 🖼️ IMAGEN DE LA GALLETA
// ============================================================

const imagenFortuna =
  'https://files.catbox.moe/xli6lh.jpg'

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  { conn }
) => {

  try {

    // ========================================================
    // 💾 DATABASE
    // ========================================================

    const db =
      loadDB()

    // ========================================================
    // 🎲 PROBABILIDADES
    // ========================================================
    //
    // 🍀 Rara   = 40%
    // 🥠 Normal = 40%
    // 💀 Mala   = 20%
    //
    // ========================================================

    const rand =
      Math.random()

    let frase
    let tipo

    if (rand < 0.40) {

      tipo =
        '🍀 *FORTUNA RARA*'

      frase =
        obtenerFrase(
          raras,
          'usadasRaras',
          db
        )

    } else if (rand < 0.80) {

      tipo =
        '🥠 *FORTUNA NORMAL*'

      frase =
        obtenerFrase(
          normales,
          'usadas',
          db
        )

    } else {

      tipo =
        '💀 *FORTUNA MALA*'

      frase =
        obtenerFrase(
          malas,
          'usadasMalas',
          db
        )
    }

    // ========================================================
    // 💾 GUARDAR
    // ========================================================

    saveDB(db)

    // ========================================================
    // 🥠 TEXTO
    // ========================================================

    const texto =

`${tipo}

╭───────────────╮
│ 🔮 *Mensaje del destino*
│
│ "${frase}"
╰───────────────╯

✨ El destino ha hablado...`

    // ========================================================
    // 🖼️ DESCARGAR IMAGEN
    // ========================================================

    let img = null

    try {

      const response =
        await fetch(
          imagenFortuna
        )

      if (
        response.ok
      ) {

        img =
          Buffer.from(
            await response.arrayBuffer()
          )
      }

    } catch (e) {

      console.error(
        '⚠️ No se pudo descargar la imagen:',
        e.message
      )
    }

    // ========================================================
    // 📤 ENVIAR CON IMAGEN
    // ========================================================

    if (img) {

      return await conn.sendMessage(
        m.chat,
        {
          text: texto,

          contextInfo: {

            externalAdReply: {

              title:
                '🥠 Galleta de la Fortuna',

              body:
                '🔮 Mensaje del destino',

              thumbnail:
                img,

              mediaType: 1,

              renderLargerThumbnail:
                true
            }
          }
        },
        {
          quoted: m
        }
      )
    }

    // ========================================================
    // 📤 FALLBACK SIN IMAGEN
    // ========================================================

    return await conn.sendMessage(
      m.chat,
      {
        text: texto
      },
      {
        quoted: m
      }
    )

  } catch (e) {

    console.error(
      '❌ Error en fortuna.js:',
      e
    )

    return m.reply(
      '❌ La galleta de la fortuna se rompió 😭🥠\n\n' +
      'Intenta nuevamente.'
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'fortuna'
]

handler.tags = [
  'fun'
]

handler.command = [
  'fortuna'
]

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
