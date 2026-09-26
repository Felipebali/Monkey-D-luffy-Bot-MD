// plugins/mayormenor.js

let partidas = {};

let handler = async (m, { conn, command }) => {
    try {

        const chat = global.db.data.chats[m.chat] || {};

        if (!chat.games) {
            return await conn.sendMessage(m.chat, {
                text: '❌ Los juegos están desactivados. Usa .juegos para activarlos.'
            });
        }

        const usuario = m.sender;
        const mencion = '@' + usuario.split('@')[0];

        // ─────────────────────────────
        // 🎲 INICIAR JUEGO
        // ─────────────────────────────

        if (command === 'mayormenor') {

            if (partidas[usuario]) {
                return await conn.sendMessage(m.chat, {
                    text:
`🎲 *MAYOR O MENOR - FELIXCAT*

👤 ${mencion}

🔢 Número actual:
> ${partidas[usuario].numero}

🔥 Racha: *${partidas[usuario].racha}*

¿Será mayor o menor?

⬆️ *.mayor*
⬇️ *.menor*`,
                    mentions: [usuario]
                });
            }

            const numero = Math.floor(Math.random() * 100) + 1;

            partidas[usuario] = {
                numero: numero,
                racha: 0,
                chat: m.chat
            };

            const mensaje =
`✨ 🎲 *MAYOR O MENOR - FELIXCAT* 🎲 ✨

👤 ${mencion}

🔢 Número inicial:
> ${numero}

🤔 ¿El próximo número será mayor o menor?

⬆️ *.mayor*
⬇️ *.menor*

🔥 Racha: *0*

🌟 ¡A ver hasta dónde llegás! 😸`;

            return await conn.sendMessage(m.chat, {
                text: mensaje,
                mentions: [usuario]
            });
        }

        // ─────────────────────────────
        // ❌ NO HAY PARTIDA
        // ─────────────────────────────

        if (!partidas[usuario]) {
            return await conn.sendMessage(m.chat, {
                text:
`❌ ${mencion}, no tienes una partida activa.

🎲 Usa *.mayormenor* para comenzar.`,
                mentions: [usuario]
            });
        }

        const partida = partidas[usuario];

        // ─────────────────────────────
        // 🎲 GENERAR NUEVO NÚMERO
        // ─────────────────────────────

        const anterior = partida.numero;
        const nuevoNumero = Math.floor(Math.random() * 100) + 1;

        // ─────────────────────────────
        // 🎯 NÚMEROS IGUALES
        // ─────────────────────────────

        if (nuevoNumero === anterior) {

            return await conn.sendMessage(m.chat, {
                text:
`🎲 *¡NÚMEROS IGUALES!*

👤 ${mencion}

🔢 ${anterior} → ${nuevoNumero}

😸 No es mayor ni menor.

🔥 Tu racha continúa en: *${partida.racha}*

⬆️ *.mayor*
⬇️ *.menor*`,
                mentions: [usuario]
            });
        }

        // ─────────────────────────────
        // 🎯 COMPROBAR RESPUESTA
        // ─────────────────────────────

        const esMayor = nuevoNumero > anterior;
        const eligioMayor = command === 'mayor';
        const gano = eligioMayor === esMayor;

        // ─────────────────────────────
        // 🏆 GANÓ
        // ─────────────────────────────

        if (gano) {

            partida.numero = nuevoNumero;
            partida.racha++;

            const mensaje =
`🎉 *¡CORRECTO!* 🎉

👤 ${mencion}

🔢 ${anterior} → *${nuevoNumero}*

${eligioMayor ? '⬆️' : '⬇️'} Elegiste:
*${eligioMayor ? 'MAYOR' : 'MENOR'}* ✅

🔥 Racha actual:
*${partida.racha}*

😸 ¡Muy bien, ${mencion}!

¿Seguimos?

⬆️ *.mayor*
⬇️ *.menor*`;

            return await conn.sendMessage(m.chat, {
                text: mensaje,
                mentions: [usuario]
            });
        }

        // ─────────────────────────────
        // 💀 PERDIÓ
        // ─────────────────────────────

        const rachaFinal = partida.racha;

        delete partidas[usuario];

        const mensaje =
`💀 *¡PERDISTE!* 💀

👤 ${mencion}

🔢 ${anterior} → *${nuevoNumero}*

${eligioMayor ? '⬆️' : '⬇️'} Elegiste:
*${eligioMayor ? 'MAYOR' : 'MENOR'}* ❌

🔥 Racha final:
*${rachaFinal}*

🎲 ¡Buen intento, ${mencion}! 😸

👉 *.mayormenor*`;

        await conn.sendMessage(m.chat, {
            text: mensaje,
            mentions: [usuario]
        });

    } catch (e) {

        console.error(e);

        await conn.sendMessage(m.chat, {
            text: '✖️ Ocurrió un error en el juego Mayor o Menor.'
        });
    }
};

handler.command = [
    'mayormenor',
    'mayor',
    'menor'
];

handler.group = true;
handler.admin = false;
handler.rowner = false;

export default handler;
