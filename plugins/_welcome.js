// 📂 plugins/welcome.js
// 👋 Welcome + Leave
// 🖼️ Usa la foto del grupo si existe
// 🤖 Estilo WhatsApp-Bot
// ============================================================

let handler = async (m, { conn, isAdmin }) => {

    // ==========================================================
    // 👥 SOLO GRUPOS
    // ==========================================================

    if (!m.isGroup)
        return conn.sendMessage(m.chat, {
            text: "❌ Este comando solo funciona en grupos."
        });

    // ==========================================================
    // 👮 SOLO ADMINISTRADORES
    // ==========================================================

    if (!isAdmin)
        return conn.sendMessage(m.chat, {
            text: "⚠️ Solo los administradores pueden usar este comando."
        });

    // ==========================================================
    // 📂 BASE DE DATOS
    // ==========================================================

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {};

    let chat = global.db.data.chats[m.chat];

    // ==========================================================
    // 🔘 TOGGLE
    // ==========================================================

    if (typeof chat.welcome === 'undefined')
        chat.welcome = false;

    chat.welcome = !chat.welcome;

    await conn.sendMessage(m.chat, {
        text: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🤖 *WHATSAPP-BOT*
┃ 👋 *WELCOME / LEAVE*
╰━━━━━━━━━━━━━━━━━━━━━━╯

${chat.welcome ? "🟢 *ACTIVADO*" : "🔴 *DESACTIVADO*"}

${chat.welcome
    ? "🎉 Los mensajes de entrada y salida están activos."
    : "🔕 Los mensajes de entrada y salida están desactivados."}

━━━━━━━━━━━━━━━━━━━━━━
⚙️ *Estado:* ${chat.welcome ? "ACTIVO" : "INACTIVO"}
━━━━━━━━━━━━━━━━━━━━━━
        `.trim()
    });
};

// ============================================================
// 🔄 DETECTAR ENTRADAS Y SALIDAS
// ============================================================

handler.before = async function (m, { conn }) {

    if (!m.isGroup) return;

    // ==========================================================
    // 📂 BASE DE DATOS
    // ==========================================================

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {};

    let chat = global.db.data.chats[m.chat];

    // Si está desactivado
    if (!chat.welcome) return;

    // ==========================================================
    // 👥 INFORMACIÓN DEL GRUPO
    // ==========================================================

    let meta;

    try {
        meta = await conn.groupMetadata(m.chat);
    } catch {
        return;
    }

    const current = meta.participants.map(p => p.id);

    // ==========================================================
    // 🆕 PRIMERA VEZ
    // ==========================================================

    if (!chat.participants) {
        chat.participants = current;
        return;
    }

    const old = chat.participants;

    const added = current.filter(x => !old.includes(x));
    const removed = old.filter(x => !current.includes(x));

    const groupName = meta.subject || "Grupo";

    // ==========================================================
    // 🖼️ FOTO DEL GRUPO
    // ==========================================================

    let groupPhoto = null;

    try {

        groupPhoto = await conn.profilePictureUrl(
            m.chat,
            'image'
        );

    } catch {
        groupPhoto = null;
    }

    // ==========================================================
    // 🎉 ENTRADAS
    // ==========================================================

    for (let user of added) {

        let number = user.split("@")[0];

        let message = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🤖 *WHATSAPP-BOT*
┃ 🎉 *NUEVO MIEMBRO*
╰━━━━━━━━━━━━━━━━━━━━━━╯

👤 *Usuario:* @${number}

🏠 *Grupo:* ${groupName}

🎊 ¡Bienvenido/a al grupo!
✨ Esperamos que disfrutes tu estadía.

━━━━━━━━━━━━━━━━━━━━━━
🤖 *WhatsApp-Bot*
━━━━━━━━━━━━━━━━━━━━━━
        `.trim();

        try {

            if (groupPhoto) {

                await conn.sendMessage(m.chat, {
                    image: {
                        url: groupPhoto
                    },
                    caption: message,
                    mentions: [user]
                });

            } else {

                await conn.sendMessage(m.chat, {
                    text: message,
                    mentions: [user]
                });

            }

        } catch {

            await conn.sendMessage(m.chat, {
                text: message,
                mentions: [user]
            });

        }
    }

    // ==========================================================
    // 👋 SALIDAS
    // ==========================================================

    for (let user of removed) {

        let number = user.split("@")[0];

        let message = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🤖 *WHATSAPP-BOT*
┃ 👋 *MIEMBRO SALIÓ*
╰━━━━━━━━━━━━━━━━━━━━━━╯

👤 *Usuario:* @${number}

🏠 *Grupo:* ${groupName}

👋 El usuario salió del grupo.

━━━━━━━━━━━━━━━━━━━━━━
🤖 *WhatsApp-Bot*
━━━━━━━━━━━━━━━━━━━━━━
        `.trim();

        try {

            if (groupPhoto) {

                await conn.sendMessage(m.chat, {
                    image: {
                        url: groupPhoto
                    },
                    caption: message,
                    mentions: [user]
                });

            } else {

                await conn.sendMessage(m.chat, {
                    text: message,
                    mentions: [user]
                });

            }

        } catch {

            await conn.sendMessage(m.chat, {
                text: message,
                mentions: [user]
            });

        }
    }

    // ==========================================================
    // 💾 ACTUALIZAR LISTA
    // ==========================================================

    chat.participants = current;
};

// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = [
    "welcome",
    "welc",
    "wl"
];

// ============================================================
// 👥 GRUPO
// ============================================================

handler.group = true;

// ============================================================
// 👮 ADMIN
// ============================================================

handler.admin = true;

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler;
