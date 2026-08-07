// ========== میزگرد بله (v3: ریکاوری میز، دعوت، پین، واژه‌سالار) ==========
const MZ_COLS = ['اسم','فامیل','حیوان','میوه','شهر','غذا'];
const MZ_LETTERS = ['ا','ب','پ','ت','ج','د','ر','س','ش','ک','گ','م','ن','و','ه','ی'];
const MZ_ONLINE_COLS = ['حیوان','میوه','شهر','غذا'];
const MZ_CAT_KEYS = {
  'حیوان': ['جانور','حیوان','پرنده','ماهی','حشره','خزنده','پستاندار','بندپا','عنکبوت','دوزیست','نرم‌تن','پرندگان','جانوران'],
  'میوه': ['میوه','گیاه','خوراکی','درخت','کشاورزی'],
  'شهر': ['شهر','روستا','استان','منطقه','ایران','کشور','مناطق'],
  'غذا': ['غذا','خورش','آشپزی','شیرینی','نوشیدنی','دسر','خوراکی','آش']
};
const MZ_ROOTS = { 'غذا': ['پلو','خورش','کباب','آش','سوپ','سالاد','دلمه','کوکو','ماکارونی','آبگوشت','قیمه','فسنجان','بریان','املت','نیمرو','حلیم','رشته','نان','سبزی'] };
const MZ_TAUNTS = ['به‌به! چه میزی داغ بود! 😎','این دور ترکوند! 🔥','دور بعد جبران می‌کنی؟ 😏','سفرهٔ واژه هنوز پهنه! 🍽️'];
const MZ_COUNTDOWN = 20;

function mzNorm(s) { return (s || '').trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' '); }
function mzShort(s) { return (s || 'بازیکن').slice(0, 8); }
function mzRootHit(col, w) { const rs = MZ_ROOTS[col] || []; for (const r of rs) { if (r && w.indexOf(r) !== -1) return true; } return false; }
function mzWhen() { try { return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch (e) { return ''; } }
async function mzBale(env, method, data) {
  const res = await fetch('https://tapi.bale.ai/bot' + (env.BALE_BOT_TOKEN || '') + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}
async function mzGetUser(KV, id) { const raw = await KV.get('u:' + id, 'json'); if (raw) return raw; return { coins: 0, best: 0, games: 0, items: [], claimed: {}, daily: {} }; }
async function mzLoadBank(KV) {
  try { const cached = await KV.get('esm_bank', 'json'); if (cached && cached.list) return cached.list; } catch (e) {}
  try { const r = await fetch('https://metabolicbit-jpg.github.io/bale-game/words.json'); return await r.json(); } catch (e) { return {}; }
}
async function mzOnlineCheck(words) {
  const out = {};
  const uniq = words.filter(function(w, i) { return words.indexOf(w) === i; }).slice(0, 15);
  if (!uniq.length) return out;
  const titles = uniq.map(encodeURIComponent).join('|');
  const wt = {}; const wp = {};
  try {
    const r = await fetch('https://fa.wiktionary.org/w/api.php?action=query&prop=categories&titles=' + titles + '&cllimit=50&format=json&origin=*');
    const j = await r.json();
    const pages = (j.query && j.query.pages) || {};
    for (const id in pages) { const pg = pages[id]; if (pg.missing !== undefined) wt[pg.title] = { exists: false, cats: [] }; else wt[pg.title] = { exists: true, cats: (pg.categories || []).map(function(c) { return c.title; }) }; }
  } catch (e) {}
  try {
    const r2 = await fetch('https://fa.wikipedia.org/w/api.php?action=query&titles=' + titles + '&format=json&origin=*');
    const j2 = await r2.json();
    const pages2 = (j2.query && j2.query.pages) || {};
    for (const id in pages2) { const pg = pages2[id]; wp[pg.title] = pg.missing === undefined; }
  } catch (e) {}
  uniq.forEach(function(w) { const t = wt[w] || { exists: false, cats: [] }; out[w] = { exists: t.exists, cats: t.cats, wp: !!wp[w] }; });
  return out;
}
async function mzClose(env, KV, key, chatId) {
  try { await KV.delete(key); } catch (e) {}
  let active = (await KV.get('mz_active', 'json')) || [];
  active = active.filter(function(c) { return c !== String(chatId); });
  await KV.put('mz_active', JSON.stringify(active));
  await mzBale(env, 'sendMessage', { chat_id: chatId, text: '🗑️ میز بسته شد. برای میز جدید: /نبرد' });
}

async function mzJudge(KV, st) {
  const bank = await mzLoadBank(KV);
  const need = [];
  st.players.forEach(function(p) {
    MZ_COLS.forEach(function(col) {
      if (MZ_ONLINE_COLS.indexOf(col) === -1) return;
      const w = mzNorm(p.answers[col] || '');
      if (w.length >= 2 && w.charAt(0) === st.letter && (bank[col] || []).indexOf(w) === -1 && !mzRootHit(col, w)) need.push(w);
    });
  });
  const online = {}; const toFetch = [];
  const uniqNeed = need.filter(function(w, i) { return need.indexOf(w) === i; });
  for (const w of uniqNeed) { const c = await KV.get('wb2:' + w, 'json'); if (c) online[w] = c; else toFetch.push(w); }
  if (toFetch.length) { const got = await mzOnlineCheck(toFetch); for (const w in got) { online[w] = got[w]; KV.put('wb2:' + w, JSON.stringify(got[w])); } }
  function scoreWord(col, w) {
    if (w.length < 2 || w.charAt(0) !== st.letter) return 0;
    if ((bank[col] || []).indexOf(w) !== -1) return 10;
    if (mzRootHit(col, w)) return 10;
    if (MZ_ONLINE_COLS.indexOf(col) !== -1) {
      const o = online[w];
      if (!o) return 0;
      if (o.wp) return 10;
      if (o.exists) {
        const keys = MZ_CAT_KEYS[col];
        const catOk = (o.cats || []).some(function(c) { return keys.some(function(k) { return c.indexOf(k) !== -1; }); });
        return catOk ? 10 : 5;
      }
      return 0;
    }
    return 10;
  }
  st.players.forEach(function(p) { p.cells = [0,0,0,0,0,0]; });
  MZ_COLS.forEach(function(col, i) {
    const scored = st.players.map(function(p) { return scoreWord(col, mzNorm(p.answers[col] || '')); });
    st.players.forEach(function(p, pi) {
      let s = scored[pi];
      const w = mzNorm(p.answers[col] || '');
      const dup = st.players.some(function(o, oi) { return oi !== pi && s > 0 && mzNorm(o.answers[col] || '') === w; });
      if (dup) s = Math.ceil(s / 2);
      if (i === st.golden) s *= 2;
      p.cells[i] = s;
      p.score += s;
    });
  });
  st.players.forEach(function(p) { p.score += (p.timeBonus || 0); });
  st.phase = 'result';
  const sorted = st.players.slice().sort(function(a, b) { return b.score - a.score; });
  st.result = { winnerId: sorted.length > 1 && sorted[0].score > sorted[1].score ? sorted[0].id : (sorted.length === 1 ? sorted[0].id : null), sorted: sorted.map(function(p) { return { id: p.id, name: p.name, score: p.score }; }) };
}

async function mzPostResult(env, KV, st) {
  const winId = st.result.winnerId;
  let total = 0;
  for (const p of st.players) {
    total += p.score;
    const u = await mzGetUser(KV, p.id);
    const win = p.id === winId;
    const coins = (win ? 20 : 0) + Math.floor(p.score / 5);
    u.coins += coins;
    p.coinsWon = coins;
    await KV.put('u:' + p.id, JSON.stringify(u));
  }
  const gTotal = parseInt(await KV.get('mzg:' + st.chat) || '0');
  await KV.put('mzg:' + st.chat, String(gTotal + total));
  let t = '🏁 نتیجهٔ میزگرد!\n\n';
  t += 'ستون | ' + st.players.map(function(p) { return mzShort(p.name); }).join(' | ') + '\n';
  MZ_COLS.forEach(function(col, i) {
    t += col + ' | ' + st.players.map(function(p) { return (p.cells ? p.cells[i] : 0); }).join(' | ') + '\n';
  });
  t += '⚡ سرعت | ' + st.players.map(function(p) { return p.timeBonus || 0; }).join(' | ') + '\n';
  t += '🏅 مجموع | ' + st.players.map(function(p) { return p.score; }).join(' | ') + '\n\n';
  const medals = ['🥇','🥈','🥉','۴.','۵.','۶.','۷.','۸.'];
  st.result.sorted.forEach(function(r, i) { t += (medals[i] || '•') + ' ' + r.name + ' — ' + r.score + '\n'; });
  if (winId) { const wp = st.players.find(function(p) { return p.id === winId; }); if (wp) t += '\n👑 واژه‌سالار این میز: ' + wp.name + '\n'; }
  const winIdx = winId ? st.players.findIndex(function(p) { return p.id === winId; }) : -1;
  let betText = '';
  for (const b of st.bets) {
    const targetName = st.players[b.on] ? st.players[b.on].name : '؟';
    const u = await mzGetUser(KV, b.user);
    if (winId === null) { u.coins += b.amount; betText += '↩️ پیش‌بینی ' + b.name + ' دربارهٔ ' + targetName + ' برگشت.\n'; }
    else if (b.on === winIdx) { const gain = b.amount + Math.floor(b.amount * 0.8); u.coins += gain; betText += '💰 ' + b.name + ' هوادارِ ' + targetName + ' برنده شد: +' + gain + '\n'; }
    else betText += '😅 پیش‌بینی ' + b.name + ' دربارهٔ ' + targetName + ' درست نبود.\n';
    await KV.put('u:' + b.user, JSON.stringify(u));
  }
  if (betText) t += '\n' + betText;
  t += '\n' + MZ_TAUNTS[Math.floor(Math.random() * MZ_TAUNTS.length)];
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: t });
  let active = (await KV.get('mz_active', 'json')) || [];
  active = active.filter(function(c) { return c !== String(st.chat); });
  await KV.put('mz_active', JSON.stringify(active));
  await KV.put('mz:' + st.chat, JSON.stringify(st));
}

async function mzStartPlay(env, KV, st, key) {
  st.phase = 'play';
  st.letter = MZ_LETTERS[Math.floor(Math.random() * MZ_LETTERS.length)];
  st.golden = Math.floor(Math.random() * MZ_COLS.length);
  st.endsAt = Date.now() + 90000;
  st.players.forEach(function(p) { p.idx = 0; p.answers = {}; p.submitted = false; p.score = 0; p.timeBonus = 0; p.cells = [0,0,0,0,0,0]; });
  await KV.put(key, JSON.stringify(st));
  const betRows = [];
  for (let i = 0; i < st.players.length; i += 2) {
    const row = [{ text: '🔮 ' + st.players[i].name, callback_data: 'mz_bet_' + i }];
    if (st.players[i + 1]) row.push({ text: '🔮 ' + st.players[i + 1].name, callback_data: 'mz_bet_' + (i + 1) });
    betRows.push(row);
  }
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: '🔔⚔️ نبرد شروع شد!\nحرف: ' + st.letter + ' | ستون طلایی: ' + MZ_COLS[st.golden] + ' ⭐\n جواب‌ها رو خصوصی به بات بفرستید.\n🔮 تماشاگرها: پیش‌بینی کنید کی قهرمانه!', reply_markup: { inline_keyboard: betRows } });
  for (const p of st.players) {
    await mzBale(env, 'sendMessage', { chat_id: p.id, text: '🏟️ میزگرد شروع!\nحرف: ' + st.letter + '\n۱/۶ ' + MZ_COLS[0] + '؟' });
  }
}

async function mzHandle(update, env, ctx) {
  const KV = env.GAME_KV;
  if (update.message) {
    const msg = update.message;
    const chat = msg.chat || {};
    const text = (msg.text || '').trim();
    const isGroup = chat.type === 'group' || chat.type === 'supergroup';

    if (isGroup && (text === '/نبرد' || text === '/nabard')) {
      const uid = String(msg.from.id);
      const key = 'mz:' + chat.id;
      const existing = await KV.get(key, 'json');
      if (existing && existing.phase !== 'result') {
        const stale = (existing.phase === 'join' && Date.now() - existing.createdAt > 300000) || (existing.phase !== 'join' && existing.endsAt && Date.now() > existing.endsAt + 120000);
        if (!stale) {
          const m = '⚔️ یه میز بالفعل بازه! یا بشین، یا صبر کن تموم بشه.';
          await mzBale(env, 'sendMessage', { chat_id: chat.id, text: m, reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '🗑️ بستن میز (میزبان)', callback_data: 'mz_close' }] ] } });
          await mzBale(env, 'sendMessage', { chat_id: uid, text: m });
          return true;
        }
      }
      const st = { chat: chat.id, host: uid, phase: 'join', createdAt: Date.now(), players: [], bets: [], letter: null, golden: 0, endsAt: 0, result: null };
      await KV.put(key, JSON.stringify(st));
      let active = (await KV.get('mz_active', 'json')) || [];
      if (active.indexOf(String(chat.id)) === -1) active.push(String(chat.id));
      await KV.put('mz_active', JSON.stringify(active));
      const sent = await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '📣🏟️ میزگرد واژه‌ها — ' + mzWhen() + '\n👑 میزبان: ' + (msg.from.first_name || '؟') + '\n۹۰ ثانیه، ۶ ستون، ستون طلایی ×۲.\nجواب‌ها خصوصی؛ نتیجه عمومی! تماشاگرها پیش‌بینی کنند 🔮', reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '⚔️ شروع نبرد (میزبان)', callback_data: 'mz_start' }], [{ text: '📨 دعوت دوستان به گروه', callback_data: 'mz_invite' }] ] } });
      try { if (sent && sent.result && sent.result.message_id) await mzBale(env, 'pinChatMessage', { chat_id: chat.id, message_id: sent.result.message_id, disable_notification: true }); } catch (e) {}
      return true;
    }

    if (isGroup && (text === '/لغو' || text === '/لغو میز')) {
      const uid = String(msg.from.id);
      const key = 'mz:' + chat.id;
      const st = await KV.get(key, 'json');
      if (st && st.phase !== 'result') {
        if (uid === st.host) await mzClose(env, KV, key, chat.id);
        else await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه میز رو بببنده!' });
      }
      return true;
    }

    if (chat.type === 'private' && msg.text && msg.text.charAt(0) !== '/') {
      const uid = String(msg.from.id);
      const g = await KV.get('mzu:' + uid);
      if (g) {
        const st = await KV.get('mz:' + g, 'json');
        if (st && st.phase === 'play') {
          const p = st.players.find(function(x) { return x.id === uid; });
          if (p && !p.submitted) {
            p.answers[MZ_COLS[p.idx]] = msg.text.trim();
            p.idx++;
            if (p.idx >= MZ_COLS.length) {
              p.submitted = true;
              p.timeBonus = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000)) * 2;
              await mzBale(env, 'sendMessage', { chat_id: uid, text: '✅ ثبت شد! ⚡ پاداش سرعت: +' + p.timeBonus + '\nمنتظر بقیه...' });
            } else {
              await mzBale(env, 'sendMessage', { chat_id: uid, text: (p.idx + 1) + '/۶ ' + MZ_COLS[p.idx] + '؟' });
            }
            if (st.players.every(function(x) { return x.submitted; })) { await mzJudge(KV, st); await mzPostResult(env, KV, st); }
            await KV.put('mz:' + g, JSON.stringify(st));
            return true;
          }
        }
      }
    }
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    if (data.indexOf('mz_') === 0) {
      const chatId = cb.message.chat.id;
      const key = 'mz:' + chatId;
      const st = await KV.get(key, 'json');
      await mzBale(env, 'answerCallbackQuery', { callback_query_id: cb.id });
      if (!st) return true;
      const uid = String(cb.from.id);
      const name = cb.from.first_name || 'بازیکن';

      if (data === 'mz_join') {
        if (st.phase !== 'join') { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'میز از دست رفت! دور بعد زودتر بیا.' }); return true; }
        if (st.players.length >= 8) return true;
        if (!st.players.find(function(p) { return p.id === uid; })) {
          st.players.push({ id: uid, name: name, answers: {}, idx: 0, submitted: false, score: 0, timeBonus: 0, cells: [0,0,0,0,0,0] });
          await KV.put('mzu:' + uid, String(chatId));
          await mzBale(env, 'sendMessage', { chat_id: chatId, text: '🪑 ' + name + ' پای میز نشست! (' + st.players.length + ' نفر)' });
          await KV.put(key, JSON.stringify(st));
        }
        return true;
      }

      if (data === 'mz_close') {
        if (uid !== st.host) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه میز رو بببنده!' }); return true; }
        await mzClose(env, KV, key, chatId);
        return true;
      }

      if (data === 'mz_invite') {
        let link = '';
        try { const r = await mzBale(env, 'exportChatInviteLink', { chat_id: chatId }); if (r.ok) link = r.result; } catch (e) {}
        if (link) await mzBale(env, 'sendMessage', { chat_id: uid, text: '📨 لینک دعوت گروه:\n' + link + '\nبرای دوستانت بفرست تا بیان پای میز!' });
        else await mzBale(env, 'sendMessage', { chat_id: uid, text: 'برای دعوت دوستان: از تنظیمات گروه، لینک دعوت رو کپی کن و بفرست.\n(اگه بخوای بات خودش لینک بسازه، باید مدیر گروه باشه)' });
        return true;
      }

      if (data === 'mz_start') {
        if (uid !== st.host) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه نبرد رو شروع کنه!' }); return true; }
        if (st.phase !== 'join') return true;
        if (st.players.length < 2) {
          const m = 'حداقل ۲ نفر باید پای میز باشن!';
          await mzBale(env, 'sendMessage', { chat_id: chatId, text: m });
          await mzBale(env, 'sendMessage', { chat_id: uid, text: m });
          return true;
        }
        st.phase = 'countdown';
        st.startsAt = Date.now() + MZ_COUNTDOWN * 1000;
        await KV.put(key, JSON.stringify(st));
        await mzBale(env, 'sendMessage', { chat_id: chatId, text: '📢🔔 نبرد تا ' + MZ_COUNTDOWN + ' ثانیه دیگه شروع میشه! ⏳ آماده باشید...' });
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async function() {
            await new Promise(function(r) { setTimeout(r, MZ_COUNTDOWN * 1000 + 500); });
            const st2 = await KV.get(key, 'json');
            if (st2 && st2.phase === 'countdown') await mzStartPlay(env, KV, st2, key);
          })());
        }
        return true;
      }

      if (data.indexOf('mz_bet_') === 0) {
        if (st.phase !== 'play') return true;
        const idx = Number(data.slice(7));
        const target = st.players[idx];
        if (!target) return true;
        if (st.bets.find(function(b) { return b.user === uid; })) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'قبلاً پیش‌بینی کردی!' }); return true; }
        const u = await mzGetUser(KV, uid);
        if (u.coins < 20) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'سکه کافی نیست (۲۰ لازمه)' }); return true; }
        u.coins -= 20;
        await KV.put('u:' + uid, JSON.stringify(u));
        st.bets.push({ user: uid, name: name, on: idx, amount: 20 });
        await KV.put(key, JSON.stringify(st));
        await mzBale(env, 'sendMessage', { chat_id: uid, text: '🔮 پیش‌بینی ۲۰ سکه‌ای روی قهرمانیِ ' + target.name + ' ثبت شد!' });
        return true;
      }
      return true;
    }
  }
  return false;
}

export default {
  async fetch(request, env, ctx) {
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
      const res = await fetch(API + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return res.json();
    }
    function fa(n) { const p = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹']; return String(n).replace(/\d/g, function(d) { return p[d]; }); }
    function json(obj) {
      return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }
    async function getUser(id) {
      const raw = await KV.get('u:' + id, 'json');
      if (raw) return raw;
      return { coins: 0, best: 0, games: 0, items: [], claimed: {}, daily: {}, esm: { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } } };
    }
    async function saveUser(id, u) { await KV.put('u:' + id, JSON.stringify(u)); }
    async function rankText() {
      const lb = (await KV.get('lb', 'json')) || [];
      if (lb.length === 0) return '🏆 هنوز کسی توی رتبه‌بندی نیست! اولین نفر باش!';
      const medals = ['🥇','','🥉','۴.','۵.'];
      let t = '🏆 برترین‌های مرکز بازی:\n\n';
      lb.slice(0, 5).forEach(function(e, i) { t += medals[i] + ' ' + e.name + ' — رکورد: ' + fa(e.best) + '\n'; });
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
      await bale('sendMessage', { chat_id: chatId, text: '📋 کارهای سکه‌دار:\n\n👥 عضویت کانال: +۱۰\n👥 عضویت گروه: +۱۰۰\n هر بازی: تا +۵۰\n🎯 رکورد جدید: +۵۰ اضافه\n📅 ورود روزانه: +۳۰ (خودکار)', reply_markup: { inline_keyboard: [ [{ text: '📢 کانال', url: 'https://ble.ir/' + CHANNEL.replace('@', '') }, { text: '👥 گروه', url: 'https://ble.ir/' + GROUP.replace('@', '') }], [{ text: '✅ عضو کانال شدم', callback_data: 'task_channel' }], [{ text: '✅ عضو گروه شدم', callback_data: 'task_group' }] ] } });
    }
    async function sendShop(chatId, u) {
      let t = '🛒 فروشگاه اسکین و آیتم\n\n';
      SHOP.forEach(function(i) { const owned = u.items.includes(i.id) ? ' ✅' : ''; t += i.name + ' — ' + fa(i.price) + ' سکه' + owned + '\n'; });
      t += '\n🪙 سکه تو: ' + fa(u.coins);
      const rows = [];
      SHOP.forEach(function(i) { if (!u.items.includes(i.id)) rows.push([{ text: 'خرید ' + i.name + ' (' + fa(i.price) + ')', callback_data: 'buy_' + i.id }]); });
      if (rows.length === 0) rows.push([{ text: 'همه رو خریدی! 🎉', callback_data: 'coins' }]);
      await bale('sendMessage', { chat_id: chatId, text: t, reply_markup: { inline_keyboard: rows } });
    }

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
        } catch (e) { return json({ ok: false }); }
      }
    }

    const ESM_COLS = MZ_COLS;
    const ESM_LETTERS = MZ_LETTERS;
    const ESM_SHOP = [ { id: 'mirror', name: '👁️ آینه اضافه', price: 50 }, { id: 'fog', name: '🌫️ مه اضافه', price: 40 } ];
    const ESM_CAT_KEYS = MZ_CAT_KEYS;
    const ESM_ONLINE_COLS = MZ_ONLINE_COLS;
    function normFa(s) { return mzNorm(s); }
    async function esmGet(r) { return await KV.get('esm:' + r, 'json'); }
    async function esmSet(r, s) { await KV.put('esm:' + r, JSON.stringify(s), { expirationTtl: 86400 }); }
    function esmNewRoom() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 4; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }
    const ESM_BANK_URL = 'https://metabolicbit-jpg.github.io/bale-game/words.json';
    let ESM_BANK = null;
    async function esmLoadBank() {
      if (ESM_BANK) return ESM_BANK;
      try { const cached = await KV.get('esm_bank', 'json'); if (cached && cached.list) { ESM_BANK = cached.list; return ESM_BANK; } } catch (e) {}
      try { const r = await fetch(ESM_BANK_URL); const list = await r.json(); ESM_BANK = list; KV.put('esm_bank', JSON.stringify({ list: list })); return list; } catch (e) { return {}; }
    }

    async function esmJudge(st) {
      const p0 = st.players[0], p1 = st.players[1];
      let s0 = 0, s1 = 0;
      const detail = [];
      const bank = await esmLoadBank();
      const needOnline = [];
      ESM_COLS.forEach(function(col) {
        if (ESM_ONLINE_COLS.indexOf(col) === -1) return;
        [p0.answers[col], p1.answers[col]].forEach(function(w) {
          w = normFa(w);
          if (w.length >= 2 && w.charAt(0) === st.letter && (bank[col] || []).indexOf(w) === -1 && !mzRootHit(col, w)) needOnline.push(w);
        });
      });
      const online = {}; const toFetch = [];
      const uniqNeed = needOnline.filter(function(w, i) { return needOnline.indexOf(w) === i; });
      for (const w of uniqNeed) { const c = await KV.get('wb2:' + w, 'json'); if (c) online[w] = c; else toFetch.push(w); }
      if (toFetch.length) { const got = await mzOnlineCheck(toFetch); for (const w in got) { online[w] = got[w]; KV.put('wb2:' + w, JSON.stringify(got[w])); } }
      function wordScore(col, w) {
        if (w.length < 2 || w.charAt(0) !== st.letter) return 0;
        if ((bank[col] || []).indexOf(w) !== -1) return 10;
        if (mzRootHit(col, w)) return 10;
        if (ESM_ONLINE_COLS.indexOf(col) !== -1) {
          const o = online[w];
          if (!o) return 0;
          if (o.wp) return 10;
          if (o.exists) {
            const keys = ESM_CAT_KEYS[col];
            const catOk = (o.cats || []).some(function(c) { return keys.some(function(k) { return c.indexOf(k) !== -1; }); });
            return catOk ? 10 : 5;
          }
          return 0;
        }
        return 10;
      }
      ESM_COLS.forEach(function(col, i) {
        const a = normFa(p0.answers[col] || '');
        const b = normFa(p1.answers[col] || '');
        let pa = wordScore(col, a);
        let pb = wordScore(col, b);
        if (pa && pb && a === b) { pa = Math.ceil(pa / 2); pb = Math.ceil(pb / 2); }
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
          return json({ ok: true, st: { phase: st.phase, letter: st.letter, golden: st.golden, endsAt: st.endsAt, code: st.code, players: st.players.map(function(p) { return { id: p.id, name: p.name, submitted: p.submitted, score: p.score, coinsWon: p.coinsWon || 0, timeBonus: p.timeBonus || 0 }; }), result: st.result, peek: peek, myPowers: me ? me.powers : null } });
        }
        const body = await request.json();
        const room = (body.room || '').toUpperCase();
        if (act === 'create' || act === 'join') {
          let st;
          if (act === 'create') { const code = esmNewRoom(); st = { code: code, phase: 'lobby', players: [], letter: null, golden: 0, endsAt: 0, result: null }; await esmSet(code, st); }
          else { st = await esmGet(room); if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' }); if (st.players.length >= 2) return json({ ok: false, error: 'اتاق پره!' }); }
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
      } catch (e) { return json({ ok: false, error: e.message }); }
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        if (await mzHandle(update, env, ctx)) return new Response('ok');
        if (update.message) {
          const text = update.message.text || '';
          const chat = update.message.chat;
          const uid = String(chat.id);
          const u = await getUser(uid);
          const today = new Date().toISOString().slice(0, 10);
          if (text === '/start') {
            let extra = '';
            if (u.daily.login !== today) { u.daily.login = today; u.coins += 30; await saveUser(uid, u); extra = '\n\n🎁 جایزه ورود امروز: +۳۰ سکه'; }
            await bale('sendMessage', { chat_id: chat.id, text: '🎮 به مرکز بازی خوش اومدی!' + extra + '\n\n🪙 سکه تو: ' + fa(u.coins), reply_markup: { inline_keyboard: [ [{ text: '🐤 پرنده‌پرش', url: GAME_URL + '?user=' + uid }, { text: '👤 سایه‌پرش', url: SHADOW_URL + '?user=' + uid }], [{ text: '🥚 آخرین تخم', url: EGG_URL + '?user=' + uid }, { text: '📝 نبرد واژه‌ها', url: ESM_URL + '?user=' + uid }], [{ text: '📋 کارها', callback_data: 'tasks' }, { text: '🛒 فروشگاه', callback_data: 'shop' }], [{ text: '🏆 رتبه‌بندی', callback_data: 'rank' }, { text: '🪙 سکه‌هام', callback_data: 'coins' }] ] } });
          }
          else if (text === '/coins') { await bale('sendMessage', { chat_id: chat.id, text: '🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ بهترین رکورد: ' + fa(u.best) }); }
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
          else if (data === 'tasks') { await bale('answerCallbackQuery', { callback_query_id: cb.id }); await sendTasks(chatId); return new Response('ok'); }
          else if (data === 'shop') { await bale('answerCallbackQuery', { callback_query_id: cb.id }); await sendShop(chatId, u); return new Response('ok'); }
          else if (data === 'task_channel' || data === 'task_group') {
            const isChannel = data === 'task_channel';
            const target = isChannel ? CHANNEL : GROUP;
            const key = isChannel ? 'channel' : 'group';
            const st = await bale('getChatMember', { chat_id: target, user_id: Number(uid) });
            const isMember = st.ok && ['member', 'administrator', 'creator'].includes(st.result.status);
            if (!isMember) msg = '❌ هنوز عضو نشدی! اول عضو ' + target + ' بشو، بعد دوباره بزن.';
            else if (u.claimed[key]) msg = 'این جایزه رو قبلاً گرفتی!';
            else { u.claimed[key] = 1; u.coins += 100; await saveUser(uid, u); msg = '✅ عضویت تأیید شد! +۱۰ سکه\n🪙 موجودی: ' + fa(u.coins); }
          }
          else if (data.startsWith('buy_')) {
            const item = SHOP.find(function(i) { return i.id === data.slice(4); });
            if (!item) msg = 'پیدا نشد!';
            else if (u.items.includes(item.id)) msg = 'قبلاً خریدیش!';
            else if (u.coins < item.price) msg = '❌ سکه کافی نیست! ' + fa(item.price - u.coins) + ' سکه دیگه لازمه. برو بازی کن! 🎮';
            else { u.coins -= item.price; u.items.push(item.id); await saveUser(uid, u); msg = '🛍️ خرید موفق: ' + item.name + '\n🪙 موجودی: ' + fa(u.coins); }
          }
          await bale('answerCallbackQuery', { callback_query_id: cb.id });
          if (msg) await bale('sendMessage', { chat_id: chatId, text: msg });
        }
      } catch (e) { console.log('webhook error:', e.message); }
      return new Response('ok');
    }

    return new Response('🎮 Bale Game Server v10 is running!');
  },

  async scheduled(event, env) {
    const KV = env.GAME_KV;
    const active = (await KV.get('mz_active', 'json')) || [];
    const remaining = [];
    for (const chatId of active) {
      const st = await KV.get('mz:' + chatId, 'json');
      if (!st) continue;
      if (st.phase === 'countdown' && Date.now() > st.startsAt) { await mzStartPlay(env, KV, st, 'mz:' + chatId); remaining.push(chatId); }
      else if (st.phase === 'play' && Date.now() > st.endsAt) {
        st.players.forEach(function(p) { if (!p.submitted) { p.submitted = true; p.timeBonus = 0; } });
        await mzJudge(KV, st);
        await mzPostResult(env, KV, st);
      }
      else if (st.phase === 'join' && Date.now() - st.createdAt > 300000) { await mzBale(env, 'sendMessage', { chat_id: chatId, text: '😴 میز جمع شد (کسی شروع نکرد).' }); }
      else remaining.push(chatId);
    }
    await KV.put('mz_active', JSON.stringify(remaining));
  }
};