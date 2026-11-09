
/**
 * 📂 plugins/v.js
 * 🎧 WHATSAPP-BOT — RECUPERADOR DE AUDIOS
 *
 * Comando:
 * .v
 *
 * ✅ Compatible con tu handler.js
 * ✅ Detecta audioMessage directamente en m.quoted
 * ✅ Reconoce mensajes viewOnce
 * ✅ Descarga mediante quoted.download()
 * ✅ Descarga alternativa con Baileys
 * ✅ Envía como audio normal
 * ✅ Conserva formato de nota de voz
 * ✅ No guarda archivos ni envía a otros grupos
 * 👑 Exclusivo para owners
 *
 * Baileys ES Modules
 */

import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// ============================================================
// 🎧 DETECTAR AUDIO
// ============================================================

function getAudioMessage(quoted) {
  if (!quoted) return null

  // Formato de tu handler.js:
  // m.quoted contiene directamente los datos multimedia.
  if (
    quoted.mtype === 'audioMessage' &&
    (
      quoted.mediaKey ||
      quoted.directPath ||
      quoted.url
    )
  ) {
    return quoted
  }

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

    // Audio convencional.
    if (obj.audioMessage) {
      return obj.audioMessage
    }

    // Audio serializado.
    if (
      obj.mtype === 'audioMessage' &&
      obj.msg &&
      typeof obj.msg === 'object'
    ) {
      return obj.msg
    }

    // Contenedores de WhatsApp.
    const wrappers = [
      'message',
      'msg',
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage',
      'deviceSentMessage',
      'quotedMessage',
      'contextInfo'
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

async function downloadAudio(quoted, audioMessage) {
  // Primer intento: método del serializer.
  if (typeof quoted.download === 'function') {
    try {
      console.log(
        '[V] Intentando quoted.download()'
      )

      const result = await quoted.download()

      if (result) {
        const buffer = Buffer.isBuffer(result)
          ? result
          : Buffer.from(result)

        if (buffer.length > 0) {
          console.log(
            `[V] Descarga correcta: ${buffer.length} bytes`
          )

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

  // Segundo intento: descarga directa desde Baileys.
  console.log(
    '[V] Intentando descarga directa con Baileys'
  )

  const stream = await downloadContentFromMessage(
    audioMessage,
    'audio'
  )

  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  const buffer = Buffer.concat(chunks)

  if (!buffer.length) {
    throw new Error(
      'El audio descargado está vacío.'
    )
  }

  console.log(
    `[V] Descarga alternativa correcta: ${buffer.length} bytes`
  )

  return buffer
}

// ============================================================
// 🔍 DIAGNÓSTICO
// ============================================================

function debugQuoted(quoted) {
  console.log(
    '[V] Tipo citado:',
    quoted?.mtype || 'Desconocido'
  )

  console.log(
    '[V] Tiene mediaKey:',
    Boolean(quoted?.mediaKey)
  )

  console.log(
    '[V] Tiene directPath:',
    Boolean(quoted?.directPath)
  )

  console.log(
    '[V] Tiene download:',
    typeof quoted?.download === 'function'
  )

  console.log(
    '[V] Es viewOnce:',
    Boolean(quoted?.viewOnce)
  )
}

// ============================================================
// 👑 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, {
  conn,
  isOwner,
  isROwner
}) => {

  // Solo propietarios.
  if (!isOwner && !isROwner) {
    return m.reply(
      '⛔ Solo los propietarios pueden utilizar este comando.'
    )
  }

  // Verificar mensaje citado.
  const quoted = m.quoted

  if (!quoted) {
    return m.reply(
      '🎧 Respondé a un audio con *.v* para recuperarlo.'
    )
  }

  // Diagnóstico sin mostrar claves privadas.
  debugQuoted(quoted)

  // Detectar audio.
  const audioMessage = getAudioMessage(quoted)

  if (!audioMessage) {
    return m.reply(
      '❌ El mensaje citado no contiene un audio compatible.'
    )
  }

  try {
    await m.react('⏳')
  } catch {}

  try {
    // Descargar audio.
    const buffer = await downloadAudio(
      quoted,
      audioMessage
    )

    if (!buffer?.length) {
      throw new Error(
        'No se recibieron datos del audio.'
      )
    }

    // ========================================================
    // 🎙️ ENVIAR COMO AUDIO NORMAL
    // ========================================================

    const mimetype =
      audioMessage.mimetype ||
      quoted.mimetype ||
      'audio/ogg; codecs=opus'

    const ptt = Boolean(
      audioMessage.ptt ??
      quoted.ptt
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype,
        ptt,
        viewOnce: false
      },
      {
        quoted: m
      }
    )

    console.log(
      `[V] Audio enviado correctamente a ${m.chat}`
    )

    try {
      await m.react('✅')
    } catch {}

  } catch (error) {
    console.error(
      '[V] Error recuperando audio:',
      error?.message || error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      '❌ No se pudo descargar el audio. Puede que WhatsApp ya no permita acceder al archivo o que haya expirado.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = /^v$/i

handler.help = ['v']

handler.tags = ['owner']

handler.rowner = true

export default handler
