
/**
 * 📂 plugins/v.js
 * 🎧 WHATSAPP-BOT — RECUPERAR AUDIO
 *
 * Comando:
 * .v
 *
 * ✅ Responder a un audio
 * ✅ Compatible con audios normales
 * ✅ Intenta procesar audios de una escucha
 * ✅ Envía como audio normal
 * ✅ No guarda archivos
 * ✅ No envía a otros grupos
 * 👑 Exclusivo para owners
 *
 * Baileys ES Modules
 */

import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// ============================================================
// 🎧 IDENTIFICAR AUDIO CITADO
// ============================================================

function getAudioMessage(quoted) {
  if (!quoted) return null

  const msg = quoted.message || {}

  // Audio normal
  if (msg.audioMessage) {
    return msg.audioMessage
  }

  // Audio dentro de mensaje efímero
  if (
    msg.ephemeralMessage?.message?.audioMessage
  ) {
    return msg.ephemeralMessage.message.audioMessage
  }

  // Audio de una escucha
  if (
    msg.viewOnceMessage?.message?.audioMessage
  ) {
    return msg.viewOnceMessage.message.audioMessage
  }

  if (
    msg.viewOnceMessageV2?.message?.audioMessage
  ) {
    return msg.viewOnceMessageV2.message.audioMessage
  }

  if (
    msg.viewOnceMessageV2Extension
      ?.message?.audioMessage
  ) {
    return msg.viewOnceMessageV2Extension
      .message.audioMessage
  }

  // Algunos serializers de Baileys
  if (
    quoted.mtype === 'audioMessage' &&
    quoted.msg
  ) {
    return quoted.msg
  }

  return null
}

// ============================================================
// 📥 DESCARGAR AUDIO
// ============================================================

async function downloadAudio(quoted, audioMessage) {
  // Primer método: descarga del mensaje citado.
  if (typeof quoted.download === 'function') {
    try {
      const result = await quoted.download()

      if (result) {
        const buffer = Buffer.isBuffer(result)
          ? result
          : Buffer.from(result)

        if (buffer.length) {
          return buffer
        }
      }
    } catch (error) {
      console.error(
        '[V] Descarga directa falló:',
        error?.message || error
      )
    }
  }

  // Segundo método: descarga desde Baileys.
  const stream = await downloadContentFromMessage(
    audioMessage,
    'audio'
  )

  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

// ============================================================
// 👑 COMANDO .V
// ============================================================

const handler = async (m, {
  conn,
  isOwner,
  isROwner
}) => {
  if (!isOwner && !isROwner) {
    return m.reply(
      '⛔ Solo los propietarios pueden usar este comando.'
    )
  }

  const quoted = m.quoted

  if (!quoted) {
    return m.reply(
      '🎧 Respondé a un audio con *.v* para recuperarlo.'
    )
  }

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
    const buffer = await downloadAudio(
      quoted,
      audioMessage
    )

    if (!buffer?.length) {
      throw new Error('Audio vacío')
    }

    // Enviar como audio normal.
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

  } catch (error) {
    console.error(
      '[WHATSAPP-BOT / V] Error:',
      error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      '❌ No se pudo recuperar el audio. Puede que WhatsApp ya no permita descargarlo o que el archivo haya expirado.'
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
