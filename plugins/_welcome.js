// 📂 plugins/welcome.js
// Welcome + Leave con toggle usando SOLO: welcome

let handler = async (m, { conn, isAdmin }) => {
    if (!m.isGroup)
        return conn.sendMessage(m.chat, { text: "❌ Solo funciona en grupos." });

    if (!isAdmin)
        return conn.sendMessage(m.chat, { text: "⚠️ Solo los administradores pueden usar este comando." });

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {};

    let chat = global.db.data.chats[m.chat];

    if (typeof chat.welcome === 'undefined')
        chat.welcome = false;

    chat.welcome = !chat.welcome;

    await conn.sendMessage(m.chat, {
        text: `✨ Welcome ${chat.welcome ? "ACTIVADO" : "DESACTIVADO"}`
    });
};

// --- BEFORE ---
handler.before = async function (m, { conn }) {
    if (!m.isGroup) return;

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {};

    let chat = global.db.data.chats[m.chat];

    if (!chat.welcome) return;

    const meta = await conn.groupMetadata(m.chat);

    const current = meta.participants.map(p => p.id);

    // Primera vez: guardar participantes
    if (!chat.participants) {
        chat.participants = current;
        return;
    }

    const old = chat.participants;

    const added = current.filter(x => !old.includes(x));
    const removed = old.filter(x => !current.includes(x));

    const groupName = meta.subject;

    // 🎉 ENTRÓ
    for (let user of added) {
        let number = user.split("@")[0];

        await conn.sendMessage(m.chat, {
            text: `🎉 Entró @${number} al grupo "${groupName}"`,
            mentions: [user]
        });
    }

    // 👋 SALIÓ
    for (let user of removed) {
        let number = user.split("@")[0];

        await conn.sendMessage(m.chat, {
            text: `👋 Salió @${number} del grupo "${groupName}"`,
            mentions: [user]
        });
    }

    chat.participants = current;
};

// 📌 COMANDOS
handler.command = ["welcome", "welc", "wl"];

handler.group = true;
handler.admin = true;

export default handler;
