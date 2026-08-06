export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const API = 'https://tapi.bale.ai/bot' + (env.BALE_BOT_TOKEN || '');

    async function bale(method, data) {
      const res = await fetch(API + '/' + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();

        if (update.message) {
          const text = update.message.text || '';
          const chatId = update.message.chat.id;

          if (text === '/start') {
            await bale('sendMessage', {
              chat_id: chatId,
              text: '🎮 به مرکز بازی خوش اومدی!\n\n🐤 بازی کن، سکه جمع کن، اسکین بخر!\n\n🪙 سکه فعلی تو: ۰',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🎮 بازی کن', url: 'https://metabolicbit-jpg.github.io/bale-game/' }],
                  [{ text: '🛒 فروشگاه', callback_data: 'shop' }, { text: '🏆 رتبه‌بندی', callback_data: 'rank' }]
                ]
              }
            });
          }
        }

        if (update.callback_query) {
          const cb = update.callback_query;
          await bale('answerCallbackQuery', { callback_query_id: cb.id });
          await bale('sendMessage', {
            chat_id: cb.message.chat.id,
            text: '🚧 این بخش به‌زودی فعال میشه!'
          });
        }
      } catch (e) {
        return new Response('error: ' + e.message);
      }
      return new Response('ok');
    }

    return new Response('🎮 Bale Game Server is running!');
  }
};