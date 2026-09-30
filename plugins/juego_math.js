// 📂 plugins/math.js
// 🧮 Juego de matemáticas — FelixCat_Bot 🐈
// Generador + sistema de respuestas en un solo plugin

global.math = global.math || {}

// ============================================================
// 🎯 DIFICULTADES
// ============================================================

const modes = {
    noob: {
        min: 1,
        max: 10,
        time: 20000,
        bonus: 50
    },

    easy: {
        min: 10,
        max: 50,
        time: 30000,
        bonus: 100
    },

    medium: {
        min: 50,
        max: 200,
        time: 40000,
        bonus: 200
    },

    hard: {
        min: 200,
        max: 1000,
        time: 60000,
        bonus: 500
    }
}

// ============================================================
// ➕ OPERADORES
// ============================================================

const operators = [
    "+",
    "-",
    "*",
    "/"
]

// ============================================================
// 🔢 COMPROBAR NÚMERO
// ============================================================

function isNumber(x) {
    return typeof x === "number" && !isNaN(x)
}

// ============================================================
// 🧮 GENERADOR DE OPERACIÓN
// ============================================================

function genMath(mode) {

    const {
        min,
        max,
        time,
        bonus
    } = modes[mode]

    const a =
        Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min

    const b =
        Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min

    const op =
        operators[
            Math.floor(
                Math.random() *
                operators.length
            )
        ]

    let result

    switch (op) {

        case "+":
            result = a + b
            break

        case "-":
            result = a - b
            break

        case "*":
            result = a * b
            break

        case "/":
            result =
                b === 0
                    ? a
                    : parseFloat(
                        (a / b).toFixed(2)
                    )
            break
    }

    return {
        str: `${a} ${op} ${b}`,
        result,
        time,
        bonus
    }
}

// ============================================================
// 🎮 HANDLER PRINCIPAL
// ============================================================

let handler = async (
    m,
    {
        conn,
        args,
        usedPrefix,
        command
    }
) => {

    // ========================================================
    // ⚙️ COMPROBAR JUEGOS
    // ========================================================

    const chatSettings =
        global.db.data.chats[m.chat] || {}

    if (chatSettings.games === false) {

        return conn.reply(
            m.chat,
            `⚠️ *Los juegos están desactivados en este chat.*\n\n` +
            `Usa *.juegos* para activarlos.`,
            m
        )
    }

    // ========================================================
    // 📚 AYUDA
    // ========================================================

    const textoAyuda = `
🧮 *JUEGO DE MATEMÁTICAS*

🌵 Ingresa la dificultad con la que deseas jugar.

🚩 *Dificultades disponibles:*
• noob
• easy
• medium
• hard

📝 *Ejemplo:*
${usedPrefix + command} noob

💰 *Premios:*
• Noob: 50 monedas
• Easy: 100 monedas
• Medium: 200 monedas
• Hard: 500 monedas
`.trim()

    // ========================================================
    // ❓ SIN DIFICULTAD
    // ========================================================

    if (!args[0]) {

        return conn.reply(
            m.chat,
            textoAyuda,
            m
        )
    }

    // ========================================================
    // 🎯 DIFICULTAD
    // ========================================================

    const mode =
        args[0].toLowerCase()

    if (!(mode in modes)) {

        return conn.reply(
            m.chat,
            textoAyuda,
            m
        )
    }

    // ========================================================
    // 🚫 YA HAY UN JUEGO ACTIVO
    // ========================================================

    const id = m.chat

    if (id in global.math) {

        return conn.reply(
            m.chat,
            `🌵 *Todavía hay una pregunta activa en este chat.*\n\n` +
            `🧮 Responde la pregunta actual antes de iniciar otra.`,
            global.math[id][0]
        )
    }

    // ========================================================
    // 🧮 GENERAR OPERACIÓN
    // ========================================================

    const math =
        genMath(mode)

    // ========================================================
    // 💰 CREAR USUARIO
    // ========================================================

    if (!global.db.data.users[m.sender]) {

        global.db.data.users[m.sender] = {
            monedas: 0
        }
    }

    const user =
        global.db.data.users[m.sender]

    if (!isNumber(user.monedas))
        user.monedas = 0

    // ========================================================
    // 📩 ENVIAR PREGUNTA
    // ========================================================

    const gameMsg =
        await conn.reply(
            m.chat,

            `🧮 *¿Cuánto es el resultado de:* ${math.str} *?*\n\n` +

            `🎯 Dificultad: *${mode.toUpperCase()}*\n` +

            `⏱️ Tiempo: *${(
                math.time / 1000
            ).toFixed(2)} segundos*\n` +

            `🔁 Intentos: *4*\n` +

            `💰 Premio: *${math.bonus.toLocaleString()} monedas*`,

            m
        )

    // ========================================================
    // 💾 GUARDAR PARTIDA
    // ========================================================

    global.math[id] = [
        gameMsg,
        math,
        4,
        setTimeout(
            async () => {

                if (!global.math[id])
                    return

                try {

                    await conn.reply(
                        m.chat,

                        `⏳ *TIEMPO AGOTADO*\n\n` +
                        `🧮 Operación: *${math.str}*\n` +
                        `✔️ Respuesta correcta: *${math.result}*`,

                        gameMsg
                    )

                } catch (error) {

                    console.error(
                        "❌ Error enviando tiempo agotado:",
                        error
                    )
                }

                delete global.math[id]
            },

            math.time
        )
    ]
}

// ============================================================
// 🧷 SISTEMA DE RESPUESTAS
// ============================================================
// SOLO acepta respuestas citando el mensaje del juego.
// ============================================================

handler.before = async function (
    m,
    { conn }
) {

    // ========================================================
    // ⚙️ COMPROBAR JUEGOS
    // ========================================================

    const chatSettings =
        global.db.data.chats[m.chat] || {}

    if (chatSettings.games === false)
        return

    const id = m.chat

    // ========================================================
    // ❌ NO HAY PARTIDA
    // ========================================================

    if (!(id in global.math))
        return

    const [
        gameMsg,
        math
    ] = global.math[id]

    // ========================================================
    // 🧷 OBTENER ID DEL MENSAJE CITADO
    // ========================================================

    const quotedId =
        m.message
            ?.extendedTextMessage
            ?.contextInfo
            ?.stanzaId ||
        m.quoted?.id

    // ========================================================
    // 🔒 SOLO REPLY AL JUEGO
    // ========================================================

    if (
        !quotedId ||
        quotedId !== gameMsg.key.id
    ) {
        return
    }

    // ========================================================
    // 🔢 CONVERTIR RESPUESTA
    // ========================================================

    const respuestaUsuario =
        parseFloat(
            String(m.text || "")
                .replace(",", ".")
                .trim()
        )

    if (isNaN(respuestaUsuario))
        return

    const respuestaCorrecta =
        parseFloat(math.result)

    // ========================================================
    // 💰 ASEGURAR USUARIO
    // ========================================================

    if (!global.db.data.users[m.sender]) {

        global.db.data.users[m.sender] = {
            monedas: 0
        }
    }

    const user =
        global.db.data.users[m.sender]

    if (!isNumber(user.monedas))
        user.monedas = 0

    // ========================================================
    // 🎯 COMPROBAR RESPUESTA
    // ========================================================

    if (
        respuestaUsuario ===
        respuestaCorrecta
    ) {

        // 💰 PREMIO
        user.monedas += math.bonus

        await conn.reply(
            m.chat,

            `🎉 *¡RESPUESTA CORRECTA!*\n\n` +
            `🧮 Resultado: *${math.result}*\n` +
            `💰 Ganaste: *${math.bonus.toLocaleString()} monedas*\n` +
            `💳 Tus monedas: *${user.monedas.toLocaleString()}*`,

            m
        )

        // 🧹 TERMINAR PARTIDA
        clearTimeout(
            global.math[id][3]
        )

        delete global.math[id]

        return
    }

    // ========================================================
    // ❌ RESPUESTA INCORRECTA
    // ========================================================

    global.math[id][2]--

    const intentos =
        global.math[id][2]

    // ========================================================
    // 💀 SIN INTENTOS
    // ========================================================

    if (intentos <= 0) {

        await conn.reply(
            m.chat,

            `❌ *RESPUESTA INCORRECTA*\n\n` +
            `⏳ Se acabaron tus oportunidades.\n` +
            `✔️ La respuesta correcta era: *${math.result}*`,

            m
        )

        clearTimeout(
            global.math[id][3]
        )

        delete global.math[id]

        return
    }

    // ========================================================
    // 🔁 TODAVÍA TIENE INTENTOS
    // ========================================================

    await conn.reply(
        m.chat,

        `❌ *Respuesta incorrecta.*\n\n` +
        `🔁 Intentos restantes: *${intentos}*`,

        m
    )
}

// ============================================================
// 🔢 RESPUESTAS NUMÉRICAS
// ============================================================

// Acepta:
// 5
// -5
// 5.5
// -5.5
// 5,5

handler.customPrefix =
    /^-?[0-9]+([.,][0-9]+)?$/

handler.command =
    new RegExp

// ============================================================
// 📌 CONFIGURACIÓN
// ============================================================

handler.help = [
    "math",
    "math noob",
    "math easy",
    "math medium",
    "math hard"
]

handler.tags = [
    "game"
]

handler.command = [
    "math",
    "mates",
    "matemáticas"
]

export default handler
