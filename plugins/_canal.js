
/**
 * 📂 plugins/canal-automatico.js
 * 🥶 PIPE TIME — CANAL PERSONAL DE PIPE
 *
 * 🤖 Enviado mediante WHATSAPP-BOT
 *
 * 📢 Publicación automática en grupos
 * ⏰ Cada 2 horas por grupo
 * 🚫 Sin menciones
 * 🔗 Botón para abrir el canal
 * 💾 Registro persistente
 * 🛡️ Evita publicaciones simultáneas
 *
 * Baileys ES Modules
 */

import fs from 'fs'
import path from 'path'

import {
  generateWAMessageFromContent,
  proto
} from '@whiskeysockets/baileys'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CANAL =
  'https://whatsapp.com/channel/0029VbE1SMKF1Yla8CAjlk0n'

// Dos horas
const INTERVALO = 2 * 60 * 60 * 1000

// Revisar cada minuto
const REVISION = 60 * 1000

// Pausa entre publicaciones
const PAUSA_GRUPOS = 3000

const DB_FILE = path.resolve(
  './database/canal-automatico.json'
)

fs.mkdirSync(path.dirname(DB_FILE), {
  recursive: true
})

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function leerDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, '{}', 'utf8')
    }

    const data = JSON.parse(
      fs.readFileSync(DB_FILE, 'utf8')
    )

    return (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) ? data : {}

  } catch (error) {
    console.error(
      '[PIPE TIME] Error leyendo DB:',
      error
    )

    return {}
  }
}

function guardarDB(data) {
  const temporal = DB_FILE + '.tmp'

  try {
    fs.writeFileSync(
      temporal,
      JSON.stringify(data, null, 2),
      'utf8'
    )

    fs.renameSync(
      temporal,
      DB_FILE
    )

    return true

  } catch (error) {
    console.error(
      '[PIPE TIME] Error guardando DB:',
      error
    )

    return false
  }
}

// ============================================================
// 📝 MENSAJE DE PIPE
// ============================================================

function crearTexto() {
  return `╭━━〔 🥶 *PIPE TIME* 〕━━⬣
┃
┃ 📢 *CANAL OFICIAL DE PIPE*
┃
┃ ¡Bienvenidos al canal de Pipe!
┃
┃ 🔥 Publicaciones y novedades
┃ 💬 Contenido personal
┃ 📢 Anuncios y actualizaciones
┃ 🎭 Humor y entretenimiento
┃
┃ 🔗 *¡Sumate al canal!*
┃
╰━━━━━━━━━━━━━━━━━━⬣`
}

// ============================================================
// 📢 ENVIAR PUBLICACIÓN
// ============================================================

async function enviarCanal(conn, grupo) {
  const texto = crearTexto()

  try {
    const mensaje = generateWAMessageFromContent(
      grupo,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage:
              proto.Message.InteractiveMessage.create({
                body: {
                  text: texto
                },
                footer: {
                  text: '🥶 PIPE TIME | CANAL DE PIPE'
                },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: 'cta_url',
                      buttonParamsJson:
                        JSON.stringify({
                          display_text: '🥶 SEGUIR A PIPE',
                          url: CANAL,
                          merchant_url: CANAL
                        })
                    }
                  ]
                }
              })
          }
        }
      },
      {
        userJid: conn.user.id
      }
    )

    await conn.relayMessage(
      grupo,
      mensaje.message,
      {
        messageId: mensaje.key.id
      }
    )

    return true

  } catch (error) {
    console.error(
      `[PIPE TIME] Botón falló en ${grupo}:`,
      error?.message || error
    )

    // Enlace normal como alternativa
    try {
      await conn.sendMessage(grupo, {
        text: `${texto}

📢 *SEGUÍ A PIPE EN WHATSAPP:*
${CANAL}`
      })

      return true

    } catch (fallbackError) {
      console.error(
        `[PIPE TIME] Error enviando a ${grupo}:`,
        fallbackError
      )

      return false
    }
  }
}

// ============================================================
// 🌐 OBTENER GRUPOS DEL BOT
// ============================================================

async function obtenerGrupos(conn) {
  try {
    const grupos =
      await conn.groupFetchAllParticipating()

    return Object.keys(grupos || {})

  } catch (error) {
    console.error(
      '[PIPE TIME] Error obteniendo grupos:',
      error
    )

    return []
  }
}

// ============================================================
// ⏰ CONTROL AUTOMÁTICO
// ============================================================

const procesando = new Set()

async function revisarGrupos(conn) {
  if (!conn?.user?.id) return

  const grupos = await obtenerGrupos(conn)

  if (!grupos.length) return

  for (const grupo of grupos) {
    if (procesando.has(grupo)) continue

    const db = leerDB()
    const ahora = Date.now()

    const ultimoEnvio = Number(
      db[grupo] || 0
    )

    if (
      ultimoEnvio &&
      ahora - ultimoEnvio < INTERVALO
    ) {
      continue
    }

    procesando.add(grupo)

    try {
      const enviado = await enviarCanal(
        conn,
        grupo
      )

      if (enviado) {
        const actual = leerDB()

        actual[grupo] = Date.now()

        if (guardarDB(actual)) {
          console.log(
            `[PIPE TIME] ✅ Publicado en ${grupo}`
          )
        }
      }

    } catch (error) {
      console.error(
        `[PIPE TIME] Error en ${grupo}:`,
        error
      )

    } finally {
      procesando.delete(grupo)
    }

    await new Promise(resolve =>
      setTimeout(resolve, PAUSA_GRUPOS)
    )
  }
}

// ============================================================
// 🔄 TEMPORIZADOR GLOBAL
// ============================================================

let conexionActual = null
let intervaloActivo = null
let revisando = false

async function ejecutarRevision() {
  if (!conexionActual || revisando) return

  revisando = true

  try {
    await revisarGrupos(conexionActual)

  } catch (error) {
    console.error(
      '[PIPE TIME] Error en revisión:',
      error
    )

  } finally {
    revisando = false
  }
}

function iniciarSistema(conn) {
  if (!conn?.user?.id) return

  conexionActual = conn

  if (intervaloActivo) return

  console.log(
    '[PIPE TIME] 🥶 Publicación automática activada'
  )

  console.log(
    '[PIPE TIME] ⏰ Frecuencia: cada 2 horas'
  )

  intervaloActivo = setInterval(
    ejecutarRevision,
    REVISION
  )

  // Primera revisión al activarse
  ejecutarRevision()
}

// ============================================================
// 📡 HANDLER
// ============================================================

const handler = async () => {}

handler.all = async function (m) {
  try {
    if (!this?.user?.id) return

    iniciarSistema(this)

  } catch (error) {
    console.error(
      '[PIPE TIME] Error iniciando sistema:',
      error
    )
  }
}

// ============================================================
// ⚙️ EXPORTACIÓN
// ============================================================

handler.help = []
handler.tags = ['owner']
handler.command = /^$/

export default handler
