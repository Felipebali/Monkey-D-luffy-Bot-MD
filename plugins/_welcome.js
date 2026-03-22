// 📂 plugins/welcome.js

let handler = async (m, { conn, text, command, isAdmin }) => {
    if (!m.isGroup)
        return conn.sendMessage(m.chat, { text: "❌ Solo funciona en grupos." });

    if (!isAdmin)
        return conn.sendMessage(m.chat, { text: "⚠️ Solo los administradores pueden usar esto." });

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
    let chat = global.db.data.chats[m.chat];

    // Defaults
    if (typeof chat.welcome === 'undefined') chat.welcome = false;
    if (!chat.welcomeMsg) chat.welcomeMsg = "🎉 ¡Bienvenido/a @user al grupo *@group*!";
    if (!chat.leaveMsg) chat.leaveMsg = "👋 @user salió del grupo *@group*.";

    // 🔘 TOGGLE
    if (command === "welcome") {
        chat.welcome = !chat.welcome;

        return conn.sendMessage(m.chat, {
            text: `✨ *Welcome ${chat.welcome ? "ACTIVADO" : "DESACTIVADO"}*`
        });
    }

    // ✏️ SET BIENVENIDA
    if (command === "set1") {
        if (!text) return m.reply("✏️ Usa:\n.set1 texto\n\nEjemplo:\n.set1 Bienvenido @user a @group");

        chat.welcomeMsg = text;

        return m.reply("✅ Mensaje de *bienvenida* actualizado.");
    }

    // ✏️ SET DESPEDIDA
    if (command === "set2") {
        if (!text) return m.reply("✏️ Usa:\n.set2 texto\n\nEjemplo:\n.set2 Chau @user de @group");

        chat.leaveMsg = text;

        return m.reply("✅ Mensaje de *despedida* actualizado.");
    }
};

// --- DETECTOR DE ENTRADAS Y SALIDAS ---
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
        let text = chat.welcomeMsg
            .replace(/@user/g, `@${user.split("@")[0]}`)
            .replace(/@group/g, groupName);

        await conn.sendMessage(m.chat, {
            text,
            mentions: [user]
        });
    }

    // 👋 DESPEDIDA
    for (let user of removed) {
        let text = chat.leaveMsg
            .replace(/@user/g, `@${user.split("@")[0]}`)
            .replace(/@group/g, groupName);

        await conn.sendMessage(m.chat, {
            text,
            mentions: [user]
        });
    }

    chat.participants = current;
};

// 📌 COMANDOS
handler.command = ["welcome", "set1", "set2"];

handler.group = true;
handler.admin = true;

export default handler;
