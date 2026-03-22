// 📂 plugins/welcome.js

let handler = async (m, { conn, text, command, isAdmin }) => {
    if (!m.isGroup)
        return conn.sendMessage(m.chat, { text: "❌ Solo funciona en grupos." });

    if (!isAdmin)
        return conn.sendMessage(m.chat, { text: "⚠️ Solo los administradores pueden usar este comando." });

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];

    // 🔧 Valores por defecto
    if (typeof chat.welcome === 'undefined') chat.welcome = false;
    if (!chat.welcomeMsg) chat.welcomeMsg = "🎉 ¡Bienvenido/a!";
    if (!chat.leaveMsg) chat.leaveMsg = "👋 Se fue del grupo.";

    // 🔘 ACTIVAR / DESACTIVAR
    if (command === "welcome") {
        chat.welcome = !chat.welcome;

        return conn.sendMessage(m.chat, {
            text: `✨ *Welcome ${chat.welcome ? "ACTIVADO" : "DESACTIVADO"}*\nLos mensajes están ${chat.welcome ? "habilitados" : "deshabilitados"}.`
        });
    }

    // ✏️ EDITAR BIENVENIDA
    if (command === "set1") {
        if (!text) return m.reply("✏️ Usa:\n.set1 texto");
        chat.welcomeMsg = text;
        return m.reply("✅ Bienvenida actualizada.");
    }

    // ✏️ EDITAR DESPEDIDA
    if (command === "set2") {
        if (!text) return m.reply("✏️ Usa:\n.set2 texto");
        chat.leaveMsg = text;
        return m.reply("✅ Despedida actualizada.");
    }
};

// --- DETECTOR DE CAMBIOS ---
handler.before = async function (m, { conn }) {
    if (!m.isGroup) return;

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];

    if (!chat.welcome) return;

    const meta = await conn.groupMetadata(m.chat);
    const current = meta.participants.map(p => p.id);

    if (!chat.participants) {
        chat.participants = current;
        return;
    }

    const old = chat.participants;
    const added = current.filter(x => !old.includes(x));
    const removed = old.filter(x => !current.includes(x));
    const groupName = meta.subject;

    // 🎉 BIENVENIDA
    for (let user of added) {
        let username = `@${user.split("@")[0]}`;

        let text = chat.welcomeMsg
            .replace(/@user/g, username)
            .replace(/@group/g, groupName);

        // 🔥 FORZAR mención y grupo
        if (!text.includes(username)) {
            text = `${username}\n${text}`;
        }

        if (!text.includes(groupName)) {
            text = `${text}\n📌 Grupo: ${groupName}`;
        }

        // 💎 DISEÑO BONITO
        let finalText = `
╭━━━〔 🎉 BIENVENIDO 〕━━━⬣
┃ 👤 Usuario: ${username}
┃ 🏷️ Grupo: *${groupName}*
┃
┃ ${text}
╰━━━━━━━━━━━━━━━━⬣
`.trim();

        await conn.sendMessage(m.chat, {
            text: finalText,
            mentions: [user]
        });
    }

    // 👋 DESPEDIDA
    for (let user of removed) {
        let username = `@${user.split("@")[0]}`;

        let text = chat.leaveMsg
            .replace(/@user/g, username)
            .replace(/@group/g, groupName);

        // 🔥 FORZAR mención y grupo
        if (!text.includes(username)) {
            text = `${username}\n${text}`;
        }

        if (!text.includes(groupName)) {
            text = `${text}\n📌 Grupo: ${groupName}`;
        }

        // 💎 DISEÑO BONITO
        let finalText = `
╭━━━〔 👋 DESPEDIDA 〕━━━⬣
┃ 👤 Usuario: ${username}
┃ 🏷️ Grupo: *${groupName}*
┃
┃ ${text}
╰━━━━━━━━━━━━━━━━⬣
`.trim();

        await conn.sendMessage(m.chat, {
            text: finalText,
            mentions: [user]
        });
    }

    chat.participants = current;
};

// 📌 COMANDOS
handler.command = ["welcome", "welc", "wl", "set1", "set2"];

handler.group = true;
handler.admin = true;

export default handler;
