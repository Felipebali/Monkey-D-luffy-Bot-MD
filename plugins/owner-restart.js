/**
 * 📂 plugins/restart.js
 * 🔄 WHATSAPP-BOT — REINICIO DEL SISTEMA
 *
 * Comandos: .restart / .reiniciar
 * Permisos: Owner principal
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

const ARCHIVO = path.resolve('./database/restart-notify.json')
const ESPERA_REINICIO = 3000
const TIEMPO_MAXIMO = 30 * 60 * 1000

function guardarEstado(datos) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true })
  fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), 'utf8')
}

function leerEstado() {
  try {
    if (!fs.existsSync(ARCHIVO)) return null

    const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'))

    if (!datos.chat || !datos.timestamp) return null

    if (Date.now() - datos.timestamp > TIEMPO_MAXIMO) {
      borrarEstado()
      return null
    }

    return datos
  } catch (error) {
    console.error('[WHATSAPP-BOT | RESTART] Error leyendo estado:', error)
    return null
  }
}

function borrarEstado() {
  try {
    if (fs.existsSync(ARCHIVO)) {
      fs.unlinkSync(ARCHIVO)
    }
  } catch (error) {
    console.error('[WHATSAPP-BOT | RESTART] Error borrando estado:', error)
  }
}

const handler = async (m, { conn }) => {
  try {
    if (!m.chat) return

    if (leerEstado()) {
      return conn.sendMessage(m.chat, {
        text: '⏳ Ya hay un reinicio pendiente.'
      }, { quoted: m })
    }

    guardarEstado({
      chat: m.chat,
      timestamp: Date.now(),
      solicitadoPor: m.sender || 'desconocido'
    })

    await conn.sendMessage(m.chat, {
      text: [
        '╭━━━〔 🔄 REINICIO DEL SISTEMA 〕━━━⬣',
        '',
        '🤖 *WHATSAPP-BOT*',
        '',
        '⚙️ Reinicio solicitado correctamente.',
        '⏳ El bot se reiniciará en unos segundos.',
        '',
        '📢 Se intentará notificar cuando vuelva a conectarse.',
        '',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣'
      ].join('\n')
    }, { quoted: m })

    setTimeout(() => {
      process.exit(0)
    }, ESPERA_REINICIO)

  } catch (error) {
    console.error('[WHATSAPP-BOT | RESTART]', error)

    return conn.sendMessage(m.chat, {
      text: `❌ Error al iniciar el reinicio:\n${String(error.message || error).slice(0, 400)}`
    }).catch(() => {})
  }
}

handler.help = ['restart', 'reiniciar']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true

export default handler

/**
 * Envía el aviso cuando el bot ya está conectado.
 * Para garantizarlo, el cargador debe llamar esta función
 * después de que Baileys establezca la conexión.
 */
export async function notificarReinicio(conn) {
  const estado = leerEstado()

  if (!estado || !conn?.user) return false

  const segundos = Math.floor((Date.now() - estado.timestamp) / 1000)

  let tiempo
  if (segundos < 60) {
    tiempo = `${segundos} segundos`
  } else if (segundos < 3600) {
    tiempo = `${Math.floor(segundos / 60)} min ${segundos % 60} s`
  } else {
    tiempo = `${Math.floor(segundos / 3600)} h ${Math.floor((segundos % 3600) / 60)} min`
  }

  const mensaje = [
    '╭━━━〔 ✅ SISTEMA RESTABLECIDO 〕━━━⬣',
    '',
    '🤖 *WHATSAPP-BOT ESTÁ EN LÍNEA*',
    '',
    '🟢 Estado: conectado correctamente',
    `⏱️ Tiempo transcurrido: ${tiempo}`,
    `💻 Sistema: ${os.type()} ${os.release()}`,
    '',
    '🚀 ¡El reinicio finalizó correctamente!',
    '',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣'
  ].join('\n')

  try {
    await conn.sendMessage(estado.chat, { text: mensaje })
    borrarEstado()

    console.log('[WHATSAPP-BOT | RESTART] Aviso enviado correctamente.')
    return true
  } catch (error) {
    console.error('[WHATSAPP-BOT | RESTART] Error enviando aviso:', error)
    return false
  }
}
