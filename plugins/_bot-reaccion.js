
/**
 * 📂 plugins/bot-reaccion.js
 * 🤖 WHATSAPP-BOT — ASISTENTE LOCAL
 *
 * 🧠 Memoria persistente individual
 * 👑 Exclusivo para owners
 * 💬 Conversaciones sin prefijo
 * 📚 Aprendizaje de respuestas
 * 💾 Base de datos automática
 * 🔒 Memoria separada por usuario y grupo
 * 👥 Exclusivamente en grupos
 * 🔇 Sin spam
 * 🌐 Sin APIs externas
 * 🔑 Sin API Key
 */

import fs from 'node:fs'
import path from 'node:path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {

    database: './database/bot-memoria.json',

    maxHistorial: 100,

    maxRecuerdos: 200,

    maxAprendizajes: 200,

    maxTexto: 1000,

    maxRespuesta: 500,

    maxMensajesProcesados: 2000,

    zonaHoraria: 'America/Montevideo'
}

const procesando = new Set()
const mensajesProcesados = new Set()

// ============================================================
// 💾 CREAR BASE DE DATOS
// ============================================================

fs.mkdirSync(
    path.dirname(CONFIG.database),
    { recursive: true }
)

function crearBase() {

    return {
        version: 1,
        usuarios: {}
    }
}

function cargarBase() {

    if (!fs.existsSync(CONFIG.database)) {

        const nueva = crearBase()

        fs.writeFileSync(
            CONFIG.database,
            JSON.stringify(nueva, null, 2),
            {
                encoding: 'utf8',
                mode: 0o600
            }
        )

        return nueva
    }

    try {

        const data = JSON.parse(
            fs.readFileSync(
                CONFIG.database,
                'utf8'
            )
        )

        if (
            !data.usuarios ||
            typeof data.usuarios !== 'object' ||
            Array.isArray(data.usuarios)
        ) {

            throw new Error(
                'Base de datos inválida.'
            )
        }

        return data

    } catch (error) {

        console.error(
            '[BOT-MEMORIA] Error al cargar:',
            error.message
        )

        throw error
    }
}

let database = cargarBase()

// ============================================================
// 💾 GUARDADO SEGURO
// ============================================================

function guardarBase() {

    const temporal =
        `${CONFIG.database}.tmp`

    fs.writeFileSync(
        temporal,
        JSON.stringify(database, null, 2),
        {
            encoding: 'utf8',
            mode: 0o600
        }
    )

    fs.renameSync(
        temporal,
        CONFIG.database
    )
}

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function normalizar(texto = '') {

    return String(texto)

        .normalize('NFD')

        .replace(/[\u0300-\u036f]/g, '')

        .toLowerCase()

        .replace(/[¿?¡!.,;:]/g, ' ')

        .replace(/\s+/g, ' ')

        .trim()
}

function elegir(array) {

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ]
}

function fechaActual() {

    return new Date().toISOString()
}

function horaLocal() {

    return new Intl.DateTimeFormat(
        'es-UY',
        {
            timeZone: CONFIG.zonaHoraria,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }
    ).format(new Date())
}

function fechaLocal() {

    return new Intl.DateTimeFormat(
        'es-UY',
        {
            timeZone: CONFIG.zonaHoraria,
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }
    ).format(new Date())
}

function limpiarTexto(texto, max) {

    return String(texto || '')
        .trim()
        .slice(0, max)
}

// ============================================================
// 👤 IDENTIFICACIÓN DEL OWNER
// ============================================================

function obtenerIdentidad(m) {

    const sender = String(
        m.sender || ''
    )

    const alternativo = String(
        m.key?.participantAlt || ''
    )

    const candidatos = [
        sender,
        alternativo
    ].filter(Boolean)

    // Priorizar número normal cuando esté disponible.

    const telefono = candidatos.find(
        id => id.endsWith('@s.whatsapp.net')
    )

    const jid = telefono || sender

    if (!jid) return null

    return jid.replace(
        /:\d+@/,
        '@'
    )
}

// ============================================================
// 🧠 MEMORIA INDIVIDUAL
// ============================================================

function obtenerUsuario(m) {

    const identidad = obtenerIdentidad(m)

    if (!identidad) {
        throw new Error(
            'No se pudo identificar al owner.'
        )
    }

    // Separar memoria por grupo y owner.

    const id = `${m.chat}|${identidad}`

    if (!database.usuarios[id]) {

        database.usuarios[id] = {

            jid: identidad,

            grupo: m.chat,

            nombre: limpiarTexto(
                m.pushName || m.name || 'Owner',
                80
            ),

            creado: fechaActual(),

            ultimaConversacion: null,

            mensajes: 0,

            recuerdos: [],

            aprendizajes: [],

            historial: [],

            datos: {}
        }
    }

    return {
        id,
        usuario: database.usuarios[id]
    }
}

// ============================================================
// 📚 GUARDAR RECUERDOS
// ============================================================

function guardarRecuerdo(usuario, texto) {

    const recuerdo = limpiarTexto(
        texto,
        CONFIG.maxTexto
    )

    if (!recuerdo) return false

    const existe = usuario.recuerdos.some(
        item =>
            normalizar(item.texto) ===
            normalizar(recuerdo)
    )

    if (existe) return false

    usuario.recuerdos.push({

        texto: recuerdo,

        fecha: fechaActual()
    })

    if (
        usuario.recuerdos.length >
        CONFIG.maxRecuerdos
    ) {

        usuario.recuerdos =
            usuario.recuerdos.slice(
                -CONFIG.maxRecuerdos
            )
    }

    return true
}

// ============================================================
// 💬 GUARDAR CONVERSACIÓN
// ============================================================

function guardarConversacion(
    usuario,
    pregunta,
    respuesta
) {

    usuario.historial.push({

        pregunta: limpiarTexto(
            pregunta,
            CONFIG.maxTexto
        ),

        respuesta: limpiarTexto(
            respuesta,
            CONFIG.maxRespuesta
        ),

        fecha: fechaActual()
    })

    usuario.historial =
        usuario.historial.slice(
            -CONFIG.maxHistorial
        )

    usuario.mensajes++

    usuario.ultimaConversacion =
        fechaActual()
}

// ============================================================
// 🔎 BUSCAR RECUERDOS RELACIONADOS
// ============================================================

const PALABRAS_COMUNES = new Set([

    'bot', 'que', 'como', 'cual',

    'cuando', 'donde', 'quien',

    'para', 'por', 'con', 'del',

    'los', 'las', 'una', 'uno',

    'mis', 'tus', 'sobre', 'dime',

    'decime', 'sabes', 'recuerdas',

    'acordas', 'recuerdas', 'tengo',

    'tiene', 'algo', 'esto', 'eso'
])

function palabrasImportantes(texto) {

    return normalizar(texto)

        .split(' ')

        .filter(
            palabra =>
                palabra.length >= 3 &&
                !PALABRAS_COMUNES.has(palabra)
        )
}

function buscarRecuerdo(usuario, pregunta) {

    const palabras =
        palabrasImportantes(pregunta)

    if (!palabras.length) return null

    const resultados = usuario.recuerdos

        .map(item => {

            const tokens = new Set(
                palabrasImportantes(item.texto)
            )

            const coincidencias =
                palabras.filter(
                    palabra => tokens.has(palabra)
                ).length

            return {
                ...item,
                coincidencias
            }
        })

        .filter(
            item => item.coincidencias > 0
        )

        .sort(
            (a, b) =>
                b.coincidencias -
                a.coincidencias
        )

    return resultados[0] || null
}

// ============================================================
// 📖 APRENDER PREGUNTAS Y RESPUESTAS
// ============================================================

function aprender(usuario, pregunta, respuesta) {

    pregunta = limpiarTexto(
        pregunta,
        CONFIG.maxTexto
    )

    respuesta = limpiarTexto(
        respuesta,
        CONFIG.maxRespuesta
    )

    if (!pregunta || !respuesta) {

        return false
    }

    const clave = normalizar(pregunta)

    const existente =
        usuario.aprendizajes.find(
            item => item.clave === clave
        )

    if (existente) {

        existente.respuesta = respuesta
        existente.fecha = fechaActual()

        return true
    }

    usuario.aprendizajes.push({

        clave,

        pregunta,

        respuesta,

        fecha: fechaActual()
    })

    usuario.aprendizajes =
        usuario.aprendizajes.slice(
            -CONFIG.maxAprendizajes
        )

    return true
}

function buscarAprendizaje(usuario, pregunta) {

    const clave = normalizar(pregunta)

    const resultado =
        usuario.aprendizajes.find(
            item => item.clave === clave
        )

    return resultado?.respuesta || null
}

// ============================================================
// 🛡️ EVITAR GUARDAR SECRETOS EVIDENTES
// ============================================================

function contieneSecretos(texto) {

    return /\b(contrasena|password|api\s*key|token|clave privada|codigo de verificacion|codigo de seguridad|pin bancario)\b/i

        .test(normalizar(texto))
}

// ============================================================
// 📋 MENÚ DE MEMORIA
// ============================================================

function menuBot() {

    return `╭━━〔 🤖 *ASISTENTE LOCAL* 〕━━╮
┃
┃ 👑 Exclusivo para owners
┃ 🧠 Memoria individual
┃
┃ *💬 CONVERSACIÓN*
┃ ⌗ Bot hola
┃ ⌗ Bot cómo estás
┃ ⌗ Bot qué hora es
┃ ⌗ Bot qué día es
┃
┃ *📚 APRENDIZAJE*
┃ ⌗ Bot recuerda que <dato>
┃ ⌗ Bot aprende pregunta | respuesta
┃ ⌗ Bot me llamo <nombre>
┃
┃ *💾 MEMORIA*
┃ ⌗ Bot memoria
┃ ⌗ Bot recuerdos
┃ ⌗ Bot historial
┃ ⌗ Bot qué sabes de mí
┃ ⌗ Bot estadísticas
┃ ⌗ Bot olvida <dato>
┃ ⌗ Bot borrar memoria
┃ ⌗ Bot confirmar borrado
┃
┃ 🔒 Memoria por owner y grupo
┃ 🌐 Sin APIs externas
┃ ⚠️ No compartas contraseñas
┃
╰━━〔 *WHATSAPP-BOT* 〕━━╯`
}

// ============================================================
// 🧠 GENERAR RESPUESTA LOCAL
// ============================================================

function responderLocal(
    usuario,
    mensaje
) {

    const original = mensaje.trim()

    const texto = normalizar(original)

    const nombre = usuario.nombre || 'Owner'

    // ========================================================
    // 📋 MENÚ
    // ========================================================

    if (
        /^(menu|ayuda|comandos|funciones)$/
            .test(texto)
    ) {

        return {
            respuesta: menuBot(),
            guardar: false
        }
    }

    // ========================================================
    // 🛡️ INFORMACIÓN SENSIBLE
    // ========================================================

    if (contieneSecretos(original)) {

        return {
            respuesta:
                '🔒 No guardo contraseñas, tokens ni claves de seguridad.',
            guardar: false
        }
    }

    // ========================================================
    // 🗑️ BORRAR MEMORIA CON CONFIRMACIÓN
    // ========================================================

    if (
        /^(borrar memoria|eliminar memoria|limpiar memoria)$/
            .test(texto)
    ) {

        usuario.confirmarBorrado =
            Date.now() + 60000

        return {

            respuesta:
                '⚠️ Para borrar tu memoria de este grupo, escribí:\n\n' +
                '*Bot confirmar borrado*\n\n' +
                'Tenés 60 segundos.',

            guardar: false
        }
    }

    if (texto === 'confirmar borrado') {

        if (
            !usuario.confirmarBorrado ||
            Date.now() >
                usuario.confirmarBorrado
        ) {

            return {

                respuesta:
                    '⚠️ No hay una solicitud de borrado vigente.',

                guardar: false
            }
        }

        return {
            respuesta:
                '🗑️ Eliminé tu memoria de este grupo.',
            borrar: true,
            guardar: false
        }
    }

    // ========================================================
    // 👤 APRENDER NOMBRE
    // ========================================================

    const nombreMatch = original.match(

        /^(?:me llamo|mi nombre es|llamame|llámame)\s+(.+)$/i
    )

    if (nombreMatch) {

        usuario.nombre = limpiarTexto(
            nombreMatch[1],
            80
        )

        usuario.datos.nombre =
            usuario.nombre

        return {

            respuesta:
                `🤖 Dale, ${usuario.nombre}. Voy a recordar tu nombre.`
        }
    }

    // ========================================================
    // 📚 ENSEÑAR RESPUESTAS
    // ========================================================

    const aprendizaje = original.match(

        /^(?:aprende|aprendé)\s+(.+)$/i
    )

    if (aprendizaje) {

        const partes =
            aprendizaje[1].split('|')

        if (partes.length < 2) {

            return {

                respuesta:
                    '📚 Uso:\n*Bot aprende pregunta | respuesta*',

                guardar: false
            }
        }

        const pregunta =
            partes.shift().trim()

        const respuesta =
            partes.join('|').trim()

        if (
            !aprender(
                usuario,
                pregunta,
                respuesta
            )
        ) {

            return {

                respuesta:
                    '❌ No pude guardar ese aprendizaje.',

                guardar: false
            }
        }

        return {

            respuesta:
                `🧠 Aprendí una respuesta nueva, ${nombre}.`,

            guardar: false
        }
    }

    // ========================================================
    // 💾 RECORDAR INFORMACIÓN
    // ========================================================

    const recordar = original.match(

        /^(?:recuerda que|recordá que|recorda que|acordate que|acuérdate que|acordate de|guarda que|guardá que)\s+(.+)$/i
    )

    if (recordar) {

        const dato = recordar[1]

        const guardado =
            guardarRecuerdo(
                usuario,
                dato
            )

        return {

            respuesta: guardado

                ? `🧠 Guardé ese recuerdo, ${nombre}.`

                : '🤖 Eso ya lo tenía guardado.'
        }
    }

    // ========================================================
    // 🗑️ OLVIDAR UN RECUERDO
    // ========================================================

    const olvidar = original.match(

        /^(?:olvida|olvidá|olvidate de)\s+(.+)$/i
    )

    if (olvidar) {

        const dato = normalizar(
            olvidar[1]
        )

        const anterior =
            usuario.recuerdos.length

        usuario.recuerdos =
            usuario.recuerdos.filter(

                item =>
                    !normalizar(item.texto)
                        .includes(dato)
            )

        // Quitar también conversaciones que
        // contengan el dato olvidado.

        usuario.historial =
            usuario.historial.filter(

                item =>

                    !normalizar(item.pregunta)
                        .includes(dato) &&

                    !normalizar(item.respuesta)
                        .includes(dato)
            )

        usuario.aprendizajes =
            usuario.aprendizajes.filter(

                item =>

                    !normalizar(item.pregunta)
                        .includes(dato) &&

                    !normalizar(item.respuesta)
                        .includes(dato)
            )

        for (
            const clave of
            Object.keys(usuario.datos)
        ) {

            if (
                normalizar(
                    usuario.datos[clave]
                ).includes(dato)
            ) {

                delete usuario.datos[clave]
            }
        }

        if (
            normalizar(usuario.nombre)
                .includes(dato)
        ) {

            usuario.nombre = 'Owner'
        }

        const eliminados =
            anterior -
            usuario.recuerdos.length

        return {

            respuesta:
                `🗑️ Recuerdos eliminados: ${eliminados}.\nTambién revisé el historial y los aprendizajes.`,

            guardar: false
        }
    }

    // ========================================================
    // 📊 ESTADÍSTICAS
    // ========================================================

    if (
        /^(estadisticas|stats|informacion)$/
            .test(texto)
    ) {

        return {

            respuesta: `╭━━〔 📊 *MEMORIA* 〕━━╮
┃ 👤 Owner: ${nombre}
┃ 💬 Conversaciones: ${usuario.mensajes}
┃ 🧠 Recuerdos: ${usuario.recuerdos.length}
┃ 📚 Aprendizajes: ${usuario.aprendizajes.length}
┃ 📖 Historial: ${usuario.historial.length}
┃ 💾 Memoria local
╰━━━━━━━━━━━━━━━━╯`,

            guardar: false
        }
    }

    // ========================================================
    // 📚 MOSTRAR RECUERDOS
    // ========================================================

    if (
        /^(memoria|recuerdos|que sabes de mi|que recuerdas de mi|que te acordas de mi)$/
            .test(texto)
    ) {

        if (!usuario.recuerdos.length) {

            return {

                respuesta:
                    `🤖 Todavía no tengo recuerdos guardados sobre vos, ${nombre}.`,

                guardar: false
            }
        }

        const recuerdos =
            usuario.recuerdos

                .slice(-10)

                .map(
                    (item, index) =>
                        `${index + 1}. ${item.texto}`
                )

                .join('\n')

        return {

            respuesta:
                `🧠 *TUS ÚLTIMOS RECUERDOS*\n\n${recuerdos}`,

            guardar: false
        }
    }

    // ========================================================
    // 📖 HISTORIAL
    // ========================================================

    if (texto === 'historial') {

        if (!usuario.historial.length) {

            return {

                respuesta:
                    '📖 Todavía no tenemos conversaciones guardadas.',

                guardar: false
            }
        }

        const historial =
            usuario.historial

                .slice(-5)

                .map(item =>

                    `👤 ${item.pregunta}\n` +
                    `🤖 ${item.respuesta}`
                )

                .join('\n\n')

        return {

            respuesta:
                `📖 *ÚLTIMAS CONVERSACIONES*\n\n${historial}`,

            guardar: false
        }
    }

    // ========================================================
    // 🧠 RESPUESTAS APRENDIDAS
    // ========================================================

    const aprendida =
        buscarAprendizaje(
            usuario,
            original
        )

    if (aprendida) {

        return {
            respuesta: aprendida
        }
    }

    // ========================================================
    // 👤 RECORDAR NOMBRE
    // ========================================================

    if (
        /como me llamo|cual es mi nombre|sabes mi nombre/
            .test(texto)
    ) {

        return {

            respuesta: usuario.datos.nombre

                ? `🤖 Te llamás ${usuario.datos.nombre}.`

                : `🤖 Te tengo identificado como ${nombre}, pero todavía no me enseñaste tu nombre.`
        }
    }

    // ========================================================
    // ⚽ APRENDER EQUIPO FAVORITO
    // ========================================================

    const equipo = original.match(

        /^(?:soy hincha de|mi equipo favorito es|soy del cuadro)\s+(.+)$/i
    )

    if (equipo) {

        usuario.datos.equipo =
            limpiarTexto(
                equipo[1],
                100
            )

        guardarRecuerdo(

            usuario,

            `Tu equipo favorito es ${usuario.datos.equipo}.`
        )

        return {

            respuesta:
                `⚽ Voy a recordar que sos hincha de ${usuario.datos.equipo}.`
        }
    }

    if (
        /de que cuadro soy|de que equipo soy|cual es mi equipo favorito|de quien soy hincha/
            .test(texto)
    ) {

        if (usuario.datos.equipo) {

            return {

                respuesta:
                    `⚽ Sos hincha de ${usuario.datos.equipo}.`
            }
        }

        const recuerdo =
            buscarRecuerdo(
                usuario,
                'equipo favorito hincha cuadro'
            )

        return {

            respuesta: recuerdo

                ? `🧠 Tengo guardado esto: ${recuerdo.texto}`

                : '🤖 Todavía no me dijiste de qué cuadro sos.'
        }
    }

    // ========================================================
    // 🎨 APRENDER COLOR FAVORITO
    // ========================================================

    const color = original.match(

        /^mi color favorito es\s+(.+)$/i
    )

    if (color) {

        usuario.datos.color =
            limpiarTexto(
                color[1],
                100
            )

        guardarRecuerdo(

            usuario,

            `Tu color favorito es ${usuario.datos.color}.`
        )

        return {

            respuesta:
                `🎨 Voy a recordar que tu color favorito es ${usuario.datos.color}.`
        }
    }

    if (
        /cual es mi color favorito/
            .test(texto)
    ) {

        return {

            respuesta: usuario.datos.color

                ? `🎨 Tu color favorito es ${usuario.datos.color}.`

                : '🤖 Todavía no me dijiste tu color favorito.'
        }
    }

    // ========================================================
    // ❤️ APRENDER GUSTOS
    // ========================================================

    const gusto = original.match(

        /^(?:me gusta|me encanta|mi comida favorita es|mi musica favorita es|mi música favorita es)\s+(.+)$/i
    )

    if (gusto) {

        guardarRecuerdo(
            usuario,
            original
        )

        return {

            respuesta:
                `🤖 Guardé ese dato sobre vos, ${nombre}.`
        }
    }

    // ========================================================
    // 🕒 HORA Y FECHA
    // ========================================================

    if (
        /que hora es|decime la hora|dime la hora/
            .test(texto)
    ) {

        return {

            respuesta:
                `🕒 Son las ${horaLocal()} en Uruguay.`
        }
    }

    if (
        /que dia es|que fecha es|fecha de hoy/
            .test(texto)
    ) {

        return {

            respuesta:
                `📅 Hoy es ${fechaLocal()}.`
        }
    }

    // ========================================================
    // 👋 SALUDOS
    // ========================================================

    if (
        /^(hola|holaa+|buenas|hey|ola)$/
            .test(texto)
    ) {

        return {

            respuesta: elegir([

                `🤖 ¡Hola, ${nombre}!`,

                `👀 ¿Cómo andás, ${nombre}?`,

                `😎 Acá estoy, ${nombre}.`,

                `🫡 Presente, jefe.`
            ])
        }
    }

    if (
        /buenos dias|buen dia/
            .test(texto)
    ) {

        return {

            respuesta:
                `☀️ ¡Buen día, ${nombre}!`
        }
    }

    if (
        /buenas tardes/
            .test(texto)
    ) {

        return {

            respuesta:
                `🌤️ ¡Buenas tardes, ${nombre}!`
        }
    }

    if (
        /buenas noches/
            .test(texto)
    ) {

        return {

            respuesta:
                `🌙 Buenas noches, ${nombre}.`
        }
    }

    // ========================================================
    // 💬 CONVERSACIONES PROGRAMADAS
    // ========================================================

    if (
        /como estas|como andas|todo bien/
            .test(texto)
    ) {

        return {

            respuesta: elegir([

                `🤖 Todo bien, ${nombre}. ¿Y vos?`,

                '😎 Funcionando perfectamente.',

                '🫡 Siempre disponible para ayudarte.'
            ])
        }
    }

    if (
        /quien sos|quien eres|como te llamas/
            .test(texto)
    ) {

        return {

            respuesta:
                '🤖 Soy whatsapp-bot, tu asistente local con memoria.'
        }
    }

    if (
        /quien es tu dueno|quien es tu owner/
            .test(texto)
    ) {

        return {

            respuesta:
                `👑 Te reconozco como uno de mis owners, ${nombre}.`
        }
    }

    if (
        /me reconoces|te acordas de mi|me recuerdas/
            .test(texto)
    ) {

        return {

            respuesta:
                `🧠 Te reconozco, ${nombre}. Tenemos ${usuario.mensajes} conversaciones registradas en este grupo.`
        }
    }

    if (
        /que hablamos|ultima conversacion|que te dije antes/
            .test(texto)
    ) {

        const anterior =
            usuario.historial.at(-1)

        return {

            respuesta: anterior

                ? `📖 Lo último que me dijiste fue: "${anterior.pregunta}".`

                : '🤖 Todavía no tenemos conversaciones anteriores.'
        }
    }

    if (
        /^(gracias|muchas gracias|genial|perfecto)$/
            .test(texto)
    ) {

        return {

            respuesta: elegir([

                `❤️ De nada, ${nombre}.`,

                '🫡 A tus órdenes.',

                '🤖 Para eso estoy.'
            ])
        }
    }

    if (
        /^(chau|adios|hasta luego|nos vemos)$/
            .test(texto)
    ) {

        return {

            respuesta:
                `👋 Nos vemos, ${nombre}.`
        }
    }

    // ========================================================
    // 🔎 RECUPERAR INFORMACIÓN RELACIONADA
    // ========================================================

    const recuerdo =
        buscarRecuerdo(
            usuario,
            original
        )

    if (recuerdo) {

        return {

            respuesta:
                `🧠 Encontré este recuerdo relacionado:\n\n${recuerdo.texto}`
        }
    }

    // ========================================================
    // 🤖 RESPONDER CUANDO SOLO DICEN BOT
    // ========================================================

    if (!texto) {

        return {

            respuesta: elegir([

                `🤖 ¿Sí, ${nombre}?`,

                `👀 Acá estoy, ${nombre}.`,

                '🫡 A tus órdenes, jefe.',

                '😎 ¿Qué necesitás?'
            ])
        }
    }

    // ========================================================
    // 💬 RESPUESTA CUANDO NO ENTIENDE
    // ========================================================

    return {

        respuesta: elegir([

            `🤖 Todavía no sé responder eso, ${nombre}. Podés enseñarme con:\n*Bot aprende pregunta | respuesta*`,

            '🧠 No tengo una respuesta aprendida para eso.',

            '🤖 Todavía estoy aprendiendo. Escribí *Bot menú* para ver mis funciones.'
        ])
    }
}

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function reaccionar(conn, m, emoji) {

    try {

        await conn.sendMessage(

            m.chat,

            {
                react: {
                    text: emoji,
                    key: m.key
                }
            }
        )

    } catch {}
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {

    conn,

    isOwner,

    isROwner

}) => {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) return

    // Evitar respuestas a mensajes del propio bot.

    if (m.fromMe || m.key?.fromMe) return

    // ========================================================
    // 👑 EXCLUSIVO PARA OWNERS
    // ========================================================

    if (!isOwner && !isROwner) return

    const texto = String(
        m.text || ''
    ).trim()

    if (!texto) return

    if (
        texto.length >
        CONFIG.maxTexto
    ) return

    // ========================================================
    // 🔎 DETECTAR PALABRA BOT
    // ========================================================

    const patron =
        /(?:^|[^\p{L}\p{N}_])bot(?=$|[^\p{L}\p{N}_])/iu

    if (!patron.test(texto)) return

    // Evitar interferir con otros comandos.

    if (/^[.!/#]/.test(texto)) return

    // ========================================================
    // 🛡️ EVITAR MENSAJES DUPLICADOS
    // ========================================================

    const mensajeId = m.key?.id

        ? `${m.chat}|${m.key.id}`

        : null

    if (
        mensajeId &&
        mensajesProcesados.has(mensajeId)
    ) return

    if (mensajeId) {

        mensajesProcesados.add(mensajeId)

        if (
            mensajesProcesados.size >
            CONFIG.maxMensajesProcesados
        ) {

            const primero =
                mensajesProcesados.values().next().value

            mensajesProcesados.delete(primero)
        }
    }

    const identidad = obtenerIdentidad(m)

    if (!identidad) return

    const clave = `${m.chat}|${identidad}`

    if (procesando.has(clave)) return

    procesando.add(clave)

    try {

        // ====================================================
        // 📝 EXTRAER MENSAJE DIRIGIDO AL BOT
        // ====================================================

        const mensaje = texto

            .replace(patron, ' ')

            .replace(/^[\s,.:;!?¿¡]+/, '')

            .trim()

        // ====================================================
        // 🧠 RECUPERAR MEMORIA
        // ====================================================

        const {
            id,
            usuario
        } = obtenerUsuario(m)

        // ====================================================
        // 💬 GENERAR RESPUESTA
        // ====================================================

        const resultado =
            responderLocal(
                usuario,
                mensaje
            )

        if (!resultado?.respuesta) return

        // ====================================================
        // 💾 ACTUALIZAR MEMORIA
        // ====================================================

        if (resultado.borrar) {

            delete database.usuarios[id]

        } else if (
            resultado.guardar !== false
        ) {

            guardarConversacion(

                usuario,

                mensaje || 'Bot',

                resultado.respuesta
            )
        }

        guardarBase()

        // ====================================================
        // 🎭 REACCIÓN ALEATORIA
        // ====================================================

        const emoji = elegir([

            '🤖',
            '🧠',
            '👀',
            '🫡',
            '😎',
            '🐾'
        ])

        await reaccionar(
            conn,
            m,
            emoji
        )

        // ====================================================
        // 📤 UNA SOLA RESPUESTA
        // ====================================================

        await conn.sendMessage(

            m.chat,

            {
                text: resultado.respuesta
            },

            {
                quoted: m
            }
        )

        console.log(

            `[BOT-MEMORIA] Owner: ${identidad} | ` +

            `Conversaciones: ${
                resultado.borrar
                    ? 0
                    : usuario.mensajes
            }`
        )

    } catch (error) {

        console.error(

            '[BOT-MEMORIA] ERROR:',

            error.message || error
        )

        await reaccionar(
            conn,
            m,
            '❌'
        )

    } finally {

        procesando.delete(clave)
    }
}

// ============================================================
// ⚙️ REGISTRO DEL PLUGIN
// ============================================================

handler.customPrefix =
    /(?:^|[^\p{L}\p{N}_])bot(?=$|[^\p{L}\p{N}_])/iu

handler.command = new RegExp()

handler.group = true

handler.owner = true

handler.register = false

handler.limit = false

export default handler
