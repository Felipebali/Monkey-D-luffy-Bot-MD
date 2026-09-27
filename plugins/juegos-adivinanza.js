// 📂 plugins/juegos-adivinanza.js
const adivinanzas = [
  { pregunta: '🌕 ¿Qué cosa cuanto más grande menos se ve?', respuesta: 'oscuridad' },
  { pregunta: '🦴 ¿Qué se rompe sin tocarlo?', respuesta: 'silencio' },
  { pregunta: '🔥 ¿Qué sube y nunca baja?', respuesta: 'edad' },
  { pregunta: '🌧️ ¿Qué cae sin mojarse?', respuesta: 'sombra' },
  { pregunta: '🦉 ¿Qué tiene ojos y no ve?', respuesta: 'aguja' },
  { pregunta: '💧 ¿Qué siempre está en el agua pero nunca se moja?', respuesta: 'reflejo' },
  { pregunta: '⏳ ¿Qué corre pero nunca camina?', respuesta: 'tiempo' },
  { pregunta: '🔑 ¿Qué tiene llaves pero no puede abrir puertas?', respuesta: 'piano' },
  { pregunta: '🌳 ¿Qué tiene ramas pero no hojas ni tronco?', respuesta: 'árbol genealógico' },
  { pregunta: '🛏️ ¿Qué tiene una cama pero nunca duerme?', respuesta: 'río' },
  { pregunta: '🕰️ ¿Qué tiene manos pero no puede aplaudir?', respuesta: 'reloj' },
  { pregunta: '📚 ¿Qué tiene hojas pero no es un árbol?', respuesta: 'libro' },
  { pregunta: '🕯️ ¿Qué se consume pero no se come?', respuesta: 'vela' }
];

// Normalizar texto (quita acentos y símbolos)
function normalizeText(s) {
  if (!s) return '';
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.replace(/[^0-9a-zA-Z\s]/g, '').trim().toLowerCase();
}

let handler = async (m, { conn }) => {
  const chat = global.db.data.chats[m.chat] || {};
  if (chat.games === false)
    return conn.sendMessage(m.chat, { text: '⚠️ Los mini-juegos están desactivados. Usa *.juegos* para activarlos.' }, { quoted: m });

  const adivinanza = adivinanzas[Math.floor(Math.random() * adivinanzas.length)];

  if (!global.riddleGame) global.riddleGame = {};

  const msg = await conn.sendMessage(m.chat, {
    text: `🧩 *ADIVINANZA WHATSAPP-BOT* 🐾\n\n${adivinanza.pregunta}\n\n💬 *Responde citando este mensaje con tu respuesta.*\n⏱️ *Tienes 30 segundos!*`
  }, { quoted: m });

  global.riddleGame[m.chat] = {
    answer: adivinanza.respuesta,
    answered: false,
    messageId: msg?.key?.id,
    timeout: setTimeout(async () => {
      const game = global.riddleGame?.[m.chat];
      if (game && !game.answered) {
        await conn.sendMessage(m.chat, { text: `⏰ Tiempo terminado! La respuesta era *${game.answer}* 😺` }, { quoted: msg });
        delete global.riddleGame[m.chat];
      }
    }, 30000)
  };
};

handler.before = async (m, { conn }) => {
  const game = global.riddleGame?.[m.chat];
  if (!game || game.answered || !m.text) return;

  const quotedId = m.quoted?.key?.id || m.quoted?.id || null;
  if (!quotedId || quotedId !== game.messageId) return;

  const userAnswer = normalizeText(m.text);
  const correctAnswer = normalizeText(game.answer);

  if (userAnswer === correctAnswer) {
    clearTimeout(game.timeout);
    game.answered = true;
    const winMsgs = [
      `🎉 ¡Correcto, ${m.pushName}! Era *${game.answer}* 😺`,
      `🏆 Muy bien, ${m.pushName}! La respuesta era *${game.answer}*!`,
      `🔥 Genial, ${m.pushName}! Acertaste *${game.answer}*!`
    ];
    await conn.sendMessage(m.chat, { text: winMsgs[Math.floor(Math.random() * winMsgs.length)] }, { quoted: m });
    delete global.riddleGame[m.chat];
  } else {
    const failMsgs = [
      '❌ Incorrecto!',
      '🤔 No es esa.',
      '🙃 Casi, pero no.',
      '💀 Fallaste!'
    ];
    await conn.sendMessage(m.chat, { text: failMsgs[Math.floor(Math.random() * failMsgs.length)] }, { quoted: m });
  }
};

handler.command = ['adivinanza', 'riddle'];
handler.group = true;

export default handler;
