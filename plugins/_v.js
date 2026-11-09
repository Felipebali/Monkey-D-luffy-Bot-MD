
/**
 * 📂 plugins/v.js
 * 🎧 WHATSAPP-BOT — RECUPERADOR DE AUDIOS
 *
 * Comando:
 * .v
 *
 * ✅ Detecta audios normales
 * ✅ Reconoce contenedores viewOnce
 * ✅ Reconoce mensajes efímeros
 * ✅ Descarga mediante Baileys
 * ✅ Reenvía como audio normal
 * ✅ Compatible con notas de voz (PTT)
 * ✅ Diagnóstico de errores
 * 👑 Exclusivo para owners
 *
 * Baileys ES Modules
 */

import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// ============================================================
// 🔧 BUSCAR AUDIO EN MENSAJES ANIDADOS
// ============================================================

function getAudioMessage(quoted) {
  if (!quoted) return null

  const visited = new Set()

  function buscar(obj, depth = 0) {
    if (
      !obj ||
      typeof obj !== 'object' ||
      depth > 10 ||
      visited.has(obj)
    ) {
      return null
    }

    visited.add(obj)

    // Audio directo
    if (obj.audioMessage) {
      return obj.audioMessage
    }

    // Audio serializado
    if (
      obj.mtype === 'audioMessage' &&
      obj.msg &&
      typeof obj.msg === 'object'
    ) {
      return obj.msg
    }

    // Audio dentro de mensaje citado
    if (
      obj.type === 'audioMessage' &&
      obj.content &&
      typeof obj.content === 'object'
    ) {
      return obj.content
    }

    // Contenedores compatibles
    const wrappers = [
      'message',
      'msg',
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage',
      'deviceSentMessage',
      'editedMessage',
      'protocolMessage',
      'quotedMessage',
      'contextInfo',
      'content'
    ]

    for (const key of wrappers) {
      if (!obj[key]) continue

      const found = buscar(
        obj[key],
        depth + 1
      )

      if (found) return found
    }

    return null
  }

  return buscar(quoted)
}

// ============================================================
// 📥 DESCARGAR AUDIO
// ============================================================

async function downloadAudio(
  quoted,
  audioMessage,
  conn
) {
  // Primer intento: método del serializer
  if (typeof quoted.download === 'function') {
    try {
      const result = await quoted.download()

      if (result) {
        const buffer = Buffer.isBuffer(result)
          ? result
          : Buffer.from(result)

        if (buffer.length > 0) {
          return buffer
        }
      }

    } catch (error) {
      console.error(
        '[V] quoted.download falló:',
        error?.message || error
      )
    }
  }

  // Segundo intento: descarga directa
  const options = {}

  if (typeof conn.updateMediaMessage === 'function') {
    options.reuploadRequest = msg =>
      conn.updateMediaMessage(msg)
  }

  const stream = await downloadContentFromMessage(
    audioMessage,
    'audio',
    options
  )

  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

// ============================================================
// 🔍 DIAGNÓSTICO DE MENSAJE CITADO
// ============================================================

function debugQuoted(quoted) {
  try {
    console.log(
      '[V] Tipo citado:',
      quoted?.mtype || 'Desconocido'
    )

    console.log(
      '[V] Claves del quoted:',
      Object.keys(quoted || {})
    )

    console.log(
      '[V] Claves del mensaje:',
      Object.keys(quoted?.message || {})
    )

    console.log(
      '[V] Claves de quoted.msg:',
      Object.keys(quoted?.msg || {})
    )

  } catch (error) {
    console.error(
      '[V] Error de diagnóstico:',
      error
    )
  }
}

// ============================================================
// 👑 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, {
  conn,
  isOwner,
  isROwner
}) => {
  // Solo owners
  if (!isOwner && !isROwner) {
    return m.reply(
      '⛔ Solo los propietarios pueden usar este comando.'
    )
  }

  // Verificar mensaje citado
  const quoted = m.quoted

  if (!quoted) {
    return m.reply(
      '🎧 Respondé a un audio con *.v* para recuperarlo.'
    )
  }

  // Buscar audio
  const audioMessage = getAudioMessage(quoted)

  if (!audioMessage) {
    debugQuoted(quoted)

    return m.reply(
      '❌ No se detectó un audio compatible en el mensaje citado. Revisá la consola para ver cómo lo recibe Baileys.'
    )
  }

  // Reacción de espera
  try {
    await m.react('⏳')
  } catch {}

  try {
    // Descargar
    const buffer = await downloadAudio(
      quoted,
      audioMessage,
      conn
    )

    if (!buffer?.length) {
      throw new Error(
        'El archivo descargado está vacío.'
      )
    }

    // ========================================================
    // 🎧 ENVIAR COMO AUDIO NORMAL
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype:
          audioMessage.mimetype ||
          'audio/ogg; codecs=opus',
        ptt: Boolean(audioMessage.ptt),
        viewOnce: false
      },
      {
        quoted: m
      }
    )

    try {
      await m.react('✅')
    } catch {}

    console.log(
      `[V] Audio enviado correctamente a ${m.chat}`
    )

  } catch (error) {
    console.error(
      '[V] Error recuperando audio:',
      error?.message || error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      '❌ No se pudo descargar el audio. Puede que haya expirado, ya se haya escuchado o WhatsApp no permita acceder a él.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.command = /^v$/i

handler.help = ['v']

handler.tags = ['owner']

handler.rowner = true

export default handler
