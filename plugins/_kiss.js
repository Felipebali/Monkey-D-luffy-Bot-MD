// 📂 plugins/kiss.js
// 💋 WHATSAPP-BOT — SISTEMA DE BESOS PRO
// ============================================================
// .kiss @usuario → Dar un beso
// .beso @usuario → Dar un beso
// .kiss          → Beso al aire
//
// 💋 Mensajes aleatorios
// 💞 Compatible con parejas.json
// 🫶 Permite besar aunque exista pareja
// 👤 Menciones y respuestas a mensajes
// 🛡️ Validación de JID y manejo de errores
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = './database'
const parejasFile = path.join(DATABASE_DIR, 'parejas.json')

// ============================================================
// 📂 PREPARAR BASE DE DATOS
// ============================================================

function prepararDatabase() {
  try {
    if (!fs.existsSync(DATABASE_DIR)) {
      fs.mkdirSync(DATABASE_DIR, { recursive: true })
    }

    if (!fs.existsSync(parejasFile)) {
      fs.writeFileSync(parejasFile, '{}', 'utf8')
    }
  } catch (error) {
    console.error('❌ Error preparando parejas.json:', error)
  }
}

// ============================================================
// 💞 CARGAR PAREJAS
// ============================================================

function cargarParejas() {
  try {
    prepararDatabase()

    const contenido = fs.readFileSync(parejasFile, 'utf8')
    const data = JSON.parse(contenido)

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {}
    }

    return data
  } catch (error) {
    console.error('❌ Error leyendo parejas.json:', error)
    return {}
  }
}

// ============================================================
// 🔢 NORMALIZAR JID
// ============================================================

function normalizarJid(conn, jid) {
  if (!jid || typeof jid !== 'string') return null

  try {
    const decoded = conn.decodeJid(jid)

    if (!decoded || !decoded.includes('@')) return null

    return decoded
  } catch {
    return jid.includes('@') ? jid : null
  }
}

// ============================================================
// 🧹 LIMPIAR MENCIONES DUPLICADAS
// ============================================================

function agregarMencion(mentions, jid) {
  if (!jid) return

  if (!mentions.includes(jid)) {
    mentions.push(jid)
  }
}

// ============================================================
// 💋 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn }) => {
  try {
    // ========================================================
    // 👤 IDENTIFICAR REMITENTE
    // ========================================================

    const who = normalizarJid(conn, m.sender)

    if (!who) {
      return conn.reply(
        m.chat,
        '❌ No pude identificar al remitente.',
        m
      )
    }

    const senderName = `@${who.split('@')[0]}`

    // ========================================================
    // 🎯 IDENTIFICAR DESTINATARIO
    // ========================================================

    let targetJid = null

    if (m.quoted) {
      targetJid = normalizarJid(
        conn,
        m.quoted.sender || m.quoted.participant
      )
    }

    if (!targetJid && m.mentionedJid?.length) {
      targetJid = normalizarJid(
        conn,
        m.mentionedJid[0]
      )
    }

    const targetName = targetJid
      ? `@${targetJid.split('@')[0]}`
      : null

    // ========================================================
    // 💋 MENSAJE SIN DESTINATARIO
    // ========================================================

    if (!targetJid) {
      const mensajesAire = [
        `💋 ${senderName} mandó un beso al aire. 😘`,
        `😘 ${senderName} envió un beso para quien lo necesite. 💞`,
        `💋 ${senderName} repartió cariño por el grupo. 🫶`,
        `🥰 ${senderName} dejó un beso flotando en el ambiente. 💋`,
        `💌 ${senderName} lanzó un beso al universo. 😘`
      ]

      const texto =
        mensajesAire[
          Math.floor(Math.random() * mensajesAire.length)
        ]

      return conn.sendMessage(
        m.chat,
        {
          text: texto,
          mentions: [who]
        },
        { quoted: m }
      )
    }

    // ========================================================
    // 😂 BESARSE A SÍ MISMO
    // ========================================================

    if (targetJid === who) {
      const mensajesPropios = [
        `💋 ${senderName} se dio un beso a sí mismo. ¡Autoestima al máximo! 😂`,
        `😎 ${senderName} no necesita a nadie para repartir besos. 💋`,
        `😂 ${senderName} se mandó un beso. ¡El amor propio primero! 🫶`,
        `💋 ${senderName} se besó a sí mismo. Momento de protagonista. 😎`
      ]

      const texto =
        mensajesPropios[
          Math.floor(Math.random() * mensajesPropios.length)
        ]

      return conn.sendMessage(
        m.chat,
        {
          text: texto,
          mentions: [who]
        },
        { quoted: m }
      )
    }

    // ========================================================
    // 💞 CONSULTAR PAREJAS
    // ========================================================

    const parejas = cargarParejas()

    const senderData = parejas[who] || {}
    const targetData = parejas[targetJid] || {}

    const senderPareja = senderData.pareja
      ? normalizarJid(conn, senderData.pareja)
      : null

    const targetPareja = targetData.pareja
      ? normalizarJid(conn, targetData.pareja)
      : null

    // ========================================================
    // 💋 MENSAJES ALEATORIOS
    // ========================================================

    const mensajes = [
      `💋 ${senderName} le dio un beso a ${targetName}. 😘`,
      `😘 ${senderName} saludó a ${targetName} con un beso. 😊`,
      `💞 ${senderName} le mandó un beso enorme a ${targetName}. 🫶`,
      `💋 ${senderName} sorprendió a ${targetName} con un beso. 😳`,
      `🥰 ${senderName} le regaló un poquito de cariño a ${targetName}. 💋`,
      `💌 ${senderName} le envió un beso especial a ${targetName}. 😘`,
      `🌹 ${senderName} se acercó a ${targetName} y le dio un beso. 💋`,
      `💕 ${senderName} llenó de cariño a ${targetName} con un beso. 🥰`,
      `😚 ${senderName} le dejó un beso a ${targetName}. ¡Qué ternura! 💞`,
      `💋 ¡Besito sorpresa! ${senderName} le dio un beso a ${targetName}. 😳`,
      `🫶 ${senderName} le dedicó un beso amistoso a ${targetName}. 😊`,
      `😘 ${senderName} mandó un beso directo para ${targetName}. 💌`
    ]

    const textoBase =
      mensajes[Math.floor(Math.random() * mensajes.length)]

    // ========================================================
    // 💑 MENSAJES SI HAY PAREJAS REGISTRADAS
    // ========================================================

    let textoFinal = textoBase
    const mentions = []

    agregarMencion(mentions, who)
    agregarMencion(mentions, targetJid)

    if (senderPareja) {
      agregarMencion(mentions, senderPareja)
    }

    if (targetPareja) {
      agregarMencion(mentions, targetPareja)
    }

    // No se bloquea el beso por tener pareja.
    // Solo se añade una observación divertida si corresponde.

    if (senderPareja && targetPareja) {
      textoFinal +=
        '\n\n💞 ¡Acá hay sentimientos cruzados en el sistema de parejas! 😅'
    } else if (senderPareja) {
      textoFinal +=
        '\n\n👀 ¡Atención, que el sistema detecta una pareja registrada! 💞'
    } else if (targetPareja) {
      textoFinal +=
        '\n\n👀 ¡Ojo, el sistema detecta una pareja registrada! 😅💞'
    }

    // ========================================================
    // 📤 ENVIAR MENSAJE
    // ========================================================

    return conn.sendMessage(
      m.chat,
      {
        text: textoFinal,
        mentions
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('❌ Error en el plugin kiss.js:', error)

    return conn.reply(
      m.chat,
      '❌ Ocurrió un error al enviar el beso. Intentá nuevamente.',
      m
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.command = /^(kiss|beso)$/i

handler.help = [
  'kiss @usuario',
  'beso @usuario'
]

handler.tags = ['fun']

export default handler
