// 📂 plugins/trivia.js
// 🎯 FelixCat_Bot — Trivia
// ✅ Basado en la estructura de juegos-bandera.js
// ✅ Usa handler.before
// ✅ Responde citando ESTE mensaje
// ⏱️ 30 segundos

console.log('[Plugin] trivia cargado')


// ============================================================
// 🧠 PREGUNTAS
// ============================================================

const preguntasTrivia = [

    {
        pregunta: '¿Cuál es el planeta más grande del sistema solar?',
        opciones: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'],
        respuesta: 'Júpiter'
    },

    {
        pregunta: "¿Quién pintó 'La última cena'?",
        opciones: [
            'Leonardo da Vinci',
            'Miguel Ángel',
            'Picasso',
            'Van Gogh'
        ],
        respuesta: 'Leonardo da Vinci'
    },

    {
        pregunta: '¿Cuál es el río más largo del mundo?',
        opciones: [
            'Amazonas',
            'Nilo',
            'Yangtsé',
            'Misisipi'
        ],
        respuesta: 'Amazonas'
    },

    {
        pregunta: '¿En qué año llegó el hombre a la Luna?',
        opciones: [
            '1965',
            '1969',
            '1971',
            '1959'
        ],
        respuesta: '1969'
    },

    {
        pregunta: '¿Cuál es el animal terrestre más veloz?',
        opciones: [
            'León',
            'Tigre',
            'Guepardo',
            'Lobo'
        ],
        respuesta: 'Guepardo'
    },

    {
        pregunta: '¿Cuál es el océano más grande?',
        opciones: [
            'Atlántico',
            'Índico',
            'Pacífico',
            'Ártico'
        ],
        respuesta: 'Pacífico'
    },

    {
        pregunta: '¿Qué gas respiramos para vivir?',
        opciones: [
            'Nitrógeno',
            'Oxígeno',
            'Dióxido de carbono',
            'Helio'
        ],
        respuesta: 'Oxígeno'
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
        pregunta: "¿Quién escribió 'Cien años de soledad'?",
        opciones: [
            'Mario Vargas Llosa',
            'Gabriel García Márquez',
            'Pablo Neruda',
            'Julio Cortázar'
        ],
        respuesta: 'Gabriel García Márquez'
    },

    {
        pregunta: '¿Cuál es el metal más ligero?',
        opciones: [
            'Aluminio',
            'Hierro',
            'Litio',
            'Mercurio'
        ],
        respuesta: 'Litio'
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
        pregunta: '¿Cuál es el idioma más hablado del mundo?',
        opciones: [
            'Inglés',
            'Mandarín',
            'Español',
            'Hindi'
        ],
        respuesta: 'Mandarín'
    },

    {
        pregunta: "¿Qué elemento químico tiene el símbolo 'O'?",
        opciones: [
            'Oro',
            'Oxígeno',
            'Osmio',
            'Oxalato'
        ],
        respuesta: 'Oxígeno'
    },

    {
        pregunta: '¿Qué país tiene forma de bota?',
        opciones: [
            'Portugal',
            'Italia',
            'Grecia',
            'España'
        ],
        respuesta: 'Italia'
    },

    {
        pregunta: '¿Cuál es la capital de Canadá?',
        opciones: [
            'Toronto',
            'Ottawa',
            'Vancouver',
            'Montreal'
        ],
        respuesta: 'Ottawa'
    },

    {
        pregunta: '¿Qué vitamina se obtiene principalmente mediante la exposición al sol?',
        opciones: [
            'Vitamina A',
            'Vitamina C',
            'Vitamina D',
            'Vitamina B12'
        ],
        respuesta: 'Vitamina D'
    },

    {
        pregunta: '¿Cuál es el país más poblado del mundo?',
        opciones: [
            'China',
            'India',
            'Estados Unidos',
            'Indonesia'
        ],
        respuesta: 'India'
    },

    {
        pregunta: '¿Qué órgano bombea la sangre en el cuerpo?',
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
    }

]


// ============================================================
// 🧹 NORMALIZAR TEXTO
// ============================================================

function normalizeText(texto) {

    if (!texto) return ''

    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^0-9a-zA-Z\s]/g, '')
        .trim()
        .toLowerCase()
}


// ============================================================
// 🎯 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn }) => {

    try {

        // Solo grupos
        if (!m.isGroup) return


        // ====================================================
        // 🔒 COMPROBAR JUEGOS
        // ====================================================

        const chatSettings =
            global.db?.data?.chats?.[m.chat] || {}

        if (chatSettings.games === false) {

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        '⚠️ Los juegos están desactivados en este chat.\n\n' +
                        'Usa *.juegos* para activarlos.'
                },
                {
                    quoted: m
                }
            )
        }


        // ====================================================
        // 🚫 YA HAY UNA TRIVIA ACTIVA
        // ====================================================

        if (!global.triviaGame) {
            global.triviaGame = {}
        }

        if (global.triviaGame[m.chat]) {

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        '⚠️ Ya hay una trivia activa en este grupo.\n\n' +
                        '📝 Respondé citando la pregunta actual.'
                },
                {
                    quoted: m
                }
            )
        }


        // ====================================================
        // 🎲 ELEGIR PREGUNTA
        // ====================================================

        const correct =
            preguntasTrivia[
                Math.floor(
                    Math.random() *
                    preguntasTrivia.length
                )
            ]


        // ====================================================
        // 🔀 CREAR OPCIONES
        // ====================================================

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

        options = options.sort(
            () => Math.random() - 0.5
        )


        // ====================================================
        // 📝 MENSAJE
        // ====================================================

        const text =
            `🧠 *TRIVIA DE CONOCIMIENTO*\n\n` +
            `❓ ${correct.pregunta}\n\n` +
            `${options
                .map(
                    (o, i) =>
                        `*${i + 1}.* ${o}`
                )
                .join('\n')}` +
            `\n\n` +
            `📝 Responde *citando ESTE mensaje*.\n` +
            `💡 Puedes responder con el nombre o con el número.\n` +
            `⏱️ *Tienes 30 segundos!*`


        // ====================================================
        // 📤 ENVIAR TRIVIA
        // ====================================================

        const msg = await conn.sendMessage(
            m.chat,
            {
                text
            }
        )


        // ====================================================
        // 💾 GUARDAR JUEGO
        // ====================================================

        global.triviaGame[m.chat] = {

            answer: correct.respuesta,

            options,

            question: correct.pregunta,

            answered: false,

            messageId:
                msg?.key?.id || null,

            timeout: setTimeout(
                async () => {

                    try {

                        const game =
                            global.triviaGame?.[m.chat]

                        if (
                            game &&
                            !game.answered
                        ) {

                            const failMsgs = [

                                `⏰ *¡Se acabó el tiempo!*\n\n` +
                                `❌ La respuesta era *${game.answer}*.`,

                                `💀 *¡Nadie acertó!*\n\n` +
                                `✅ La respuesta correcta era *${game.answer}*.`,

                                `⏰ *Tiempo agotado.*\n\n` +
                                `🧠 La respuesta era *${game.answer}*.`

                            ]

                            await conn.sendMessage(
                                m.chat,
                                {
                                    text:
                                        failMsgs[
                                            Math.floor(
                                                Math.random() *
                                                failMsgs.length
                                            )
                                        ]
                                },
                                {
                                    quoted: msg
                                }
                            )

                            delete global.triviaGame[m.chat]
                        }

                    } catch (error) {

                        console.error(
                            '[Trivia] Error en timeout:',
                            error
                        )

                        delete global.triviaGame[m.chat]
                    }

                },
                30000
            )
        }


    } catch (error) {

        console.error(
            '[Trivia] Error:',
            error
        )
    }
}


// ============================================================
// 🧠 DETECTAR RESPUESTAS
// ============================================================

handler.before = async (m, { conn }) => {

    try {

        const game =
            global.triviaGame?.[m.chat]

        if (
            !game ||
            game.answered ||
            !m.text
        ) return


        // ====================================================
        // 🔗 OBTENER MENSAJE CITADO
        // ====================================================

        const quotedId =
            m.quoted?.key?.id ||
            m.quoted?.id ||
            m.quoted?.stanzaId ||
            m.msg?.contextInfo?.stanzaId ||
            null


        // Si no cita ningún mensaje
        if (!quotedId) return


        // ====================================================
        // 🎯 SOLO EL MENSAJE DE LA TRIVIA
        // ====================================================

        if (
            quotedId !==
            game.messageId
        ) return


        // ====================================================
        // 📝 RESPUESTA
        // ====================================================

        const userAnswer =
            normalizeText(m.text)

        const normalizedAnswer =
            normalizeText(game.answer)


        // ====================================================
        // 🔢 RESPUESTA POR NÚMERO
        // ====================================================

        const isNumber =
            /^(1|2|3|4)$/.test(
                userAnswer
            )

        const chosenIndex =
            isNumber
                ? parseInt(
                    userAnswer,
                    10
                ) - 1
                : null


        // ====================================================
        // ✅ COMPROBAR
        // ====================================================

        const correctByName =
            userAnswer ===
            normalizedAnswer


        const correctByNumber =
            isNumber &&
            game.options[chosenIndex] &&
            normalizeText(
                game.options[chosenIndex]
            ) ===
            normalizedAnswer


        // ====================================================
        // 🎉 CORRECTO
        // ====================================================

        if (
            correctByName ||
            correctByNumber
        ) {

            clearTimeout(
                game.timeout
            )

            game.answered = true


            const winMsgs = [

                `🔥 *¡Correcto!*\n\n` +
                `🏆 Era *${game.answer}*!`,

                `🎉 *¡Excelente!*\n\n` +
                `✅ La respuesta era *${game.answer}*!`,

                `👏 *¡Bien hecho!*\n\n` +
                `🧠 *${game.answer}* era la respuesta correcta!`

            ]


            await conn.sendMessage(
                m.chat,
                {
                    text:
                        winMsgs[
                            Math.floor(
                                Math.random() *
                                winMsgs.length
                            )
                        ]
                },
                {
                    quoted: m
                }
            )


            delete global.triviaGame[
                m.chat
            ]

            return
        }


        // ====================================================
        // ❌ INCORRECTO
        // ====================================================

        const failMsgs = [

            '❌ *Incorrecto!*',

            '🤔 No, esa no es.',

            '🙃 Casi, pero no.',

            '💀 ¡Fallaste!',

            '❌ Esa respuesta no es correcta.'

        ]


        await conn.sendMessage(
            m.chat,
            {
                text:
                    failMsgs[
                        Math.floor(
                            Math.random() *
                            failMsgs.length
                        )
                    ]
            },
            {
                quoted: m
            }
        )


    } catch (error) {

        console.error(
            '[Trivia] Error procesando respuesta:',
            error
        )
    }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
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

handler.register = true


export default handler
