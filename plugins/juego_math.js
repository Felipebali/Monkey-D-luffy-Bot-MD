// 📂 plugins/math.js
// 🧮 Juego de Matemáticas — FelixCat_Bot 🐈
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

    const { min, max, time, bonus } = modes[mode]

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

    try {

        // ====================================================
        // ⚙️ COMPROBAR JUEGOS
        // ====================================================

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

        // ====================================================
        // 📚 AYUDA
        // ====================================================

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

        // ====================================================
        // ❓ SIN DIFICULTAD
        // ====================================================

        if (!args || !args[0]) {

            return conn.reply(
                m.chat,
                textoAyuda,
                m
            )
        }

        // ====================================================
        // 🎯 OBTENER DIFICULTAD
        // ====================================================

        const mode =
            String(args[0])
                .toLowerCase()
                .trim()

        if (!modes[mode]) {

            return conn.reply(
                m.chat,
                `❌ *Dificultad no válida.*\n\n${textoAyuda}`,
                m
            )
        }

        // ====================================================
        // 🚫 YA HAY UNA PARTIDA
        // ====================================================

        const id = m.chat

        if (global.math[id]) {

            return conn.reply(
                m.chat,
                `🌵 *Todavía hay una pregunta activa en este chat.*\n\n` +
                `🧮 Responde la pregunta actual antes de iniciar otra.`,
                global.math[id][0]
            )
        }

        // ====================================================
        // 🧮 GENERAR OPERACIÓN
        // ====================================================

        const math =
            genMath(mode)

        // ====================================================
        // 👤 CREAR USUARIO
        // ====================================================

        if (!global.db.data.users[m.sender]) {

            global.db.data.users[m.sender] = {
                monedas: 0
            }
        }

        const user =
            global.db.data.users[m.sender]

        if (!isNumber(user.monedas))
            user.monedas = 0

        // ====================================================
        // 📩 ENVIAR PREGUNTA
        // ====================================================

        const gameMsg =
            await conn.reply(
                m.chat,

                `🧮 *¿Cuánto es el resultado de:*\n\n` +
                `➤ *${math.str}* ❓\n\n` +
                `🎯 Dificultad: *${mode.toUpperCase()}*\n` +
                `⏱️ Tiempo: *${(math.time / 1000).toFixed(2)} segundos*\n` +
                `🔁 Intentos: *4*\n` +
                `💰 Premio: *${math.bonus.toLocaleString()} monedas*`,

                m
            )

        // ====================================================
        // 💾 GUARDAR PARTIDA
        // ====================================================

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
                            `✔️ La respuesta correcta era: *${math.result}*`,

                            gameMsg
                        )

                    } catch (error) {

                        console.error(
                            "❌ Error en tiempo agotado:",
                            error
                        )
                    }

                    delete global.math[id]

                },
                math.time
            )
        ]

    } catch (error) {

        console.error(
            "❌ ERROR EN MATH:",
            error
        )

        return conn.reply(
            m.chat,
            `❌ *Ocurrió un error al iniciar el juego.*\n\n` +
            `Revisa la consola del bot para ver el error.`,
            m
        )
    }
}

// ============================================================
// 🧷 RESPUESTAS DEL JUEGO
// ============================================================

handler.before = async function (
    m,
    { conn }
) {

    try {

        const chatSettings =
            global.db.data.chats[m.chat] || {}

        if (chatSettings.games === false)
            return

        const id = m.chat

        // No hay juego activo
        if (!global.math[id])
            return

        const [
            gameMsg,
            math
        ] = global.math[id]

        // ====================================================
        // 🔒 SOLO RESPONDER CITANDO EL MENSAJE DEL JUEGO
        // ====================================================

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

        // ====================================================
        // 🔢 OBTENER RESPUESTA
        // ====================================================

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

        // ====================================================
        // 👤 CREAR USUARIO
        // ====================================================

        if (!global.db.data.users[m.sender]) {

            global.db.data.users[m.sender] = {
                monedas: 0
            }
        }

        const user =
            global.db.data.users[m.sender]

        if (!isNumber(user.monedas))
            user.monedas = 0

        // ====================================================
        // 🎉 RESPUESTA CORRECTA
        // ====================================================

        if (
            respuestaUsuario ===
            respuestaCorrecta
        ) {

            user.monedas += math.bonus

            await conn.reply(
                m.chat,

                `🎉 *¡RESPUESTA CORRECTA!*\n\n` +
                `🧮 Resultado: *${math.result}*\n` +
                `💰 Ganaste: *${math.bonus.toLocaleString()} monedas*\n` +
                `💳 Tus monedas: *${user.monedas.toLocaleString()}*`,

                m
            )

            clearTimeout(
                global.math[id][3]
            )

            delete global.math[id]

            return
        }

        // ====================================================
        // ❌ RESPUESTA INCORRECTA
        // ====================================================

        global.math[id][2]--

        const intentos =
            global.math[id][2]

        if (intentos <= 0) {

            await conn.reply(
                m.chat,

                `❌ *SE ACABARON LOS INTENTOS*\n\n` +
                `✔️ La respuesta correcta era: *${math.result}*`,

                m
            )

            clearTimeout(
                global.math[id][3]
            )

            delete global.math[id]

            return
        }

        await conn.reply(
            m.chat,

            `❌ *Respuesta incorrecta.*\n\n` +
            `🔁 Intentos restantes: *${intentos}*`,

            m
        )

    } catch (error) {

        console.error(
            "❌ ERROR EN RESPUESTA MATH:",
            error
        )
    }
}

// ============================================================
// 🔢 DETECTOR DE RESPUESTAS NUMÉRICAS
// ============================================================

handler.customPrefix =
    /^-?\d+([.,]\d+)?$/

// ============================================================
// 📌 COMANDOS
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

// ⚠️ IMPORTANTE:
// Usamos ARRAY, igual que tus plugins originales.

handler.command = [
    "math",
    "mates",
    "matematicas",
    "matemáticas"
]

export default handler
