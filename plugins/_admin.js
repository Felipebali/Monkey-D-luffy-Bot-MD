
// 📂 plugins/noadmin.js
// 🤖 WHATSAPP-BOT — NO SE DA ADMIN 😂

const RESPUESTAS = {
  usuario: [
    '😂 No hay admin y no se da admin jajajaj.',
    '🤖 ¿Admin? Seguí participando.',
    '💀 No se regalan coronas por acá.',
    '🤣 A llorar a otro lado, no hay admin.',
    '🐒 ¿Querés admin? JAJAJA, qué gracioso.',
    '🙄 No insistas, la respuesta sigue siendo NO.',
    '😂 Acá no se asciende a nadie.',
    '🤖 Solicitud rechazada por el departamento de NO.',
    '💅 Admin no hay, admin no se da y admin no se pide.',
    '🤣 Volvé a intentarlo en tu próxima vida.'
  ],

  admin: [
    '😂 ¿Y vos sos admin, rompe huevo?',
    '💀 Pero si ya sos admin, ¿qué más querés?',
    '🤣 ¿No te alcanza con el poder que tenés?',
    '🙄 Administrador y todavía molestando jajaja.',
    '🤡 ¿Querés ser dueño del grupo también?',
    '😂 Cerrá el trámite, que ya tenés admin.',
    '🐒 ¿Qué sigue? ¿Pedir ser el dueño de WhatsApp?',
    '😎 Sos admin, no el presidente del grupo.',
    '🤣 Dejá de romper las bolas, que ya tenés corona.',
    '💅 Otro privilegio más querés, rompe huevo.'
  ],

  owner: [
    '👑 ¿Y vos sos owner, qué más querés, rompe huevo? 😂',
    '🤣 Hasta el dueño viene a pedir admin.',
    '💀 Señor propietario, deje de molestar jajaja.',
    '😂 Vos mandás acá y todavía estás pidiendo.',
    '🤖 Owner detectado: nivel de rompehuevos máximo.',
    '👑 ¿Querés que te demos admin de tu propio bot?',
    '🤣 El jefe también rompe las bolas.',
    '😎 Patrón, ya sabemos que usted manda.'
  ]
}

// ============================================================
// 🔎 IDENTIFICAR OWNERS
// ============================================================

function esOwner(m) {
  const sender = m.sender?.split('@')[0]
  const owners = global.owner || []

  return owners.some(owner => {
    const numero = String(
      Array.isArray(owner) ? owner[0] : owner
    ).replace(/\D/g, '')

    return numero === sender
  })
}

// ============================================================
// 🤖 HANDLER
// ============================================================

let handler = async (m, { conn, participants = [] }) => {
  try {
    if (!m.isGroup) return

    const texto = String(m.text || '').trim()
    if (!texto) return

    const patronAdmin =
      /\b(admin|administrador|administradora|admins)\b/i

    const patronPeticion =
      /\b(dame|denme|den|quiero|queremos|necesito|necesitamos|pongan|hagan|ponme|suban|asciendan|dale|denle|haceme)\b/i

    if (!patronAdmin.test(texto)) return
    if (!patronPeticion.test(texto)) return

    // OWNER
    let tipo = 'usuario'

    if (esOwner(m)) {
      tipo = 'owner'
    } else {
      // ADMIN DEL GRUPO
      const participante = participants.find(p => {
        const jid = p.id || p.jid
        return jid === m.sender
      })

      if (
        participante?.admin === 'admin' ||
        participante?.admin === 'superadmin' ||
        participante?.admin === 'owner'
      ) {
        tipo = 'admin'
      }
    }

    const lista = RESPUESTAS[tipo]
    const respuesta =
      lista[Math.floor(Math.random() * lista.length)]

    await conn.sendMessage(
      m.chat,
      { text: respuesta },
      { quoted: m }
    )

  } catch (e) {
    console.error('❌ Error en noadmin:', e)
  }
}

handler.customPrefix =
  /\b(admin|administrador|administradora|admins)\b/i

handler.command = new RegExp()
handler.group = true

export default handler
