export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const API = 'https://tapi.bale.ai/bot' + (env.BALE_BOT_TOKEN || '');
    const KV = env.GAME_KV;

    const CHANNEL = '@bale_game_center';
    const GROUP = '@bale_game_group';
    const GAME_URL = 'https://metabolicbit-jpg.github.io/bale-game/flappy.html';

    const SHOP = [
      { id: 'skin_gold', name: '🐤 پرنده طلایی', price: 200 },
      { id: 'skin_eagle', name: '🦅 عقاب', price: 350 },
      { id: 'skin_rocket', name: '🚀 موشک', price: 500 },
      { id: 'trail_rainbow', name: '🌈 دنباله رنگین‌کمان', price: 300 },
      { id: 'life_extra', name: '❤️ جان اضافه', price: 100 }
    ];

    async function bale(method, data) {
      const res = await fetch(API + '/' + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }

    function fa(n) {
      const p = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
      return String(n).replace(/\d/g, function(d) { return p[d]; });
    }

    function json(obj) {
      return new Response(JSON.stringify(obj), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    async function getUser(id) {
      const raw = await KV.get('u:' + id, 'json');
      if (raw) return raw;
      return { coins: 0, best: 0, games: 0, items: [], claimed: {}, daily: {} };
    }

    async function saveUser(id, u) {
      await KV.put('u:' + id, JSON.stringify(u));
    }

    async function rankText() {
      const lb = (await KV.get('lb', 'json')) || [];
      if (lb.length === 0) return '🏆 هنوز کسی توی رتبه‌بندی نیست! اولین نفر باش!';
      const medals = ['🥇','','🥉','۴.','۵.'];
      let t = '🏆 برترین‌های مرکز بازی:\n\n';
      lb.slice(0, 5).forEach(function(e, i) {
        t += medals[i] + ' ' + e.name + ' — رکورد: ' + fa(e.best) + '\n';
      });
      return t;
    }

    async function updateLB(id, name, best) {
      const lb = (await KV.get('lb', 'json')) || [];
      const e = lb.find(function(x) { return x.id === id; });
      if (e) { e.name = name; if (best > e.best) e.best = best; }
      else lb.push({ id: id, name: name, best: best });
      lb.sort(function(a, b) { return b.best - a.best; });
      await KV.put('lb', JSON.stringify(lb.slice(0, 50)));
    }

    async function sendTasks(chatId) {
      await bale('sendMessage', {
        chat_id: chatId,
        text: '📋 کارهای سکه‌دار:\n\n👥 عضویت کانال: +۱۰۰\n👥 عضویت گروه: +۱۰۰\n🎮 هر بازی: تا +۵۰\n🎯 رکورد جدید: +۵۰ اضافه\n📅 ورود روزانه: +۳۰ (خودکار)',
        reply_markup: { inline_keyboard: [
          [{ text: '📢 کانال', url: 'https://ble.ir/' + CHANNEL.replace('@', '') }, { text: '👥 گروه', url: 'https://ble.ir/' + GROUP.replace('@', '') }],
          [{ text: '✅ عضو کانال شدم', callback_data: 'task_channel' }],
          [{ text: '✅ عضو گروه شدم', callback_data: 'task_group' }]
        ] }
      });
    }

    async function sendShop(chatId, u) {
      let t = '🛒 فروشگاه اسکین و آیتم\n\n';
      SHOP.forEach(function(i) {
        const owned = u.items.includes(i.id) ? ' ✅' : '';
        t += i.name + ' — ' + fa(i.price) + ' سکه' + owned + '\n';
      });
      t += '\n🪙 سکه تو: ' + fa(u.coins);
      const rows = [];
      SHOP.forEach(function(i) {
        if (!u.items.includes(i.id)) {
          rows.push([{ text: 'خرید ' + i.name + ' (' + fa(i.price) + ')', callback_data: 'buy_' + i.id }]);
        }
      });
      if (rows.length === 0) rows.push([{ text: 'همه رو خریدی! 🎉', callback_data: 'coins' }]);
      await bale('sendMessage', { chat_id: chatId, text: t, reply_markup: { inline_keyboard: rows } });
    }

    // ---------- API بازی ----------
    if (url.pathname === '/api/submit') {
      if (request.method === 'OPTIONS') return json({ ok: true });
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const uid = String(body.user || '');
          const score = Math.max(0, Number(body.score) || 0);
          if (!uid) return json({ ok: false });
          const u = await getUser(uid);
          u.games += 1;
          const newBest = score > u.best;
          if (newBest) u.best = score;
          let coins = Math.max(5, Math.floor(score / 2));
          if (newBest && score > 0) coins += 50;
          u.coins += coins;
          await saveUser(uid, u);
          await updateLB(uid, body.name || '🎮 بازیکن', u.best);
          return json({ ok: true, coins: coins, balance: u.coins });
        } catch (e) {
          return json({ ok: false });
        }
      }
    }

    // ---------- وب‌هوک بله ----------
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();

        if (update.message) {
          const text = update.message.text || '';
          const chat = update.message.chat;
          const uid = String(chat.id);
          const u = await getUser(uid);
          const today = new Date().toISOString().slice(0, 10);

          if (text === '/start') {
            let extra = '';
            if (u.daily.login !== today) {
              u.daily.login = today;
              u.coins += 30;
              await saveUser(uid, u);
              extra = '\n\n🎁 جایزه ورود امروز: +۳۰ سکه';
            }
            await bale('sendMessage', {
              chat_id: chat.id,
              text: '🎮 به مرکز بازی خوش اومدی!' + extra + '\n\n🪙 سکه تو: ' + fa(u.coins),
              reply_markup: { inline_keyboard: [
                [{ text: '🎮 بازی کن و سکه بگیر', url: GAME_URL + '?user=' + uid }],
                [{ text: '📋 کارها', callback_data: 'tasks' }, { text: '🛒 فروشگاه', callback_data: 'shop' }],
                [{ text: '🏆 رتبه‌بندی', callback_data: 'rank' }, { text: '🪙 سکه‌هام', callback_data: 'coins' }]
              ] }
            });
          }
          else if (text === '/coins') {
            await bale('sendMessage', { chat_id: chat.id, text: '🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ بهترین رکورد: ' + fa(u.best) });
          }
          else if (text === '/tasks') { await sendTasks(chat.id); }
          else if (text === '/shop') { await sendShop(chat.id, u); }
          else if (text === '/rank') { await bale('sendMessage', { chat_id: chat.id, text: await rankText() }); }
        }

        if (update.callback_query) {
          const cb = update.callback_query;
          const uid = String(cb.from.id);
          const chatId = cb.message.chat.id;
          const data = cb.data || '';
          const u = await getUser(uid);
          let msg = null;

          if (data === 'coins') msg = '🪙 سکه تو: ' + fa(u.coins);
          else if (data === 'rank') msg = await rankText();
          else if (data === 'tasks') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            await sendTasks(chatId);
            return new Response('ok');
          }
          else if (data === 'shop') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            await sendShop(chatId, u);
            return new Response('ok');
          }
          else if (data === 'task_channel' || data === 'task_group') {
            const isChannel = data === 'task_channel';
            const target = isChannel ? CHANNEL : GROUP;
            const key = isChannel ? 'channel' : 'group';
            const st = await bale('getChatMember', { chat_id: target, user_id: Number(uid) });
            const isMember = st.ok && ['member', 'administrator', 'creator'].includes(st.result.status);
            if (!isMember) msg = '❌ هنوز عضو نشدی! اول عضو ' + target + ' بشو، بعد دوباره بزن.';
            else if (u.claimed[key]) msg = 'این جایزه رو قبلاً گرفتی!';
            else {
              u.claimed[key] = 1;
              u.coins += 100;
              await saveUser(uid, u);
              msg = '✅ عضویت تأیید شد! +۱۰۰ سکه\n🪙 موجودی: ' + fa(u.coins);
            }
          }
          else if (data.startsWith('buy_')) {
            const item = SHOP.find(function(i) { return i.id === data.slice(4); });
            if (!item) msg = 'پیدا نشد!';
            else if (u.items.includes(item.id)) msg = 'قبلاً خریدیش!';
            else if (u.coins < item.price) msg = '❌ سکه کافی نیست! ' + fa(item.price - u.coins) + ' سکه دیگه لازمه. برو بازی کن! 🎮';
            else {
              u.coins -= item.price;
              u.items.push(item.id);
              await saveUser(uid, u);
              msg = '🛍️ خرید موفق: ' + item.name + '\n🪙 موجودی: ' + fa(u.coins);
            }
          }

          await bale('answerCallbackQuery', { callback_query_id: cb.id });
          if (msg) await bale('sendMessage', { chat_id: chatId, text: msg });
        }
      } catch (e) {
        console.log('webhook error:', e.message);
      }
      return new Response('ok');
    }

    return new Response('🎮 Bale Game Server v2 is running!');
  }
};
