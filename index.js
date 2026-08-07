export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const API = 'https://tapi.bale.ai/bot' + (env.BALE_BOT_TOKEN || '');
    const KV = env.GAME_KV;

    const CHANNEL = '@bale_game_center';
    const GROUP = '@game_center_bale';
    const GAME_URL = 'https://metabolicbit-jpg.github.io/bale-game/flappy.html';
    const SHADOW_URL = 'https://metabolicbit-jpg.github.io/bale-game/shadow.html';
    const EGG_URL = 'https://metabolicbit-jpg.github.io/bale-game/egg.html';
    const ESM_URL = 'https://metabolicbit-jpg.github.io/bale-game/esm.html';

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
      return { coins: 0, best: 0, games: 0, items: [], claimed: {}, daily: {}, esm: { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } } };
    }

    async function saveUser(id, u) {
      await KV.put('u:' + id, JSON.stringify(u));
    }

    async function rankText() {
      const lb = (await KV.get('lb', 'json')) || [];
      if (lb.length === 0) return '🏆 هنوز کسی توی رتبه‌بندی نیست! اولین نفر باش!';
      const medals = ['🥇','🥈','🥉','۴.','۵.'];
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
        text: '📋 کارهای سکه‌دار:\n\n👥 عضویت کانال: +۱۰\n👥 عضویت گروه: +۱۰۰\n🎮 هر بازی: تا +۵۰\n رکورد جدید: +۵۰ اضافه\n📅 ورود روزانه: +۳۰ (خودکار)',
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

    // ---------- API بازی‌ها ----------
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

    // ---------- اسم‌فامیل: نبرد واژه‌ها (v2 - اصلاح‌شده) ----------
    const ESM_COLS = ['اسم','فامیل','حیوان','میوه','شهر','غذا'];
    const ESM_LETTERS = ['ا','ب','پ','ت','ج','چ','د','ر','س','ش','ک','گ','م','ن','و','ه','ی','ز','ف','ق'];
    const ESM_SHOP = [
      { id: 'mirror', name: '👁️ آینه اضافه', price: 50 },
      { id: 'fog', name: '🌫️ مه اضافه', price: 40 }
    ];

    function normFa(s) { return (s || '').trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' '); }
    async function esmGet(r) { return await KV.get('esm:' + r, 'json'); }
    async function esmSet(r, s) { await KV.put('esm:' + r, JSON.stringify(s), { expirationTtl: 86400 }); }
    function esmNewRoom() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 4; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }

    async function esmJudge(st) {
      const p0 = st.players[0], p1 = st.players[1];
      let s0 = 0, s1 = 0;
      const detail = [];
      ESM_COLS.forEach(function(col, i) {
        const a = normFa(p0.answers[col] || '');
        const b = normFa(p1.answers[col] || '');
        function val(w) { return w.length >= 2 && w.charAt(0) === st.letter; }
        let pa = val(a) ? 10 : 0;
        let pb = val(b) ? 10 : 0;
        if (pa && pb && a === b) { pa = 5; pb = 5; }
        const mult = (st.golden === i) ? 2 : 1;
        pa *= mult; pb *= mult;
        s0 += pa; s1 += pb;
        detail.push({ col: col, a: p0.answers[col] || '-', b: p1.answers[col] || '-', pa: pa, pb: pb, golden: st.golden === i });
      });
      s0 += (p0.timeBonus || 0);
      s1 += (p1.timeBonus || 0);
      p0.score = s0; p1.score = s1;
      st.phase = 'result';
      st.result = { detail: detail, winner: s0 === s1 ? -1 : (s0 > s1 ? 0 : 1) };
      for (let idx = 0; idx < 2; idx++) {
        const p = st.players[idx];
        if (p.user) {
          const u = await getUser(p.user);
          const win = st.result.winner === idx;
          const draw = st.result.winner === -1;
          const coins = (win ? 20 : (draw ? 10 : 0)) + Math.floor(p.score / 5);
          u.coins += coins;
          p.coinsWon = coins;
          if (!u.esm) u.esm = { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } };
          u.esm.games += 1;
          u.esm.total += p.score;
          if (win) u.esm.wins += 1;
          await saveUser(p.user, u);
          await bale('sendMessage', { chat_id: p.user, text: '📝 نبرد واژه‌ها تموم شد!\n🏅 امتیاز: ' + fa(p.score) + ' (⚡ پاداش سرعت: ' + fa(p.timeBonus || 0) + ')\n🪙 سکه: +' + fa(coins) + (win ? '\n🏆 بردی!' : (draw ? '\n🤝 مساوی!' : '\n💪 باختی!')) });
        }
      }
    }

    if (url.pathname.startsWith('/api/esm/')) {
      if (request.method === 'OPTIONS') return json({ ok: true });
      const act = url.pathname.split('/').pop();
      try {
        if (act === 'state') {
          const room = (url.searchParams.get('room') || '').toUpperCase();
          const pid = url.searchParams.get('pid') || '';
          const st = await esmGet(room);
          if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' });
          if (st.phase === 'play' && Date.now() > st.endsAt) { await esmJudge(st); await esmSet(room, st); }
          const me = st.players.find(function(p) { return p.id === pid; }) || null;
          const opp = st.players.find(function(p) { return p.id !== pid; }) || null;
          let peek = null;
          if (me && opp && st.peek && st.peek.by === me.id && Date.now() < st.peek.until) peek = opp.answers;
          return json({ ok: true, st: {
            phase: st.phase, letter: st.letter, golden: st.golden, endsAt: st.endsAt, code: st.code,
            players: st.players.map(function(p) { return { id: p.id, name: p.name, submitted: p.submitted, score: p.score, coinsWon: p.coinsWon || 0, timeBonus: p.timeBonus || 0 }; }),
            result: st.result, peek: peek,
            myPowers: me ? me.powers : null
          } });
        }

        const body = await request.json();
        const room = (body.room || '').toUpperCase();

        if (act === 'create' || act === 'join') {
          let st;
          if (act === 'create') {
            const code = esmNewRoom();
            st = { code: code, phase: 'lobby', players: [], letter: null, golden: 0, endsAt: 0, result: null };
            await esmSet(code, st);
          } else {
            st = await esmGet(room);
            if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' });
            if (st.players.length >= 2) return json({ ok: false, error: 'اتاق پره!' });
          }
          const inv = body.user ? ((await getUser(body.user)).esm || {}).inv || { mirror: 0, fog: 0 } : { mirror: 0, fog: 0 };
          st.players.push({ id: body.pid, name: body.name || 'بازیکن', user: body.user || '', answers: {}, powers: { mirror: 1 + inv.mirror, fog: 1 + inv.fog }, submitted: false, score: 0, timeBonus: 0 });
          if (st.players.length === 2) st.phase = 'ready';
          await esmSet(st.code, st);
          return json({ ok: true, room: st.code });
        }

        if (act === 'profile') {
          if (!body.user) return json({ ok: false, error: 'guest' });
          const u = await getUser(body.user);
          return json({ ok: true, coins: u.coins, esm: u.esm || { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } } });
        }

        if (act === 'shop') {
          const item = ESM_SHOP.find(function(i) { return i.id === body.item; });
          if (!item || !body.user) return json({ ok: false, error: 'از بات وارد شو' });
          const u = await getUser(body.user);
          if (u.coins < item.price) return json({ ok: false, error: 'سکه کافی نیست! برو بازی کن 🎮' });
          if (!u.esm) u.esm = { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } };
          u.coins -= item.price;
          u.esm.inv[item.id] += 1;
          await saveUser(body.user, u);
          return json({ ok: true, coins: u.coins, inv: u.esm.inv });
        }

        const st = await esmGet(room);
        if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' });

        if (act === 'start') {
          if (st.players.length !== 2) return json({ ok: false, error: 'منتظر حریف!' });
          st.letter = ESM_LETTERS[Math.floor(Math.random() * ESM_LETTERS.length)];
          st.golden = Math.floor(Math.random() * ESM_COLS.length);
          st.phase = 'play';
          st.endsAt = Date.now() + 90000;
          await esmSet(room, st);
          return json({ ok: true });
        }

        if (act === 'answer') {
          const p = st.players.find(function(x) { return x.id === body.pid; });
          if (!p || p.submitted) return json({ ok: false });
          p.answers = body.answers || {};
          p.submitted = true;
          p.timeBonus = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000)) * 2;
          if (st.players.every(function(x) { return x.submitted; })) await esmJudge(st);
          await esmSet(room, st);
          return json({ ok: true, timeBonus: p.timeBonus });
        }

        if (act === 'power') {
          const me = st.players.find(function(x) { return x.id === body.pid; });
          const opp = st.players.find(function(x) { return x.id !== body.pid; });
          if (!me || !opp || st.phase !== 'play') return json({ ok: false });
          if (body.type === 'mirror') {
            if (!me.powers.mirror) return json({ ok: false, error: 'قدرت نداری!' });
            if (opp.powers.fog) { opp.powers.fog--; await esmSet(room, st); return json({ ok: true, blocked: true }); }
            me.powers.mirror--;
            st.peek = { by: me.id, until: Date.now() + 5000 };
            await esmSet(room, st);
            return json({ ok: true, blocked: false });
          }
          return json({ ok: false });
        }

        if (act === 'again') {
          st.phase = 'ready';
          st.result = null;
          st.players.forEach(function(p) { p.answers = {}; p.submitted = false; p.score = 0; p.timeBonus = 0; p.coinsWon = 0; p.powers = { mirror: 1, fog: 1 }; });
          await esmSet(room, st);
          return json({ ok: true });
        }

        return json({ ok: false });
      } catch (e) {
        return json({ ok: false, error: e.message });
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
                [{ text: '🐤 پرنده‌پرش', url: GAME_URL + '?user=' + uid }, { text: '👤 سایه‌پرش', url: SHADOW_URL + '?user=' + uid }],
                [{ text: '🥚 آخرین تخم', url: EGG_URL + '?user=' + uid }, { text: '📝 نبرد واژه‌ها', url: ESM_URL + '?user=' + uid }],
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

    return new Response('🎮 Bale Game Server v4 is running!');
  }
};