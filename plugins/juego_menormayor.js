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

        // ─────────────────────────────
        // 🎲 INICIAR JUEGO
        // ─────────────────────────────

        if (command === 'mayormenor') {

            if (partidas[usuario]) {
                return await conn.sendMessage(m.chat, {
                    text:
`🎲 *MAYOR O MENOR - FELIXCAT*

🔢 Número actual:
> ${partidas[usuario].numero}

🔥 Racha: *${partidas[usuario].racha}*

¿Será mayor o menor?

⬆️ *.mayor*
⬇️ *.menor*`
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

🔢 Número inicial:
> ${numero}

🤔 ¿El próximo número será mayor o menor?

⬆️ *.mayor*
⬇️ *.menor*

🔥 Racha: *0*

🌟 ¡A ver hasta dónde llegás! 😸`;

            return await conn.sendMessage(m.chat, {
                text: mensaje
            });
        }

        // ─────────────────────────────
        // ❌ NO HAY PARTIDA
        // ─────────────────────────────

        if (!partidas[usuario]) {
            return await conn.sendMessage(m.chat, {
                text:
`❌ *No tienes una partida activa.*

🎲 Usa *.mayormenor* para comenzar.`
            });
        }

        const partida = partidas[usuario];

        // ─────────────────────────────
        // 🎲 GENERAR NUEVO NÚMERO
        // ─────────────────────────────

        const anterior = partida.numero;

        const nuevoNumero = Math.floor(Math.random() * 100) + 1;

        // ─────────────────────────────
        // 🎯 COMPROBAR RESPUESTA
        // ─────────────────────────────

        const esMayor = nuevoNumero > anterior;
        const eligioMayor = command === 'mayor';

        // Si son iguales, no cuenta como mayor ni menor
        if (nuevoNumero === anterior) {

            return await conn.sendMessage(m.chat, {
                text:
`🎲 *¡NÚMEROS IGUALES!*

🔢 ${anterior} → ${nuevoNumero}

😸 No es mayor ni menor.

🔥 Tu racha continúa en: *${partida.racha}*

⬆️ *.mayor*
⬇️ *.menor*`
            });
        }

        const gano = eligioMayor === esMayor;

        // ─────────────────────────────
        // 🏆 GANÓ
        // ─────────────────────────────

        if (gano) {

            partida.numero = nuevoNumero;
            partida.racha++;

            const mensaje =
`🎉 *¡CORRECTO!* 🎉

🔢 ${anterior} → *${nuevoNumero}*

${eligioMayor ? '⬆️' : '⬇️'} Elegiste:
*${eligioMayor ? 'MAYOR' : 'MENOR'}* ✅

🔥 Racha actual:
*${partida.racha}*

😸 ¡Muy bien!

¿Seguimos?

⬆️ *.mayor*
⬇️ *.menor*`;

            return await conn.sendMessage(m.chat, {
                text: mensaje
            });
        }

        // ─────────────────────────────
        // 💀 PERDIÓ
        // ─────────────────────────────

        const rachaFinal = partida.racha;

        delete partidas[usuario];

        const mensaje =
`💀 *¡PERDISTE!* 💀

🔢 ${anterior} → *${nuevoNumero}*

${eligioMayor ? '⬆️' : '⬇️'} Elegiste:
*${eligioMayor ? 'MAYOR' : 'MENOR'}* ❌

🔥 Racha final:
*${rachaFinal}*

🎲 ¡Inténtalo nuevamente!

👉 *.mayormenor*`;

        await conn.sendMessage(m.chat, {
            text: mensaje
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
