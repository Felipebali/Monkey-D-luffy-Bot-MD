
// 📂 plugins/antifake-offline.js
// 🤖 WHATSAPP-BOT — ANTIFAKE +505
// Comandos: .antifake / .antivirtuales
// ⚠️ Solo actúa sobre números con prefijo 505.

const handler = async (m, { conn, isAdmin, isOwner }) => {
  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '⚠️ Este comando solo funciona en grupos.'
    })
  }

  if (!(isAdmin || isOwner)) {
    return conn.sendMessage(m.chat, {
      text: '⛔ Solo los administradores pueden usar este comando.'
    })
  }

  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = {}
  }

  const chat = global.db.data.chats[m.chat]
  chat.antifake = !chat.antifake

  return conn.sendMessage(m.chat, {
    text: chat.antifake
      ? '🚨 *ANTIFAKE +505 ACTIVADO*\n\n🇳🇮 Se expulsarán los números con prefijo +505 al ingresar al grupo.\n\n🛡️ Los demás prefijos no serán afectados.'
      : '💤 *ANTIFAKE +505 DESACTIVADO*\n\n✅ Ya no se expulsarán automáticamente los números +505.'
  })
}

// Detectar ingresos al grupo
handler.all = async function (m) {
  try {
    if (!m?.isGroup) return

    const chat = global.db.data.chats[m.chat]
    if (!chat?.antifake) return

    // Procesar únicamente eventos de incorporación.
    const action = m.messageStubType
    const isAdd =
      action === 27 ||
      String(action).toLowerCase().includes('participant_add')

    if (!isAdd) return

    const conn = global.conn || this
    if (!conn?.groupMetadata || !conn?.groupParticipantsUpdate) return

    const participants = m.messageStubParameters || m.participants || []
    if (!participants.length) return

    for (const who of participants) {
      const jid = typeof who === 'string' ? who : who?.id
      if (!jid) continue

      // Solo números de Nicaragua: 505.
      const number = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
      if (!number.startsWith('505')) continue

      // No intentar expulsar administradores.
      let metadata
      try {
        metadata = await conn.groupMetadata(m.chat)
      } catch {
        continue
      }

      const member = metadata.participants?.find(p =>
        p.id === jid || p.jid === jid
      )

      if (
        member?.admin === 'admin' ||
        member?.admin === 'superadmin'
      ) {
        continue
      }

      try {
        await conn.sendMessage(m.chat, {
          text:
            `🚫 *ANTIFAKE +505 ACTIVADO*\n\n` +
            `🇳🇮 Se detectó un número con prefijo +505.\n` +
            `👤 Participante: @${number}\n\n` +
            `🛡️ Se procederá a retirarlo del grupo.`,
          mentions: [jid]
        })

        await conn.groupParticipantsUpdate(m.chat, [jid], 'remove')

        console.log(`[ANTIFAKE] Número +505 procesado en ${m.chat}`)
      } catch (e) {
        console.error('[ANTIFAKE] No se pudo expulsar:', e)
      }
    }
  } catch (e) {
    console.error('[ANTIFAKE] Error procesando ingreso:', e)
  }
}

handler.help = ['antifake']
handler.tags = ['group']
handler.command = ['antifake', 'antivirtuales']
handler.group = true
handler.admin = true

export default handler
