// 📂 plugins/alerta.js
// 🚨 Sistema de Alertas — WhatsApp-Bot
// ============================================================

const grupoDestino = '120363410955044864@g.us'


let handler = async (m, { conn, text }) => {

  // ==========================================================
  // ⚠️ VALIDAR MENSAJE
  // ==========================================================

  if (!text || !text.trim()) {
    return m.reply(
      '⚠️ *Uso incorrecto*\n\n' +
      'Escribí el mensaje de la alerta:\n' +
      '`.alerta <mensaje>`'
    )
  }


  try {

    // ========================================================
    // 🚨 REACCIÓN
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '🚨',
          key: m.key
        }
      }
    )


    // ========================================================
    // 👥 INFORMACIÓN DEL GRUPO
    // ========================================================

    const metadata = await conn.groupMetadata(
      grupoDestino
    )

    const participantes = metadata.participants || []

    const menciones = participantes
      .map(user => user.id)
      .filter(Boolean)


    // ========================================================
    // 🚨 ALERTA
    // ========================================================

    const mensaje = `╭━━〔 🚨 *ALERTA* 〕━━╮

${text.trim()}

╰━━━━━━━━━━━━━━━━━━╯

📢 *Atención a todos los miembros.*`


    // ========================================================
    // 📤 ENVIAR
    // ========================================================

    await conn.sendMessage(
      grupoDestino,
      {
        text: mensaje,
        mentions: menciones
      }
    )


    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '✅',
          key: m.key
        }
      }
    )

    await m.reply(
      `╭━━〔 ✅ *ALERTA ENVIADA* 〕━━╮

👥 *Grupo:* ${metadata.subject || 'Sin nombre'}
📢 *Mencionados:* ${menciones.length}

╰━━━━━━━━━━━━━━━━━━╯`
    )


  } catch (err) {

    console.error(
      '❌ Error en comando alerta:',
      err
    )


    // ========================================================
    // ❌ REACCIÓN
    // ========================================================

    try {
      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '❌',
            key: m.key
          }
        }
      )
    } catch {}


    // ========================================================
    // ❌ ERROR
    // ========================================================

    await m.reply(
      '❌ *No se pudo enviar la alerta.*\n\n' +
      'Verificá que el bot esté dentro del grupo destino y tenga permiso para enviar mensajes.'
    )
  }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = ['alerta']

// 👑 Solo Owners
handler.owner = true

export default handler
