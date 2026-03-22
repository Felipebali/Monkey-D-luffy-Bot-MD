// plugins/antispam.js
const userSpamData = {};

let handler = m => m;

handler.before = async function (m, { conn, isAdmin, isOwner }) {
    const chat = global.db.data.chats[m.chat];
    if (!chat || !chat.antiSpam) return;

    const who = m.sender;
    const currentTime = Date.now();
    const timeWindow = 4000; // 4 segundos
    const messageLimit = 3;  // 3 mensajes
    const warningLimit = 3;  // ⚠️ ahora 3 advertencias

    if (!(who in userSpamData)) {
        userSpamData[who] = {
            lastMessageTime: currentTime,
            messageCount: 1,
            warnings: 0
        };
        return;
    }

    const userData = userSpamData[who];
    const timeDifference = currentTime - userData.lastMessageTime;

    if (timeDifference <= timeWindow) {
        userData.messageCount++;

        if (userData.messageCount >= messageLimit) {
            const mention = `@${who.split('@')[0]}`;

            // 👑 OWNER (no se expulsa)
            if (isOwner) {
                return conn.sendMessage(m.chat, {
                    text: `👑 *Owner alerta*\n${mention}, estás enviando muchos mensajes.`,
                    mentions: [who]
                });
            }

            // ⚡ ADMIN (solo aviso)
            if (isAdmin) {
                return conn.sendMessage(m.chat, {
                    text: `⚡ *Admin alerta*\n${mention}, estás enviando mensajes muy rápido.`,
                    mentions: [who]
                });
            }

            // 🚨 USUARIO NORMAL
            userData.warnings++;

            const groupMetadata = await conn.groupMetadata(m.chat);
            const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            const isBotAdmin = groupMetadata.participants.some(
                p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            // ❌ SI LLEGA A 3 → EXPULSIÓN
            if (userData.warnings >= warningLimit) {
                if (isBotAdmin) {
                    await conn.sendMessage(m.chat, {
                        text: `❌ *SPAM DETECTADO*\n${mention} fue *expulsado* por exceder el límite de spam.`,
                        mentions: [who]
                    });

                    await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
                } else {
                    await conn.sendMessage(m.chat, {
                        text: `⚠️ No puedo expulsar a ${mention} porque no soy admin.`,
                        mentions: [who]
                    });
                }

                // 🔄 Reset total después del intento
                userData.warnings = 0;
                userData.messageCount = 0;
                userData.lastMessageTime = currentTime;

            } else {
                // ⚠️ Advertencia normal
                await conn.sendMessage(m.chat, {
                    text: `🚨 *Advertencia por spam*\n${mention}\n⚠️ ${userData.warnings}/${warningLimit} advertencias`,
                    mentions: [who]
                });

                userData.messageCount = 0;
                userData.lastMessageTime = currentTime;
            }
        }

    } else {
        // 🔄 Reset si pasa el tiempo
        userData.messageCount = 1;
        userData.lastMessageTime = currentTime;
    }
};

export default handler;
