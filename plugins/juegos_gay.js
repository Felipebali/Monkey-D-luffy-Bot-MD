// 📂 plugins/gay.js — FelixCat_Bot 🏳️‍🌈

let handler = async (m, { conn, command }) => {
  try {

    const chatData = global.db.data.chats[m.chat] || {};

    // ⚠️ Verificar si los juegos están activados
    if (!chatData.games) {
      return await conn.sendMessage(
        m.chat,
        {
          text: '🎮 *Los mini-juegos están desactivados.*\nActívalos con *.juegos* 🔓'
        },
        {
          quoted: m
        }
      );
    }

    // 👥 Solo grupos
    if (!m.isGroup) {
      return m.reply('❌ Este comando solo funciona en grupos.');
    }

    // 🎯 Determinar objetivo
    // Prioridad: citado > mencionado > autor
    let who = m.quoted
      ? m.quoted.sender
      : (m.mentionedJid && m.mentionedJid[0]) || m.sender;

    // 🔧 Normalizar JID si está disponible
    if (conn.decodeJid) {
      who = conn.decodeJid(who);
    }

    let simpleId = who.split('@')[0];

    // 🎰 Calcular porcentaje aleatorio
    let porcentaje = Math.floor(Math.random() * 101);

    // 🏳️‍🌈 Crear barra visual
    const totalBars = 10;
    const filledBars = Math.round(porcentaje / 10);

    const bar =
      '🏳️‍🌈'.repeat(filledBars) +
      '⬜'.repeat(totalBars - filledBars);

    // 💬 Frases según porcentaje
    let frase;

    if (porcentaje >= 95) {
      frase = '🏳️‍🌈 Nivel divino: sos el arcoíris encarnado.';
    }

    else if (porcentaje >= 80) {
      frase = '💅 Fabulos@ total: brillás más que RuPaul.';
    }

    else if (porcentaje >= 65) {
      frase = '🦄 Brillas con orgullo y estilo.';
    }

    else if (porcentaje >= 50) {
      frase = '😉 Un 50/50, pero el radar marca fuerte.';
    }

    else if (porcentaje >= 35) {
      frase = '🤭 Un poco de color, pero disimulás.';
    }

    else if (porcentaje >= 20) {
      frase = '😇 Bastante tranqui, aunque algo sospechoso.';
    }

    else if (porcentaje >= 5) {
      frase = '😎 Hetero con un toque de glitter.';
    }

    else {
      frase = '🗿 Puro, sin rastros de arcoíris.';
    }

    // 🧾 Mensaje final
    let msg = `
🏳️‍🌈 *TEST GAY FELIXCAT 2.1* 🏳️‍🌈

👤 *Usuario:* @${simpleId}
📊 *Nivel de gay:* ${porcentaje}%

${bar}

💬 ${frase}
`.trim();

    // 📤 Enviar mensaje con mención
    await conn.sendMessage(
      m.chat,
      {
        text: msg,
        mentions: [who]
      },
      {
        quoted: m
      }
    );

  } catch (e) {

    console.error('[gay.js]', e);

    await conn.reply(
      m.chat,
      '✖️ Error al ejecutar el test gay.',
      m
    );
  }
};

// ⚙️ Configuración
handler.command = ['gay'];
handler.tags = ['fun', 'juego'];
handler.help = ['gay <@usuario>'];
handler.group = true;

export default handler;
