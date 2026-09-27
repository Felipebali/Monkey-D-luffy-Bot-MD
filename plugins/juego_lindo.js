// 📂 plugins/lindo.js — FelixCat_Bot 💞
let handler = async (m, { conn, command }) => {
  try {
    const chatData = global.db.data.chats[m.chat] || {};

    // ⚠️ Verificar si los juegos están activados
    if (!chatData.games) {
      return await conn.sendMessage(
        m.chat,
        { text: '🎮 *Los mini-juegos están desactivados.*\nActívalos con *.juegos* 🔓' },
        { quoted: m }
      );
    }

    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.');

    // 🎯 Determinar objetivo (prioridad: citado > mencionado > autor)
    let who = m.quoted ? m.quoted.sender : (m.mentionedJid && m.mentionedJid[0]) || m.sender;
    let simpleId = who.split("@")[0];
    let name = conn.getName ? conn.getName(who) : simpleId;

    // 🎲 Calcular porcentaje aleatorio
    let porcentaje = Math.floor(Math.random() * 101);

    // 💖 Crear barra visual
    const totalBars = 10;
    const filledBars = Math.round(porcentaje / 10);
    const bar = '💖'.repeat(filledBars) + '⬜'.repeat(totalBars - filledBars);

    // 😻 Frases según el comando
    const frasesLindo = [
      "😎 Fachero facherito 🔥",
      "💘 Rompe corazones oficial del grupo 😍",
      "✨ Tan lindo que debería estar en un cuadro 💅",
      "🐾 Su belleza gatuna no tiene comparación 😻",
      "💫 Irresistible y con estilo propio 💖",
      "🎯 100% aprobado por FelixCat Industries 😼",
    ];

    const frasesLinda = [
      "💖 La más hermosa del grupo 😍",
      "🌸 Tan linda que hace brillar el chat ✨",
      "💅 Pura elegancia felina 😻",
      "🌹 Debería tener su propio filtro de belleza 💋",
      "😽 Una diosa con encanto natural 💞",
      "🐾 FelixCat confirma: belleza nivel celestial 😇",
    ];

    const frases = command === 'linda' ? frasesLinda : frasesLindo;
    const frase = frases[Math.floor(Math.random() * frases.length)];

    // 🧾 Armar mensaje final
    let msg = `
💞 *TEST DE BELLEZA WHATSAPP-BOT 2.1* 🐾

👤 *Usuario:* @${simpleId}
📊 *Nivel de belleza:* ${porcentaje}%

${bar}

💬 ${frase}
`.trim();

    // 📤 Enviar mensaje con mención
    await conn.sendMessage(m.chat, { text: msg, mentions: [who] }, { quoted: m });

  } catch (e) {
    console.error(e);
    await conn.reply(m.chat, '✖️ Error al ejecutar el test de belleza.', m);
  }
};

handler.command = ['lindo', 'linda'];
handler.tags = ['fun', 'juego'];
handler.help = ['lindo <@usuario>', 'linda <@usuario>'];
handler.group = true;

export default handler;
