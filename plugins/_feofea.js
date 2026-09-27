// 📂 plugins/feo_fea.js — FelixCat_Bot 😬
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

    // 📊 Crear barra visual
    const totalBars = 10;
    const filledBars = Math.round(porcentaje / 10);
    const bar = '😬'.repeat(filledBars) + '⬜'.repeat(totalBars - filledBars);

    // 💬 Frases personalizadas
    const frasesFeo = [
      "🪞 Rompés espejos con solo mirar.",
      "🤡 Sos tan feo que el susto se asusta.",
      "🧟‍♂️ Nivel zombie: solo apto para Halloween.",
      "🐸 Feo pero con personalidad (al menos eso dicen).",
      "😹 No sos feo, sos una obra de arte abstracta.",
      "😈 FelixCat confirma: belleza en modo difícil.",
    ];

    const frasesFea = [
      "👻 Fea pero con carisma, que es lo importante 😅",
      "🙈 Nivel espejo roto desbloqueado.",
      "🐷 Tan tierna que asusta un poco 💀",
      "🧙‍♀️ Si fueras hechizo, durarías 100 años.",
      "🐾 Fea, pero FelixCat te banca igual 💕",
      "😹 Belleza oculta... muy, muy oculta.",
    ];

    const frases = command === 'fea' ? frasesFea : frasesFeo;
    const frase = frases[Math.floor(Math.random() * frases.length)];

    // 🧾 Armar mensaje final
    let msg = `
😬 *TEST DE FEALDAD WHATSAPP-BOT 2.1* 😬

👤 *Usuario:* @${simpleId}
📉 *Nivel de fealdad:* ${porcentaje}%

${bar}

💬 ${frase}
`.trim();

    // 📤 Enviar mensaje con mención clickeable
    await conn.sendMessage(m.chat, { text: msg, mentions: [who] }, { quoted: m });

  } catch (e) {
    console.error(e);
    await conn.reply(m.chat, '✖️ Error al ejecutar el test de fealdad.', m);
  }
};

handler.command = ['feo', 'fea'];
handler.tags = ['fun', 'juego'];
handler.help = ['feo <@usuario>', 'fea <@usuario>'];
handler.group = true;

export default handler; 
