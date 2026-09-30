let handler = async (m, { conn, isAdmin, isOwner, command }) => {
    if (!m.isGroup) return conn.sendMessage(m.chat, { text: '⚠️ Este comando solo funciona en grupos.' });
    if (!isAdmin && !isOwner) return conn.sendMessage(m.chat, { text: '⚠️ Solo admins pueden usar este comando.' });

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];

    switch (command.toLowerCase()) {

        case 'antilink':
            chat.antiLink = !chat.antiLink;
            await conn.sendMessage(m.chat, {
                text: chat.antiLink
                    ? '🔗 ¡Cuidado con los links! AntiLink activado ✅ Ahora los enlaces no pasarán desapercibidos 😎'
                    : '🔗 AntiLink desactivado ❌ ¡Los links ya pueden colarse sin problemas! 😅'
            });
            break;

        case 'antilink2':
            chat.antiLink2 = !chat.antiLink2;
            await conn.sendMessage(m.chat, {
                text: chat.antiLink2
                    ? '🌍 ¡Protección global activada! AntiLink Global ✅ Nadie puede escapar de los enlaces 🚫'
                    : '🌍 AntiLink Global desactivado ❌ Los enlaces vuelven a ser libres... cuidado 😏'
            });
            break;

        case 'antispam':
            chat.antiSpam = !chat.antiSpam;
            await conn.sendMessage(m.chat, {
                text: chat.antiSpam
                    ? '🛡️ AntiSpam activado ✅ ¡Que no te molesten los mensajes repetidos! 😎'
                    : '🛡️ AntiSpam desactivado ❌ Prepárate para recibir spam a placer 😅'
            });
            break;

        case 'modoadmin':
            chat.modoadmin = !chat.modoadmin;
            await conn.sendMessage(m.chat, {
                text: chat.modoadmin
                    ? `🔥 *MODO ADMIN ACTIVADO*

━━━━━━━━━━━━━━━━━━

👑 Solo los administradores pueden utilizar comandos.

🛡️ Los usuarios normales no podrán ejecutar comandos del bot.

━━━━━━━━━━━━━━━━━━

💡 Para desactivarlo:
*.modoadmin*`
                    : `😌 *MODO ADMIN DESACTIVADO*

━━━━━━━━━━━━━━━━━━

✅ Ahora todos los miembros pueden interactuar libremente con el bot.

━━━━━━━━━━━━━━━━━━

🤖 El bot vuelve a estar disponible para todos.`
            });
            break;
    }

    global.db.data.chats[m.chat] = chat;
};

handler.help = [
    'antilink',
    'antilink2',
    'antispam',
    'modoadmin'
];

handler.tags = ['config'];

handler.command = /^(antilink|antilink2|antispam|modoadmin)$/i;

handler.group = true;

export default handler;
