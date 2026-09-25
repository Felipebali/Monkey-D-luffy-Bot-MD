// 📂 plugins/trivia.js
// 🧠 Trivia — FelixCat_Bot

let handler = async (m, { conn }) => {
    try {

        // ============================================================
        // 👥 SOLO GRUPOS
        // ============================================================

        if (!m.isGroup) return

        // ============================================================
        // 🎮 COMPROBAR JUEGOS
        // ============================================================

        const chatSettings =
            global.db?.data?.chats?.[m.chat] || {}

        if (chatSettings.games === false) {

            return conn.sendMessage(
                m.chat,
                {
                    text: '⚠️ Los juegos están desactivados en este chat.\n\nUsa *.juegos* para activarlos.'
                },
                { quoted: m }
            )
        }

        // ============================================================
        // 🧠 CREAR SISTEMA DE TRIVIA
        // ============================================================

        if (!global.triviaGame) {
            global.triviaGame = {}
        }

        // ============================================================
        // ⚠️ YA HAY UNA TRIVIA
        // ============================================================

        if (global.triviaGame[m.chat]) {

            return conn.sendMessage(
                m.chat,
                {
                    text: '⚠️ Ya hay una trivia activa.\n\n📝 Respondé citando el mensaje de la trivia.'
                },
                { quoted: m }
            )
        }

        // ============================================================
        // ❓ PREGUNTAS
        // ============================================================

        const preguntas = [

            {
                pregunta: '¿Cuál es el planeta más grande del sistema solar?',
                opciones: [
                    'Marte',
                    'Júpiter',
                    'Saturno',
                    'Neptuno'
                ],
                respuesta: 'Júpiter'
            },

            {
                pregunta: '¿Cuál es la capital de Japón?',
                opciones: [
                    'Seúl',
                    'Tokio',
                    'Kioto',
                    'Osaka'
                ],
                respuesta: 'Tokio'
            },

            {
                pregunta: '¿Qué país ganó el Mundial de fútbol 2022?',
                opciones: [
                    'Francia',
                    'Brasil',
                    'Argentina',
                    'España'
                ],
                respuesta: 'Argentina'
            },

            {
                pregunta: '¿Qué órgano bombea la sangre?',
                opciones: [
                    'Pulmón',
                    'Corazón',
                    'Riñón',
                    'Hígado'
                ],
                respuesta: 'Corazón'
            },

            {
                pregunta: '¿Qué instrumento mide la temperatura?',
                opciones: [
                    'Barómetro',
                    'Termómetro',
                    'Higrómetro',
                    'Anemómetro'
                ],
                respuesta: 'Termómetro'
            },

            {
                pregunta: '¿Cuál es el océano más grande del mundo?',
                opciones: [
                    'Atlántico',
                    'Índico',
                    'Pacífico',
                    'Ártico'
                ],
                respuesta: 'Pacífico'
            },

            {
                pregunta: '¿Cuántos continentes hay tradicionalmente?',
                opciones: [
                    '5',
                    '6',
                    '7',
                    '8'
                ],
                respuesta: '7'
            },

            {
                pregunta: '¿Cuál es el planeta conocido como el planeta rojo?',
                opciones: [
                    'Venus',
                    'Marte',
                    'Mercurio',
                    'Urano'
                ],
                respuesta: 'Marte'
            },

            {
                pregunta: '¿Cuál es el animal terrestre más grande?',
                opciones: [
                    'Elefante africano',
                    'Jirafa',
                    'Hipopótamo',
                    'Rinoceronte'
                ],
                respuesta: 'Elefante africano'
            },

            {
                pregunta: '¿Cuántos días tiene una semana?',
                opciones: [
                    '5',
                    '6',
                    '7',
                    '8'
                ],
                respuesta: '7'
            }

        ]

        // ============================================================
        // 🎲 ELEGIR PREGUNTA
        // ============================================================

        const correct =
            preguntas[
                Math.floor(
                    Math.random() * preguntas.length
                )
            ]

        // ============================================================
        // 🔀 CREAR OPCIONES
        // ============================================================

        let options = [
            correct.respuesta
        ]

        while (options.length < 4) {

            const opcion =
                correct.opciones[
                    Math.floor(
                        Math.random() *
                        correct.opciones.length
                    )
                ]

            if (!options.includes(opcion)) {
                options.push(opcion)
            }
        }

        // ============================================================
        // 🔀 MEZCLAR OPCIONES
        // ============================================================

        options.sort(
            () => Math.random() - 0.5
        )

        // ============================================================
        // 🧠 MENSAJE DE TRIVIA
        // ============================================================

        const texto =
            `╭━━━〔 🧠 TRIVIA 〕━━━⬣\n` +
            `┃\n` +
            `┃ ❓ *${correct.pregunta}*\n` +
            `┃\n` +
            options
                .map(
                    (o, i) =>
                        `┃ ${i + 1}. ${o}`
                )
                .join('\n') +
            `\n┃\n` +
            `┃ 📝 Respondé *citando este mensaje*\n` +
            `┃ 💬 Podés responder con el número\n` +
            `┃    o escribir la respuesta.\n` +
            `┃\n` +
            `┃ ⏱️ Tenés *30 segundos*.\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`

        // ============================================================
        // 📤 ENVIAR TRIVIA
        // ============================================================

        const msg =
            await conn.sendMessage(
                m.chat,
                {
                    text: texto
                }
            )

        // ============================================================
        // 🔑 GUARDAR TODAS LAS FORMAS POSIBLES DEL ID
        // ============================================================

        const messageId =
            msg?.key?.id || null

        const remoteJid =
            msg?.key?.remoteJid || m.chat

        const participant =
            msg?.key?.participant || null

        // ============================================================
        // 💾 GUARDAR PARTIDA
        // ============================================================

        global.triviaGame[m.chat] = {

            answer:
                correct.respuesta,

            options,

            messageId,

            remoteJid,

            participant,

            answered: false,

            timeout: null
        }

        // ============================================================
        // ⏱️ TIEMPO LÍMITE
        // ============================================================

        global.triviaGame[m.chat].timeout =
            setTimeout(
                async () => {

                    try {

                        const game =
                            global.triviaGame?.[m.chat]

                        if (!game)
                            return

                        if (game.answered)
                            return

                        await conn.sendMessage(
                            m.chat,
                            {
                                text:
                                    `╭━━━〔 ⏰ TRIVIA TERMINADA 〕━━━⬣\n` +
                                    `┃\n` +
                                    `┃ Se terminó el tiempo.\n` +
                                    `┃\n` +
                                    `┃ ✅ La respuesta era:\n` +
                                    `┃ *${game.answer}*\n` +
                                    `┃\n` +
                                    `╰━━━━━━━━━━━━━━━━⬣`
                            }
                        )

                        delete global.triviaGame[m.chat]

                    } catch (e) {

                        console.error(
                            '❌ Error timeout trivia:',
                            e
                        )

                        delete global.triviaGame[m.chat]
                    }

                },
                30000
            )

    } catch (e) {

        console.error(
            '❌ Error iniciando trivia:',
            e
        )
    }
}


// ============================================================
// 🧠 RESPUESTAS DE LA TRIVIA
// ============================================================

handler.before = async (m, { conn }) => {

    try {

        // ========================================================
        // 🎮 OBTENER PARTIDA
        // ========================================================

        const game =
            global.triviaGame?.[m.chat]

        if (!game)
            return

        if (game.answered)
            return

        if (!m.text)
            return

        // ========================================================
        // 🔎 OBTENER ID DEL MENSAJE CITADO
        // ========================================================

        let quotedId = null

        // Forma 1
        if (m.quoted?.key?.id) {
            quotedId =
                m.quoted.key.id
        }

        // Forma 2
        if (!quotedId && m.quoted?.id) {
            quotedId =
                m.quoted.id
        }

        // Forma 3
        if (!quotedId && m.quoted?.stanzaId) {
            quotedId =
                m.quoted.stanzaId
        }

        // Forma 4
        if (
            !quotedId &&
            m.msg?.contextInfo?.stanzaId
        ) {
            quotedId =
                m.msg.contextInfo.stanzaId
        }

        // Forma 5
        if (
            !quotedId &&
            m.message?.extendedTextMessage?.contextInfo?.stanzaId
        ) {
            quotedId =
                m.message
                    .extendedTextMessage
                    .contextInfo
                    .stanzaId
        }

        // ========================================================
        // ❌ NO ESTÁ RESPONDIENDO A UN MENSAJE
        // ========================================================

        if (!quotedId)
            return

        // ========================================================
        // ❌ NO ES EL MENSAJE DE LA TRIVIA
        // ========================================================

        if (
            String(quotedId) !==
            String(game.messageId)
        ) {
            return
        }

        // ========================================================
        // 🧹 NORMALIZAR TEXTO
        // ========================================================

        const normalizar = texto => {

            return String(texto || '')
                .normalize('NFD')
                .replace(
                    /[\u0300-\u036f]/g,
                    ''
                )
                .trim()
                .toLowerCase()
        }

        const respuesta =
            normalizar(m.text)

        const correcta =
            normalizar(game.answer)

        // ========================================================
        // 🧠 COMPROBAR RESPUESTA
        // ========================================================

        let acerto =
            respuesta === correcta

        // ========================================================
        // 🔢 RESPUESTA POR NÚMERO
        // ========================================================

        if (
            /^[1-4]$/.test(respuesta)
        ) {

            const numero =
                Number(respuesta) - 1

            if (
                game.options[numero]
            ) {

                acerto =
                    normalizar(
                        game.options[numero]
                    ) === correcta
            }
        }

        // ========================================================
        // 🎉 CORRECTO
        // ========================================================

        if (acerto) {

            clearTimeout(
                game.timeout
            )

            game.answered =
                true

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        `╭━━━〔 🎉 ¡CORRECTO! 〕━━━⬣\n` +
                        `┃\n` +
                        `┃ 🏆 @${m.sender.split('@')[0]}\n` +
                        `┃\n` +
                        `┃ ✅ La respuesta era:\n` +
                        `┃ *${game.answer}*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━⬣`,
                    mentions: [
                        m.sender
                    ]
                },
                {
                    quoted: m
                }
            )

            delete global.triviaGame[m.chat]

            return
        }

        // ========================================================
        // ❌ INCORRECTO
        // ========================================================

        await conn.sendMessage(
            m.chat,
            {
                text:
                    `❌ *Respuesta incorrecta.*\n\n` +
                    `💡 Podés volver a intentar citando la trivia.`
            },
            {
                quoted: m
            }
        )

    } catch (e) {

        console.error(
            '❌ Error procesando respuesta de trivia:',
            e
        )
    }
}


// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = [
    'trivia'
]

handler.help = [
    'trivia'
]

handler.tags = [
    'juegos'
]

handler.group = true

export default handler
