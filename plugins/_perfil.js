// 📂 plugins/perfil.js — PERFIL + INSIGNIAS 🐾🏅
// FELIXCAT_BOT — FELI 2026 PRO

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 RUTAS
// ============================================================

const dbPath = './database'

const perfilesFile = path.join(dbPath, 'perfiles.json')
const parejasFile = path.join(dbPath, 'parejas.json')
const hermanosFile = path.join(dbPath, 'hermanos.json')

// ============================================================
// 📂 CREAR DATABASE
// ============================================================

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true })
}

if (!fs.existsSync(perfilesFile)) {
  fs.writeFileSync(
    perfilesFile,
    JSON.stringify({}, null, 2)
  )
}

if (!fs.existsSync(parejasFile)) {
  fs.writeFileSync(
    parejasFile,
    JSON.stringify({}, null, 2)
  )
}

if (!fs.existsSync(hermanosFile)) {
  fs.writeFileSync(
    hermanosFile,
    JSON.stringify({}, null, 2)
  )
}

// ============================================================
// 💾 LOAD / SAVE
// ============================================================

const loadJSON = file => {
  try {
    const data = fs.readFileSync(
      file,
      'utf8'
    )

    return JSON.parse(data || '{}')

  } catch {
    return {}
  }
}

const saveJSON = (file, data) => {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  )
}

const loadPerfiles = () =>
  loadJSON(perfilesFile)

const savePerfiles = data =>
  saveJSON(perfilesFile, data)

const loadParejas = () =>
  loadJSON(parejasFile)

const loadHermanos = () =>
  loadJSON(hermanosFile)

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

const normalizeJid = (jid, conn) => {

  if (!jid) return null

  try {

    if (conn?.decodeJid) {
      jid = conn.decodeJid(jid)
    }

  } catch {}

  return jid
}

// ============================================================
// 🔍 COMPARAR JID
// ============================================================

const sameUser = (a, b, conn) => {

  if (!a || !b) return false

  a = normalizeJid(a, conn)
  b = normalizeJid(b, conn)

  if (!a || !b) return false

  if (a === b) return true

  const clean = jid =>
    jid
      .split(':')[0]
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  const A = clean(a)
  const B = clean(b)

  return Boolean(
    A &&
    B &&
    A === B
  )
}

// ============================================================
// 🔎 BUSCAR JID EXISTENTE
// ============================================================

const findJid = (db, jid, conn) => {

  if (!jid) return null

  jid = normalizeJid(jid, conn)

  if (!jid) return null

  if (db[jid]) {
    return jid
  }

  for (const id of Object.keys(db)) {

    if (
      sameUser(
        id,
        jid,
        conn
      )
    ) {
      return id
    }
  }

  return jid
}

// ============================================================
// 🎂 CALCULAR EDAD
// ============================================================

const calcularEdad = fecha => {

  if (!fecha) return null

  const partes =
    fecha.split('/').map(Number)

  if (partes.length !== 3) {
    return null
  }

  const [d, m, a] = partes

  if (!d || !m || !a) {
    return null
  }

  const nacimiento =
    new Date(a, m - 1, d)

  if (isNaN(nacimiento.getTime())) {
    return null
  }

  const hoy = new Date()

  let edad =
    hoy.getFullYear() -
    nacimiento.getFullYear()

  const mes =
    hoy.getMonth() -
    nacimiento.getMonth()

  if (
    mes < 0 ||
    (
      mes === 0 &&
      hoy.getDate() <
      nacimiento.getDate()
    )
  ) {
    edad--
  }

  return edad
}

// ============================================================
// ♑ SIGNO ZODIACAL
// ============================================================

const signoZodiacal = fecha => {

  if (!fecha) return null

  const partes =
    fecha.split('/').map(Number)

  if (partes.length < 2) {
    return null
  }

  const [d, m] = partes

  if (!d || !m || m < 1 || m > 12) {
    return null
  }

  const signos = [
    ['Capricornio ♑', 19],
    ['Acuario ♒', 18],
    ['Piscis ♓', 20],
    ['Aries ♈', 19],
    ['Tauro ♉', 20],
    ['Géminis ♊', 20],
    ['Cáncer ♋', 22],
    ['Leo ♌', 22],
    ['Virgo ♍', 22],
    ['Libra ♎', 22],
    ['Escorpio ♏', 21],
    ['Sagitario ♐', 21],
    ['Capricornio ♑', 31]
  ]

  return d <= signos[m - 1][1]
    ? signos[m - 1][0]
    : signos[m][0]
}

// ============================================================
// ⏳ TIEMPO DE RELACIÓN
// ============================================================

const tiempoRelacion = fecha => {

  if (!fecha) return null

  const diff =
    Date.now() -
    Number(fecha)

  const dias =
    Math.max(
      0,
      Math.floor(
        diff / 86400000
      )
    )

  return `${dias} día(s)`
}

// ============================================================
// 🎂 DÍAS PARA CUMPLEAÑOS
// ============================================================

const diasParaCumple = fecha => {

  if (!fecha) return null

  const partes =
    fecha.split('/').map(Number)

  if (partes.length < 2) {
    return null
  }

  const [d, m] = partes

  if (!d || !m) {
    return null
  }

  const hoy = new Date()

  const año =
    hoy.getFullYear()

  let cumple =
    new Date(
      año,
      m - 1,
      d
    )

  if (cumple < hoy) {

    cumple =
      new Date(
        año + 1,
        m - 1,
        d
      )
  }

  return Math.ceil(
    (cumple - hoy) /
    86400000
  )
}

// ============================================================
// 👑 DUEÑO
// ============================================================

const getOwnerNumbers = () => {

  return (global.owner || [])
    .map(v => {

      if (Array.isArray(v)) {
        v = v[0]
      }

      return String(v)
        .replace(/[^0-9]/g, '')
    })
    .filter(Boolean)
}

const isOwner = jid => {

  const number =
    String(jid)
      .replace(/[^0-9]/g, '')

  return getOwnerNumbers()
    .includes(number)
}

// ============================================================
// 🎯 TARGET
// Mención > CITADO
// ============================================================

const getTarget = (m, conn) => {

  if (m.mentionedJid?.length) {

    return normalizeJid(
      m.mentionedJid[0],
      conn
    )
  }

  if (m.quoted?.sender) {

    return normalizeJid(
      m.quoted.sender,
      conn
    )
  }

  return null
}

// ============================================================
// 🏷️ TAG
// ============================================================

const tag = jid => {

  if (!jid) {
    return '@usuario'
  }

  return '@' +
    jid
      .split('@')[0]
      .split(':')[0]
}

// ============================================================
// 🧬 RANGO HERMANOS
// ============================================================

const rangoHermano = nivel => {

  nivel =
    Number(nivel || 0)

  if (nivel >= 300) {
    return '👑 Hermanos Supremos'
  }

  if (nivel >= 200) {
    return '🔥 Hermanos Legendarios'
  }

  if (nivel >= 120) {
    return '💪 Hermanos Fuertes'
  }

  if (nivel >= 60) {
    return '🤝 Hermanos Reales'
  }

  if (nivel >= 30) {
    return '🙂 Hermanos Cercanos'
  }

  return '👶 Hermanos Nuevos'
}

// ============================================================
// 👤 CREAR PERFIL
// ============================================================

const createProfile = (
  perfiles,
  jid
) => {

  if (!perfiles[jid]) {

    perfiles[jid] = {

      registered: Date.now(),

      joinGroup: null,

      insignias: [],

      genero: null,

      birth: null,

      bio: null

    }
  }

  const user =
    perfiles[jid]

  if (!Array.isArray(user.insignias)) {
    user.insignias = []
  }

  if (!('registered' in user)) {
    user.registered = Date.now()
  }

  if (!('joinGroup' in user)) {
    user.joinGroup = null
  }

  if (!('genero' in user)) {
    user.genero = null
  }

  if (!('birth' in user)) {
    user.birth = null
  }

  if (!('bio' in user)) {
    user.bio = null
  }

  return user
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    text,
    command
  }
) => {

  try {

    // ========================================================
    // 💾 CARGAR DATABASES
    // ========================================================

    const perfiles =
      loadPerfiles()

    const parejas =
      loadParejas()

    const hermanos =
      loadHermanos()

    // ========================================================
    // 👤 JID ACTUAL
    // ========================================================

    const jid =
      normalizeJid(
        m.sender,
        conn
      )

    if (!jid) {
      return m.reply(
        '❌ No se pudo identificar al usuario.'
      )
    }

    const username =
      jid
        .split('@')[0]
        .split(':')[0]

    // ========================================================
    // 👤 CREAR PERFIL
    // ========================================================

    const user =
      createProfile(
        perfiles,
        jid
      )

    if (
      m.isGroup &&
      !user.joinGroup
    ) {

      user.joinGroup =
        Date.now()

      savePerfiles(
        perfiles
      )
    }

    // ========================================================
    // 🛡️ PERMISOS
    // ========================================================

    const realOwner =
      isOwner(jid)

    const admin =
      m.isAdmin || false

    // ========================================================
    // ✍️ BIO
    // ========================================================

    if (command === 'bio') {

      if (!text?.trim()) {

        return m.reply(
          '✍️ Escribe tu nueva bio.\n\n' +
          'Ejemplo:\n' +
          '.bio Amante de la tecnología 🐾'
        )
      }

      user.bio =
        text.trim()

      savePerfiles(
        perfiles
      )

      return m.reply(
        '✅ *Bio actualizada correctamente.*'
      )
    }

    // ========================================================
    // ⚧️ GENERO
    // ========================================================

    if (command === 'genero') {

      if (!text?.trim()) {

        return m.reply(
          '⚧️ Escribe tu género.\n\n' +
          'Ejemplo:\n' +
          '.genero Masculino'
        )
      }

      user.genero =
        text.trim()

      savePerfiles(
        perfiles
      )

      return m.reply(
        '✅ *Género actualizado correctamente.*'
      )
    }

    // ========================================================
    // 🎂 FECHA NACIMIENTO
    // ========================================================

    if (command === 'setbr') {

      if (!text?.trim()) {

        return m.reply(
          '🎂 Usa el formato:\n\n' +
          '*.setbr 31/12/1998*'
        )
      }

      const fecha =
        text.trim()

      const partes =
        fecha.split('/').map(Number)

      if (
        partes.length !== 3 ||
        !partes.every(Boolean)
      ) {

        return m.reply(
          '❌ Formato incorrecto.\n\n' +
          'Usa:\n' +
          '*.setbr DD/MM/AAAA*'
        )
      }

      const edad =
        calcularEdad(fecha)

      if (
        edad === null ||
        edad < 0 ||
        edad > 120
      ) {

        return m.reply(
          '❌ Esa fecha de nacimiento no parece válida.'
        )
      }

      user.birth =
        fecha

      savePerfiles(
        perfiles
      )

      return m.reply(
        `🎂 *Fecha de nacimiento guardada.*

📅 ${fecha}
🎉 Edad actual: ${edad} años`
      )
    }

    // ========================================================
    // 🏅 OTORGAR INSIGNIA
    // ========================================================

    if (command === 'otorgar') {

      if (!realOwner && !admin) {

        return m.reply(
          '❌ Solo admins o dueño pueden otorgar insignias.'
        )
      }

      const targetRaw =
        getTarget(
          m,
          conn
        )

      if (!targetRaw) {

        return m.reply(
          '⚠️ Menciona o responde al usuario.'
        )
      }

      const target =
        findJid(
          perfiles,
          targetRaw,
          conn
        )

      const insignia =
        (text || '')
          .replace(/@\d+/g, '')
          .trim()

      if (!insignia) {

        return m.reply(
          '⚠️ Escribe la insignia que quieres otorgar.'
        )
      }

      const targetUser =
        createProfile(
          perfiles,
          target
        )

      targetUser.insignias.push(
        insignia
      )

      savePerfiles(
        perfiles
      )

      return conn.reply(
        m.chat,

        `🏅 *INSIGNIA OTORGADA*

👤 Usuario: ${tag(target)}

🏆 ${insignia}`,

        m,
        {
          mentions: [
            target
          ]
        }
      )
    }

    // ========================================================
    // ❌ QUITAR INSIGNIA
    // ========================================================

    if (command === 'quitar') {

      if (!realOwner && !admin) {

        return m.reply(
          '❌ Solo admins o dueño pueden quitar insignias.'
        )
      }

      const targetRaw =
        getTarget(
          m,
          conn
        )

      if (!targetRaw) {

        return m.reply(
          '⚠️ Menciona o responde al usuario.'
        )
      }

      const target =
        findJid(
          perfiles,
          targetRaw,
          conn
        )

      const targetUser =
        perfiles[target]

      if (
        !targetUser?.insignias?.length
      ) {

        return m.reply(
          '❌ Ese usuario no tiene insignias.'
        )
      }

      const insignia =
        (text || '')
          .replace(/@\d+/g, '')
          .trim()

      if (!insignia) {

        return m.reply(
          '⚠️ Escribe exactamente la insignia que quieres quitar.'
        )
      }

      const antes =
        targetUser.insignias.length

      targetUser.insignias =
        targetUser.insignias.filter(
          i => i !== insignia
        )

      if (
        targetUser.insignias.length === antes
      ) {

        return m.reply(
          `❌ ${tag(target)} no tiene esa insignia.`
        )
      }

      savePerfiles(
        perfiles
      )

      return conn.reply(
        m.chat,

        `❌ *INSIGNIA QUITADA*

👤 Usuario: ${tag(target)}

🏆 ${insignia}`,

        m,
        {
          mentions: [
            target
          ]
        }
      )
    }

    // ========================================================
    // 🏅 VER INSIGNIAS
    // ========================================================

    if (command === 'insignias') {

      const targetRaw =
        getTarget(
          m,
          conn
        )

      // ------------------------------------------------------
      // VER LAS DE UN USUARIO
      // ------------------------------------------------------

      if (targetRaw) {

        const target =
          findJid(
            perfiles,
            targetRaw,
            conn
          )

        const data =
          perfiles[target]

        if (
          !data?.insignias?.length
        ) {

          return conn.reply(
            m.chat,
            `🏅 ${tag(target)} no tiene insignias.`,
            m,
            {
              mentions: [
                target
              ]
            }
          )
        }

        const lista =
          data.insignias
            .map(
              (i, index) =>
                `${index + 1}. ${i}`
            )
            .join('\n')

        return conn.reply(
          m.chat,

          `🏅 *INSIGNIAS DE ${tag(target)}*

${lista}`,

          m,
          {
            mentions: [
              target
            ]
          }
        )
      }

      // ------------------------------------------------------
      // LISTAR TODOS
      // ------------------------------------------------------

      let texto =
        '🏅 *USUARIOS CON INSIGNIAS*\n\n'

      const mentions = []

      for (
        const id in perfiles
      ) {

        const data =
          perfiles[id]

        if (
          data.insignias?.length
        ) {

          texto +=
`👤 ${tag(id)}
${data.insignias.join(' ')}

`

          mentions.push(id)
        }
      }

      if (!mentions.length) {

        return m.reply(
          '❌ Nadie tiene insignias actualmente.'
        )
      }

      return conn.reply(
        m.chat,
        texto.trim(),
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // 🧹 CLEAR INSIGNIAS
    // ========================================================

    if (
      command === 'clearinsignias' ||
      command === 'clearins'
    ) {

      if (!admin && !realOwner) {

        return m.reply(
          '❌ Solo admins o dueño pueden usar este comando.'
        )
      }

      const targetRaw =
        getTarget(
          m,
          conn
        )

      // ------------------------------------------------------
      // 🧹 BORRAR INSIGNIAS DE UN USUARIO
      // ------------------------------------------------------

      if (targetRaw) {

        const target =
          findJid(
            perfiles,
            targetRaw,
            conn
          )

        if (
          !perfiles[target]?.insignias?.length
        ) {

          return conn.reply(
            m.chat,
            `❌ ${tag(target)} no tiene insignias.`,
            m,
            {
              mentions: [
                target
              ]
            }
          )
        }

        perfiles[target].insignias = []

        savePerfiles(
          perfiles
        )

        return conn.reply(
          m.chat,

          `🧹 *INSIGNIAS ELIMINADAS*

Se borraron todas las insignias de ${tag(target)}.`,

          m,
          {
            mentions: [
              target
            ]
          }
        )
      }

      // ------------------------------------------------------
      // 🧹 BORRAR TODAS
      // ------------------------------------------------------

      let eliminadas = 0

      for (
        const id in perfiles
      ) {

        if (
          Array.isArray(
            perfiles[id].insignias
          ) &&
          perfiles[id].insignias.length
        ) {

          eliminadas +=
            perfiles[id].insignias.length

          perfiles[id].insignias = []
        }
      }

      savePerfiles(
        perfiles
      )

      return m.reply(

        `🧹 *INSIGNIAS LIMPIADAS*

🏅 Insignias eliminadas: ${eliminadas}

✅ Se limpiaron todas las insignias del sistema.`

      )
    }

    // ========================================================
    // 👤 PERFIL
    // ========================================================

    if (command === 'perfil') {

      // ------------------------------------------------------
      // ❤️ PAREJA
      // ------------------------------------------------------

      let estadoTexto =
        '💔 Estado: Soltero/a'

      let parejaTexto = ''

      let amorTexto = ''

      let tiempoTexto = ''

      let parejaJid = null

      const parejaData =
        parejas[jid]

      if (
        parejaData?.pareja
      ) {

        parejaJid =
          findJid(
            parejas,
            parejaData.pareja,
            conn
          )

        // ====================================================
        // 💍 ESTADO DE LA RELACIÓN
        // ====================================================

        const estado =
          String(
            parejaData.estado || ''
          )
            .toLowerCase()
            .trim()

        if (
          [
            'casados',
            'casado',
            'casada',
            'matrimonio'
          ].includes(estado)
        ) {

          estadoTexto =
            '💍 Estado: Casado/a'

        } else if (
          [
            'divorciados',
            'divorciado',
            'divorciada'
          ].includes(estado)
        ) {

          estadoTexto =
            '💔 Estado: Divorciado/a'

        } else {

          estadoTexto =
            '💑 Estado: De novio/a'
        }

        parejaTexto =
          `❤️ Pareja: ${tag(parejaJid)}`

        amorTexto =
          `💖 Amor: ${parejaData.amor || 0}`

        tiempoTexto =
          parejaData.relacionFecha
            ? `⏳ Tiempo juntos: ${tiempoRelacion(
                parejaData.relacionFecha
              )}`
            : ''
      }

      // ------------------------------------------------------
      // 🧬 HERMANO
      // ------------------------------------------------------

      let hermanoTexto = ''

      let tiempoHermano = ''

      let hermanoJid = null

      const hermanoData =
        hermanos[jid]

      if (
        hermanoData?.hermano
      ) {

        hermanoJid =
          findJid(
            hermanos,
            hermanoData.hermano,
            conn
          )

        const nivel =
          Number(
            hermanoData.nivel || 0
          )

        const interacciones =
          Number(
            hermanoData.interacciones || 0
          )

        hermanoTexto =
`🧬 Hermano: ${tag(hermanoJid)}
💪 Nivel: ${nivel}
🏅 Rango: ${rangoHermano(nivel)}
🎮 Interacciones: ${interacciones}`

        tiempoHermano =
          hermanoData.hermandadFecha
            ? `⏳ Tiempo de hermandad: ${tiempoRelacion(
                hermanoData.hermandadFecha
              )}`
            : ''
      }

      // ------------------------------------------------------
      // 🎂 DATOS
      // ------------------------------------------------------

      const edad =
        user.birth
          ? calcularEdad(
              user.birth
            )
          : null

      const signo =
        user.birth
          ? signoZodiacal(
              user.birth
            )
          : null

      const diasCumple =
        user.birth
          ? diasParaCumple(
              user.birth
            )
          : null

      // ------------------------------------------------------
      // 👑 ROL
      // ------------------------------------------------------

      const rol =
        realOwner
          ? 'Dueño 👑'
          : admin
            ? 'Admin 🛡️'
            : 'Usuario 👤'

      // ------------------------------------------------------
      // 🏅 INSIGNIAS
      // ------------------------------------------------------

      const insigniasTexto =
        user.insignias?.length
          ? user.insignias
              .map(
                i => `• ${i}`
              )
              .join('\n')
          : 'Ninguna'

      // ------------------------------------------------------
      // 📋 PERFIL
      // ------------------------------------------------------

      const textoPerfil =

`👤 *PERFIL DE USUARIO*

━━━━━━━━━━━━━━━━━━

${tag(jid)}

⭐ Rol: ${rol}

━━━━━━━━━━━━━━━━━━

❤️ *RELACIÓN*

${estadoTexto}
${parejaTexto}
${amorTexto}
${tiempoTexto}

━━━━━━━━━━━━━━━━━━

🧬 *HERMANDAD*

${hermanoTexto || 'Sin hermano'}
${tiempoHermano}

━━━━━━━━━━━━━━━━━━

🏅 *INSIGNIAS*

${insigniasTexto}

━━━━━━━━━━━━━━━━━━

👤 *DATOS PERSONALES*

🚻 Género: ${user.genero || 'No definido'}

🎂 Nacimiento: ${user.birth || 'No registrado'}
${edad !== null ? `🎉 Edad: ${edad}` : ''}
${signo ? `🔮 Signo: ${signo}` : ''}
${
  diasCumple !== null
    ? `🎁 Faltan ${diasCumple} día(s) para tu cumpleaños`
    : ''
}

━━━━━━━━━━━━━━━━━━

📝 *BIO*

${user.bio || 'Sin bio'}

━━━━━━━━━━━━━━━━━━`

      // ------------------------------------------------------
      // 💾 GUARDAR
      // ------------------------------------------------------

      savePerfiles(
        perfiles
      )

      // ------------------------------------------------------
      // 🏷️ MENCIONES
      // ------------------------------------------------------

      const mentions = [
        jid
      ]

      if (parejaJid) {
        mentions.push(
          parejaJid
        )
      }

      if (hermanoJid) {
        mentions.push(
          hermanoJid
        )
      }

      // ------------------------------------------------------
      // 🖼️ FOTO PERFIL
      // ------------------------------------------------------

      let pp = null

      try {

        pp =
          await conn.profilePictureUrl(
            jid,
            'image'
          )

      } catch {}

      // ------------------------------------------------------
      // 📸 ENVIAR CON FOTO
      // ------------------------------------------------------

      if (pp) {

        return conn.sendMessage(
          m.chat,
          {
            image: {
              url: pp
            },

            caption:
              textoPerfil,

            mentions
          },
          {
            quoted: m
          }
        )
      }

      // ------------------------------------------------------
      // 📝 SIN FOTO
      // ------------------------------------------------------

      return conn.reply(
        m.chat,
        textoPerfil,
        m,
        {
          mentions
        }
      )
    }

  } catch (e) {

    console.error(
      '❌ Error en perfil.js:',
      e
    )

    return m.reply(
      '❌ Ocurrió un error interno en el sistema de perfil.'
    )
  }
}

// ============================================================
// 📋 COMANDOS
// ============================================================

handler.command = [

  // 👤 PERFIL
  'perfil',

  // 🎂 DATOS
  'setbr',
  'bio',
  'genero',

  // 🏅 INSIGNIAS
  'otorgar',
  'quitar',
  'insignias',

  // 🧹 LIMPIAR
  'clearinsignias',
  'clearins'

]

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
