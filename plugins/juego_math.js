// 📂 plugins/math.js
// 🧮 Juego de matemáticas — FelixCat_Bot 🐈
// Generador + respuestas en un solo plugin

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

const operators = ["+", "-", "*", "/"]

// ============================================================
// 🔢 COMPROBAR NÚMERO
// ============================================================

function isNumber(x) {
    return typeof x === "number" && !isNaN(x)
}

// ============================================================
// 🧮 GENERAR OPERACIÓN
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
            Math.random() * (max - min + 1)
        ) + min

    const b =
        Math.floor(
            Math.random() * (max - min + 1)
        ) + min

    const op =
        operators[
            Math.floor(
                Math.random() * operators.length
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
            result = parseFloat(
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
// 🎮 JUEGO PRINCIPAL
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
            `Usa *${usedPrefix}juegos* para activarlos.`,
            m
        )
    }

    // ========================================================
    // 📚 AYUDA
    // ========================================================

    const textoAyuda = `
🧮 *JUEGO DE MATEMÁTICAS*

🌵 Elige una dificultad:

🚩 *Dificultades disponibles:*

• noob
• easy
• medium
• hard

━━━━━━━━━━━━━━━━━━━━

📝 *Ejemplos:*

${usedPrefix}math noob
${usedPrefix}math easy
${usedPrefix}math medium
${usedPrefix}math hard

━━━━━━━━━━━━━━━━━━━━

💰 *PREMIOS*

🟢 Noob → 50 monedas
🔵 Easy → 100 monedas
🟠 Medium → 200 monedas
🔴 Hard → 500 monedas
`.trim()

    // ========================================================
    // ❓ SIN DIFICULTAD
    // ========================================================

    if (!args || !args[0]) {

        return conn.reply(
            m.chat,
            textoAyuda,
            m
        )
    }

    // ========================================================
    // 🎯 OBTENER DIFICULTAD
    // ========================================================

    const mode =
        String(args[0]).toLowerCase().trim()

    if (!modes[mode]) {

        return conn.reply(
            m.chat,
            `❌ *Dificultad no válida.*\n\n${textoAyuda}`,
            m
        )
    }

    // ========================================================
    // 🚫 YA EXISTE UNA PARTIDA
    // ========================================================

    const id = m.chat

    if (global.math[id]) {

        return conn.reply(
            m.chat,
            `🌵 *Ya hay una pregunta activa en este chat.*\n\n` +
            `💡 Responde la pregunta actual antes de iniciar otra.`,
            global.math[id][0]
        )
    }

    // ========================================================
    // 🧮 GENERAR MATEMÁTICA
    // ========================================================

    const math =
        genMath(mode)

    // ========================================================
    // 👤 CREAR USUARIO
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

            `🧮 *¿Cuánto es el resultado de:*\n\n` +
            `➤ *${math.str}* ❓\n\n` +
            `🎯 Dificultad: *${mode.toUpperCase()}*\n` +
            `⏱️ Tiempo: *${math.time / 1000} segundos*\n` +
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
                        "❌ Error enviando resultado:",
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
// 🧷 RESPUESTAS DEL JUEGO
// ============================================================

handler.before = async function (
    m,
    { conn }
) {

    const chatSettings =
        global.db.data.chats[m.chat] || {}

    if (chatSettings.games === false)
        return

    const id = m.chat

    if (!global.math[id])
        return

    const [
        gameMsg,
        math
    ] = global.math[id]

    // ========================================================
    // 🔒 SOLO RESPONDER CITANDO EL JUEGO
    // ========================================================

    const quotedId =
        m.message
            ?.extendedTextMessage
            ?.contextInfo
            ?.stanzaId ||
        m.quoted?.id

    if (
        !quotedId ||
        quotedId !== gameMsg.key.id
    ) {
        return
    }

    // ========================================================
    // 🔢 OBTENER RESPUESTA
    // ========================================================

    let texto =
        String(m.text || "")
            .trim()
            .replace(",", ".")

    if (!/^-?\d+(\.\d+)?$/.test(texto))
        return

    const respuestaUsuario =
        Number(texto)

    const respuestaCorrecta =
        Number(math.result)

    // ========================================================
    // 👤 USUARIO
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
    // 🎉 RESPUESTA CORRECTA
    // ========================================================

    if (
        respuestaUsuario ===
        respuestaCorrecta
    ) {

        user.monedas += math.bonus

        await conn.reply(
            m.chat,

            `🎉 *¡RESPUESTA CORRECTA!*\n\n` +
            `🧮 Resultado: *${math.result}*\n` +
            `💰 Premio: *+${math.bonus.toLocaleString()} monedas*\n` +
            `💳 Saldo: *${user.monedas.toLocaleString()} monedas*`,

            m
        )

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

            `❌ *SIN INTENTOS*\n\n` +
            `✔️ La respuesta correcta era:\n` +
            `*${math.result}*`,

            m
        )

        clearTimeout(
            global.math[id][3]
        )

        delete global.math[id]

        return
    }

    // ========================================================
    // 🔁 TODAVÍA QUEDAN INTENTOS
    // ========================================================

    await conn.reply(
        m.chat,

        `❌ *Respuesta incorrecta.*\n\n` +
        `🔁 Intentos restantes: *${intentos}*`,

        m
    )
}

// ============================================================
// 🔢 DETECTOR DE RESPUESTAS NUMÉRICAS
// ============================================================

// Permite:
// 5
// -5
// 5.5
// 5,5
// -5,5

handler.customPrefix =
    /^-?\d+([.,]\d+)?$/

// ============================================================
// 📌 COMANDOS
// ============================================================

// IMPORTANTE:
// Se usa RegExp para que reconozca:
// .math
// .mates
// .matematicas
// .matemáticas

handler.command =
    /^(math|mates|matematicas|matemáticas)$/i

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

export default handler
