// 📂 plugins/trivia.js

let handler = async (m, { conn }) => {
    try {
        if (!m.isGroup) return

        const chatSettings =
            global.db?.data?.chats?.[m.chat] || {}

        if (chatSettings.games === false) {
            return conn.sendMessage(
                m.chat,
                {
                    text: '⚠️ Los juegos están desactivados en este chat.'
                },
                { quoted: m }
            )
        }

        if (!global.triviaGame) {
            global.triviaGame = {}
        }

        if (global.triviaGame[m.chat]) {
            return conn.sendMessage(
                m.chat,
                {
                    text: '⚠️ Ya hay una trivia activa. Respondé citando la pregunta.'
                },
                { quoted: m }
            )
        }

        const preguntas = [
            {
                pregunta: '¿Cuál es el planeta más grande del sistema solar?',
                opciones: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'],
                respuesta: 'Júpiter'
            },
            {
                pregunta: '¿Cuál es la capital de Japón?',
                opciones: ['Seúl', 'Tokio', 'Kioto', 'Osaka'],
                respuesta: 'Tokio'
            },
            {
                pregunta: '¿Qué país ganó el Mundial de fútbol 2022?',
                opciones: ['Francia', 'Brasil', 'Argentina', 'España'],
                respuesta: 'Argentina'
            },
            {
                pregunta: '¿Qué órgano bombea la sangre?',
                opciones: ['Pulmón', 'Corazón', 'Riñón', 'Hígado'],
                respuesta: 'Corazón'
            },
            {
                pregunta: '¿Qué instrumento mide la temperatura?',
                opciones: ['Barómetro', 'Termómetro', 'Higrómetro', 'Anemómetro'],
                respuesta: 'Termómetro'
            }
        ]

        const correct =
            preguntas[Math.floor(Math.random() * preguntas.length)]

        let options = [correct.respuesta]

        while (options.length < 4) {
            const opcion =
                correct.opciones[
                    Math.floor(Math.random() * correct.opciones.length)
                ]

            if (!options.includes(opcion)) {
                options.push(opcion)
            }
        }

        options.sort(() => Math.random() - 0.5)

        const texto =
            `🧠 *TRIVIA*\n\n` +
            `❓ *${correct.pregunta}*\n\n` +
            options
                .map((o, i) => `*${i + 1}.* ${o}`)
                .join('\n') +
            `\n\n📝 Respondé citando ESTE mensaje.\n` +
            `⏱️ Tenés *30 segundos*.`

        const msg = await conn.sendMessage(
            m.chat,
            { text: texto }
        )

        global.triviaGame[m.chat] = {
            answer: correct.respuesta,
            options,
            messageId: msg?.key?.id,
            answered: false
        }

        global.triviaGame[m.chat].timeout =
            setTimeout(async () => {
                const game = global.triviaGame?.[m.chat]

                if (!game || game.answered) return

                await conn.sendMessage(
                    m.chat,
                    {
                        text:
                            `⏰ *Tiempo agotado.*\n\n` +
                            `✅ La respuesta era *${game.answer}*.`
                    }
                )

                delete global.triviaGame[m.chat]
            }, 30000)

    } catch (e) {
        console.error('[Trivia]', e)
    }
}


// ============================================================
// RESPUESTAS
// ============================================================

handler.before = async (m, { conn }) => {
    try {
        const game = global.triviaGame?.[m.chat]

        if (!game || game.answered || !m.text) return

        const quotedId =
            m.quoted?.key?.id ||
            m.quoted?.id ||
            m.quoted?.stanzaId ||
            m.msg?.contextInfo?.stanzaId

        if (!quotedId) return

        if (quotedId !== game.messageId) return

        const normalizar = texto =>
            String(texto || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase()

        const respuesta = normalizar(m.text)
        const correcta = normalizar(game.answer)

        let acertó = respuesta === correcta

        if (/^[1-4]$/.test(respuesta)) {
            const numero = Number(respuesta) - 1

            acertó =
                normalizar(game.options[numero]) === correcta
        }

        if (acertó) {
            clearTimeout(game.timeout)

            game.answered = true

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        `🎉 *¡CORRECTO!*\n\n` +
                        `🏆 La respuesta era *${game.answer}*`
                },
                { quoted: m }
            )

            delete global.triviaGame[m.chat]

        } else {
            await conn.sendMessage(
                m.chat,
                {
                    text: '❌ Incorrecto. ¡Podés volver a intentar!'
                },
                { quoted: m }
            )
        }

    } catch (e) {
        console.error('[Trivia respuesta]', e)
    }
}


handler.command = ['trivia']
handler.help = ['trivia']
handler.tags = ['juegos']
handler.group = true
handler.register = true

export default handler
