let handler = async (m, { conn, isAdmin, isOwner, command }) => {

    if (!m.isGroup)
        return conn.sendMessage(m.chat, {
            text: '⚠️ Este comando solo funciona en grupos.'
        });

    if (!isAdmin && !isOwner)
        return conn.sendMessage(m.chat, {
            text: '⚠️ Solo admins pueden usar este comando.'
        });

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {};

    let chat = global.db.data.chats[m.chat];

    switch (command.toLowerCase()) {

        // ============================================================
        // 🔗 ANTILINK
        // ============================================================

        case 'antilink':

            chat.antiLink = !chat.antiLink;

            await conn.sendMessage(m.chat, {
                text: chat.antiLink

                    ? `╭━━━━━━━━━━━━━━━━━━╮
┃ 🔗 *ANTILINK ACTIVADO*
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Protección:* ACTIVADA ✅

🚫 Los enlaces de grupos no permitidos serán detectados.
🗑️ El mensaje será eliminado.
👤 El usuario podrá ser expulsado.

✨ *El grupo está protegido.*`

                    : `╭━━━━━━━━━━━━━━━━━━╮
┃ 🔗 *ANTILINK DESACTIVADO*
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Protección:* DESACTIVADA ❌

🔓 Los enlaces podrán enviarse nuevamente.

⚠️ *La protección contra enlaces está apagada.*`
            });

            break;


        // ============================================================
        // 🌍 ANTILINK 2
        // 📱 INSTAGRAM • 🎵 TIKTOK • ▶️ YOUTUBE
        // ============================================================

        case 'antilink2':

            chat.antiLink2 = !chat.antiLink2;

            await conn.sendMessage(m.chat, {
                text: chat.antiLink2

                    ? `╭━━━━━━━━━━━━━━━━━━╮
┃ 🌍 *ANTILINK SOCIAL*
┃      *ACTIVADO* 🛡️
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Protección:* ACTIVADA ✅

📱 *Instagram* → Protegido
🎵 *TikTok* → Protegido
▶️ *YouTube* → Protegido

🔗 Los enlaces de estas plataformas serán controlados.

🗑️ Los enlaces que correspondan serán bloqueados.

✨ *Protección de redes sociales activada.*`

                    : `╭━━━━━━━━━━━━━━━━━━╮
┃ 🌍 *ANTILINK SOCIAL*
┃     *DESACTIVADO* ❌
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Protección:* DESACTIVADA

📱 *Instagram* → Permitido
🎵 *TikTok* → Permitido
▶️ *YouTube* → Permitido

🔓 Los enlaces de estas plataformas podrán enviarse nuevamente.

⚠️ *La protección de redes sociales está apagada.*`
            });

            break;


        // ============================================================
        // 🛡️ ANTISPAM
        // ============================================================

        case 'antispam':

            chat.antiSpam = !chat.antiSpam;

            await conn.sendMessage(m.chat, {
                text: chat.antiSpam

                    ? `╭━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ *ANTISPAM ACTIVADO*
╰━━━━━━━━━━━━━━━━━━╯

⚡ *Protección:* ACTIVADA ✅

🚫 Se controlarán los mensajes repetitivos.
🧹 El spam será detectado.
🔒 El grupo queda protegido.

✨ *AntiSpam está funcionando.*`

                    : `╭━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ *ANTISPAM DESACTIVADO*
╰━━━━━━━━━━━━━━━━━━╯

⚡ *Protección:* DESACTIVADA ❌

🔓 Los mensajes repetitivos ya no serán controlados.

⚠️ *AntiSpam está apagado.*`
            });

            break;


        // ============================================================
        // 👑 MODO ADMIN
        // ============================================================

        case 'modoadmin':

            chat.modoadmin = !chat.modoadmin;

            await conn.sendMessage(m.chat, {
                text: chat.modoadmin

                    ? `╭━━━━━━━━━━━━━━━━━━╮
┃ 👑 *MODO ADMIN*
┃      *ACTIVADO* 🔥
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Estado:* ACTIVO

👑 Solo los administradores pueden utilizar comandos.
🚫 Los miembros normales no podrán ejecutar comandos del bot.

━━━━━━━━━━━━━━━━━━

💡 Para desactivarlo:
*.modoadmin*

✨ *Control administrativo activado.*`

                    : `╭━━━━━━━━━━━━━━━━━━╮
┃ 👑 *MODO ADMIN*
┃     *DESACTIVADO* 😌
╰━━━━━━━━━━━━━━━━━━╯

🛡️ *Estado:* INACTIVO

✅ Todos los miembros pueden interactuar nuevamente con el bot.

━━━━━━━━━━━━━━━━━━

🤖 *El bot vuelve a estar disponible para todos.*`
            });

            break;
    }

    global.db.data.chats[m.chat] = chat;
};


// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
    'antilink',
    'antilink2',
    'antispam',
    'modoadmin'
];


// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
    'config'
];


// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command =
    /^(antilink|antilink2|antispam|modoadmin)$/i;


// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true;

export default handler;
