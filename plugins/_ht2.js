/**
 * 📂 plugins/ht2.js
 * 👑 WHATSAPP-BOT — HT2 PRO
 *
 * Comandos:
 * .ht2
 * .ht2 test
 * .ht2 on
 * .ht2 on 2
 * .ht2 on 3
 * .ht2 on 6
 * .ht2 on 12
 * .ht2 estado
 * .ht2 off
 *
 * Acceso exclusivo: global.owner
 */

const INVITE_LINKS = [
  'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/EMFwLDMzjJ0KwUjaYDdSXT?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/BpNPJrkFY4EDSR4DsOyZMs?s=cl&p=a&mlu=4&ilr=4&iam=0'
]

const FRECUENCIAS = [1, 2, 3, 6, 12]
const recordatorios = new Map()

// ============================================================
// ⚙️ UTILIDADES
// ============================================================

function normalizarJid(jid = '') {
  return String(jid).trim().split(':')[0].toLowerCase()
}

function normalizarNumero(numero = '') {
  return String(numero).replace(/\D/g, '')
}

function esOwner(m) {
  const owners = Array.isArray(global.owner) ? global.owner : []

  const sender = normalizarNumero(
    String(m.sender || '').split('@')[0].split(':')[0]
  )

  if (!sender) return false

  return owners.some(owner => {
    const numero = Array.isArray(owner) ? owner[0] : owner
    return normalizarNumero(numero) === sender
  })
}

function obtenerCodigo(link) {
  return link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)?.[1] || null
}

function obtenerClavesParticipante(participante) {
  const claves = new Set()
  const id = String(participante?.id || '')
  const jid = normalizarJid(id)

  if (jid) claves.add(`jid:${jid}`)

  const esTelefono =
    id.endsWith('@s.whatsapp.net') ||
    id.endsWith('@c.us')

  const telefono =
    participante?.phoneNumber ||
    (esTelefono ? id.split('@')[0] : '')

  const numero = normalizarNumero(telefono)

  if (numero) claves.add(`num:${numero}`)

  return claves
}

function perteneceAUnGrupo(participante, miembros) {
  for (const clave of obtenerClavesParticipante(participante)) {
    if (miembros.has(clave)) return true
  }

  return false
}

// ============================================================
// 👥 OBTENER LOS TRES GRUPOS
// ============================================================

async function obtenerGruposObjetivo(conn) {
  if (typeof conn.groupGetInviteInfo !== 'function') {
    throw new Error(
      'Tu versión de Baileys no permite consultar los enlaces. ' +
      'Configura los ID reales de los tres grupos en el plugin.'
    )
  }

  const ids = new Set()

  for (const link of INVITE_LINKS) {
    const codigo = obtenerCodigo(link)

    if (!codigo) {
      throw new Error('Hay un enlace de invitación inválido.')
    }

    const info = await conn.groupGetInviteInfo(codigo)

    if (!info?.id) {
      throw new Error(
        'No se pudo obtener el ID de uno de los grupos.'
      )
    }

    ids.add(normalizarJid(info.id))
  }

  if (ids.size !== INVITE_LINKS.length) {
    throw new Error(
      'Los enlaces no corresponden a tres grupos diferentes.'
    )
  }

  return [...ids]
}

async function obtenerParticipantes(conn, grupoId) {
  const metadata = await conn.groupMetadata(grupoId)
  return metadata.participants || []
}

// ============================================================
// 📢 ENVIAR INVITACIÓN Y MENCIONAR PENDIENTES
// ============================================================

async function enviarRecordatorio(conn, chat) {
  const grupos = await obtenerGruposObjetivo(conn)
  const miembros = new Set()

  // Reunir participantes de los tres grupos de destino.
  for (const grupoId of grupos) {
    const participantes = await obtenerParticipantes(conn, grupoId)

    for (const participante of participantes) {
      for (const clave of obtenerClavesParticipante(participante)) {
        miembros.add(clave)
      }
    }
  }

  // Revisar el grupo donde se publica el aviso.
  const participantesAnuncio = await obtenerParticipantes(conn, chat)
  const menciones = []
  const vistos = new Set()
  const botJid = normalizarJid(conn.user?.id)

  for (const participante of participantesAnuncio) {
    const jid = participante.id

    if (!jid) continue

    const jidNormalizado = normalizarJid(jid)

    if (jidNormalizado === botJid) continue
    if (vistos.has(jidNormalizado)) continue

    vistos.add(jidNormalizado)

    // No mencionar a quien ya esté en alguno de los tres grupos.
    if (perteneceAUnGrupo(participante, miembros)) continue

    menciones.push(jid)
  }

  const enlaces = INVITE_LINKS
    .map((link, index) => `🔗 *Grupo ${index + 1}:*\n${link}`)
    .join('\n\n')

  const encabezado = menciones.length
    ? '👋 *Personas que todavía no están en los grupos:*\n' +
      menciones.map(jid => `@${jid.split('@')[0]}`).join(' ') +
      '\n\n'
    : '📢 *Compartimos los enlaces de nuestros grupos:*\n\n'

  await conn.sendMessage(chat, {
    text:
      '📢 *INVITACIÓN A NUESTROS GRUPOS*\n\n' +
      encabezado +
      enlaces,
    mentions: menciones
  })

  console.log(
    `[HT2 PRO] Grupo: ${chat} | Menciones: ${menciones.length}`
  )

  return menciones.length
}

// ============================================================
// ⏱️ FORMATO DE TIEMPO
// ============================================================

function formatoTiempo(ms) {
  if (ms <= 0) return 'ahora'

  const totalSegundos = Math.ceil(ms / 1000)
  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  const partes = []

  if (horas) partes.push(`${horas} h`)
  if (minutos) partes.push(`${minutos} min`)

  if (!horas && !minutos) {
    partes.push(`${segundos} s`)
  }

  return partes.join(' ')
}

// ============================================================
// 📊 ESTADO DEL RECORDATORIO
// ============================================================

function obtenerEstado(chat) {
  const estado = recordatorios.get(chat)

  if (!estado) {
    return (
      '📊 *ESTADO DE HT2 PRO*\n\n' +
      '🔴 Estado: desactivado\n' +
      `🔗 Enlaces configurados: ${INVITE_LINKS.length}\n\n` +
      '▶️ Activar: .ht2 on'
    )
  }

  const falta = estado.proximoEnvio - Date.now()

  const ultimoEnvio = estado.ultimoEnvio
    ? new Date(estado.ultimoEnvio).toLocaleString('es-UY', {
        timeZone: 'America/Montevideo'
      })
    : 'Sin envíos registrados'

  return (
    '📊 *ESTADO DE HT2 PRO*\n\n' +
    '🟢 Estado: activo\n' +
    `⏰ Frecuencia: cada ${estado.horas} hora(s)\n` +
    `🔗 Enlaces configurados: ${INVITE_LINKS.length}\n` +
    `📨 Último envío: ${ultimoEnvio}\n` +
    `⏳ Próximo envío: en ${formatoTiempo(falta)}\n\n` +
    '🧪 Probar: .ht2 test\n' +
    '🛑 Detener: .ht2 off'
  )
}

// ============================================================
// 👑 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, { conn, args }) => {
  // Solo owners.
  if (!esOwner(m)) {
    return m.reply(
      '⛔ *ACCESO DENEGADO*\n\n' +
      'Este comando es exclusivo de los owners de WHATSAPP-BOT.'
    )
  }

  if (!m.isGroup) {
    return m.reply(
      '⚠️ Este comando solo funciona dentro de un grupo.'
    )
  }

  const chat = m.chat
  const accion = String(args?.[0] || '').toLowerCase()

  // ----------------------------------------------------------
  // 📊 ESTADO
  // ----------------------------------------------------------

  if (accion === 'estado' || accion === 'status') {
    return m.reply(obtenerEstado(chat))
  }

  // ----------------------------------------------------------
  // 🧪 PRUEBA INMEDIATA
  // ----------------------------------------------------------

  if (accion === 'test' || accion === 'prueba') {
    try {
      const cantidad = await enviarRecordatorio(conn, chat)

      return m.reply(
        '✅ *PRUEBA COMPLETADA*\n\n' +
        `👥 Menciones realizadas: ${cantidad}\n` +
        '📨 Se envió el mensaje de invitación.'
      )
    } catch (error) {
      console.error('[HT2 PRO] Error en prueba:', error)

      return m.reply(
        `❌ *ERROR DE HT2*\n\n${error.message}`
      )
    }
  }

  // ----------------------------------------------------------
  // 🛑 APAGAR
  // ----------------------------------------------------------

  if (['off', 'stop'].includes(accion)) {
    const activo = recordatorios.get(chat)

    if (activo?.timer) {
      clearInterval(activo.timer)
    }

    recordatorios.delete(chat)

    return m.reply(
      '🛑 *HT2 DESACTIVADO*\n\n' +
      'Ya no se enviarán recordatorios automáticos en este grupo.'
    )
  }

  // ----------------------------------------------------------
  // 🟢 ACTIVAR
  // ----------------------------------------------------------

  if (['on', 'start'].includes(accion)) {
    const solicitadas = Number(args?.[1] || 1)

    if (!FRECUENCIAS.includes(solicitadas)) {
      return m.reply(
        '⚠️ Frecuencia no válida.\n\n' +
        'Usá una de estas opciones:\n' +
        '.ht2 on\n' +
        '.ht2 on 2\n' +
        '.ht2 on 3\n' +
        '.ht2 on 6\n' +
        '.ht2 on 12'
      )
    }

    const horas = solicitadas
    const anterior = recordatorios.get(chat)

    if (anterior?.timer) {
      clearInterval(anterior.timer)
    }

    recordatorios.delete(chat)

    try {
      // Envío inicial: no se manda confirmación adicional.
      await enviarRecordatorio(conn, chat)

      const ahora = Date.now()

      const estado = {
        timer: null,
        horas,
        ultimoEnvio: ahora,
        proximoEnvio: ahora + horas * 60 * 60 * 1000
      }

      estado.timer = setInterval(async () => {
        try {
          await enviarRecordatorio(conn, chat)

          const envio = Date.now()

          estado.ultimoEnvio = envio
          estado.proximoEnvio =
            envio + estado.horas * 60 * 60 * 1000
        } catch (error) {
          console.error('[HT2 PRO] Error en envío automático:', error)

          // Mantener actualizado el próximo intento aunque falle.
          estado.proximoEnvio =
            Date.now() + estado.horas * 60 * 60 * 1000
        }
      }, horas * 60 * 60 * 1000)

      recordatorios.set(chat, estado)

      // Sin mensaje de confirmación extra.
      return
    } catch (error) {
      console.error('[HT2 PRO] No se pudo activar:', error)

      return m.reply(
        '❌ *NO SE PUDO ACTIVAR HT2*\n\n' +
        `${error.message}\n\n` +
        'Revisá los enlaces y los permisos del bot.'
      )
    }
  }

  // ----------------------------------------------------------
  // 📖 AYUDA
  // ----------------------------------------------------------

  return m.reply(
    '👑 *HT2 PRO — PANEL DE CONTROL*\n\n' +
    '🧪 .ht2 test — probar envío inmediato\n' +
    '🟢 .ht2 on — cada 1 hora\n' +
    '🟢 .ht2 on 2 — cada 2 horas\n' +
    '🟢 .ht2 on 3 — cada 3 horas\n' +
    '🟢 .ht2 on 6 — cada 6 horas\n' +
    '🟢 .ht2 on 12 — cada 12 horas\n' +
    '📊 .ht2 estado — ver estado y próximo envío\n' +
    '🛑 .ht2 off — detener recordatorios'
  )
}

// ============================================================
// 📌 CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'ht2',
  'ht2 test',
  'ht2 on',
  'ht2 on 2',
  'ht2 on 3',
  'ht2 on 6',
  'ht2 on 12',
  'ht2 estado',
  'ht2 off'
]

handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
