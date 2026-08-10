// ========== میزگرد بله (v22: دژ شش‌لایه + میز خودکار + زنگ تفریح) ==========
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
const MZ_GUIDE = '📖 راهنمای میزگرد واژه‌ها\n\n۱) 🏟️ ساخت میز: توی گروه بنویس /نبرد\n۲)  عضوها با دکمهٔ «نشستن پای میز» می‌شن (۲ تا ۸ نفر)\n۳) ️ میزبان با «شروع نبرد» آغاز می‌کنه (شمارش معکوس ۲۰ ثانیه)\n۴) ✍️ جواب هر ستون رو خصوصی به بات بفرست\n۵)  نتیجه عمومی + عنوان 👑 واژه‌سالار\n۶) 🔮 تماشاگرها پیش‌بینی می‌کنن کی قهرمانه\n۷) ️ کلمات ردشده به دادگاه میز میرن؛ با نصف+۱ رأی مثبت، تأیید و به فرهنگ‌نامه اضافه میشن\n۸) ️ بستن میز: /لغو (فقط میزبان)';
const MZ_RULES = '📜 قوانین گروه مرکز بازی\n\n۱) ❌ سالن قفله؛ گفتگو فقط در زنگ تفریح\n۲) ️ لینک، فوروارد، تبلیغ = حذف + اخطار\n۳)  کلام نامناسب = حذف + اخطار\n۴) 🔇 ۳ اخطار = ۱ ساعت سکوت؛ ۵ = اخراج\n۵) 🏟️ میزگرد هر شب ۲۱:۳۰ خودکار\n۶) ✍️ جواب‌ها فقط خصوصی به بات\n۷) 📬 گزارش تخلف: پیام رو به بات فوروارد کن\n۸) ❤️ احترام = خط قرمز';
const MOD_BW = ['کیر','کون','جنده','حرومی','بیناموس','بی‌ناموس','ناموست','گوه','لاشی','خرکس'];

function cbButtons(pid) {
  return { inline_keyboard: [ [{ text: '❤️ پسندیدم (+۳)', callback_data: 'cb_like:' + pid }, { text: '💡 پیشنهاد به مجله (+۵)', callback_data: 'cb_sug' }] ] };
}

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
async function mzLearnedHas(KV, col, w) {
  const l = (await KV.get('learned:' + col, 'json')) || [];
  return l.indexOf(w) !== -1;
}
async function mzCheckMember(env, uid) {
  try {
    const r = await mzBale(env, 'getChatMember', { chat_id: '@bale_game_center', user_id: Number(uid) });
    return !!(r && r.ok && ['member', 'administrator', 'creator'].includes(r.result.status));
  } catch (e) { return false; }
}
async function modSetLock(env, gid, lock) {
  try { await mzBale(env, 'setChatPermissions', { chat_id: gid, permissions: { can_send_messages: !lock, can_send_media_messages: !lock, can_send_other_messages: !lock, can_add_web_page_previews: !lock } }); } catch (e) {}
}
async function modCount(KV, k) {
  const s = (await KV.get('modstat', 'json')) || { del: 0, mute: 0, rep: 0, join: 0 };
  s[k] = (s[k] || 0) + 1;
  await KV.put('modstat', JSON.stringify(s));
}

async function cbLoadBank(KV) {
  let bank = null;
  try { bank = await KV.get('cb_bank', 'json'); } catch (e) {}
  const at = parseInt(await KV.get('cb_bank_at') || '0');
  const fresh = Date.now() - at < 24 * 3600 * 1000;
  if (fresh && bank && bank.sections) return bank;
  try {
    const r = await fetch(CB_URL);
    const nb = await r.json();
    if (nb && nb.sections) {
      await KV.put('cb_bank', JSON.stringify(nb));
      await KV.put('cb_bank_at', String(Date.now()));
      return nb;
    }
  } catch (e) {}
  return bank;
}
async function cbPost(env, sectionKey, opts) {
  const KV = env.GAME_KV;
  const CHANNEL = '@bale_game_center';
  let text = null;
  if (sectionKey === 'nabz') {
    const queue = (await KV.get('cb_news', 'json')) || [];
    if (queue.length) {
      const it = queue.shift();
      await KV.put('cb_news', JSON.stringify(queue));
      text = '🌍 نبض روز\n\n' + it.t + '\n\n🔗 ' + (it.l || '') + '\n\n#نبض_روز';
    }
  }
  const bank = await cbLoadBank(KV);
  if (!text && bank && bank.sections && bank.sections[sectionKey]) {
    const sec = bank.sections[sectionKey];
    const items = sec.items || [];
    if (items.length) {
      let ptr = parseInt(await KV.get('cb_ptr:' + sectionKey) || '0');
      if (isNaN(ptr) || ptr >= items.length) ptr = 0;
      const it = items[ptr];
      await KV.put('cb_ptr:' + sectionKey, String(ptr + 1));
      text = (sec.emoji || '') + ' ' + it.t + '\n\n' + (sec.hash || '');
      if (opts && opts.riddle) {
        text += '\n\n🕰️ جواب ساعت ۲۲:۳۰ همین‌جا!';
        await KV.put('cb_riddle', JSON.stringify({ date: new Date().toISOString().slice(0, 10), a: it.a || '' }));
      }
    }
  }
  if (!text) text = CB_EMERG[Math.floor(Math.random() * CB_EMERG.length)];
  try { await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: text, reply_markup: cbButtons(sectionKey + ':' + new Date().toISOString().slice(0, 10)) }); } catch (e) {}
}
async function cbAnswer(env) {
  const KV = env.GAME_KV;
  const r = (await KV.get('cb_riddle', 'json')) || null;
  const today = new Date().toISOString().slice(0, 10);
  if (r && r.date === today && r.a) {
    try { await mzBale(env, 'sendMessage', { chat_id: '@bale_game_center', text: '✅ جواب معمای امروز: ' + r.a + '\n\nاگه درست حدس زدی، به خودت یه 🏆 بده! فردا معمای تازه.', reply_markup: cbButtons('answer:' + today) }); } catch (e) {}
  }
}

function cbClean(s) {
  return (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}
function cbRssParse(xml, max) {
  const out = [];
  const re = /<item\b[\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && out.length < max) {
    const block = m[0];
    const t = /<title[\s\S]*?>([\s\S]*?)<\/title>/i.exec(block);
    const l = /<link[\s\S]*?>([\s\S]*?)<\/link>/i.exec(block);
    if (t && l) out.push({ t: cbClean(t[1]), l: cbClean(l[1]) });
  }
  return out;
}
async function engineInject(env) {
  const KV = env.GAME_KV;
  const FEEDS = ['https://digiato.com/feed', 'https://www.zoomit.ir/feed'];
  const seen = (await KV.get('cb_seen', 'json')) || [];
  const queue = (await KV.get('cb_news', 'json')) || [];
  let added = 0;
  for (const f of FEEDS) {
    if (added >= 3) break;
    try {
      const r = await fetch(f, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const xml = await r.text();
      const items = cbRssParse(xml, 6);
      for (const it of items) {
        if (added >= 3) break;
        if (!it.t || it.t.length < 15 || seen.indexOf(it.t) !== -1) continue;
        seen.push(it.t);
        queue.push({ t: it.t, l: it.l });
        added++;
      }
    } catch (e) {}
  }
  while (seen.length > 300) seen.shift();
  while (queue.length > 10) queue.shift();
  await KV.put('cb_seen', JSON.stringify(seen));
  await KV.put('cb_news', JSON.stringify(queue));
}

async function mzOnlineCheck(words) {
  const out = {};
  const uniq = words.filter(function(w, i) { return words.indexOf(w) === i; }).slice(0, 15);
  if (!uniq.length) return { out: out, cacheable: false };
  const titles = uniq.map(encodeURIComponent).join('|');
  const wt = {}; const wp = {};
  let ok1 = false, ok2 = false;
  try {
    const r = await fetch('https://fa.wiktionary.org/w/api.php?action=query&prop=categories&titles=' + titles + '&cllimit=50&format=json&origin=*');
    const j = await r.json();
    const pages = (j.query && j.query.pages) || {};
    for (const id in pages) { const pg = pages[id]; if (pg.missing !== undefined) wt[pg.title] = { exists: false, cats: [] }; else wt[pg.title] = { exists: true, cats: (pg.categories || []).map(function(c) { return c.title; }) }; }
    ok1 = true;
  } catch (e) {}
  try {
    const r2 = await fetch('https://fa.wikipedia.org/w/api.php?action=query&titles=' + titles + '&format=json&origin=*');
    const j2 = await r2.json();
    const pages2 = (j2.query && j2.query.pages) || {};
    for (const id in pages2) { const pg = pages2[id]; wp[pg.title] = pg.missing === undefined; }
    ok2 = true;
  } catch (e) {}
  uniq.forEach(function(w) { const t = wt[w]; out[w] = { exists: !!(t && t.exists), cats: t ? t.cats : [], wp: !!wp[w] }; });
  const missing = uniq.filter(function(w) { return !out[w].wp && !out[w].exists; }).slice(0, 5);
  for (const w of missing) {
    try {
      const r3 = await fetch('https://fa.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(w) + '&limit=1&format=json');
      const j3 = await r3.json();
      if (j3 && j3[1] && j3[1][0] && mzNorm(j3[1][0]) === w) out[w].wp = true;
    } catch (e) {}
  }
  return { out: out, cacheable: ok1 && ok2 };
}
async function mzConsensus(KV, env, col, w, uid) {
  const key = 'wc:' + w;
  const rec = (await KV.get(key, 'json')) || { u: {} };
  rec.u[uid] = col;
  const distinct = Object.keys(rec.u).length;
  if (distinct >= 2) {
    const learned = (await KV.get('learned:' + col, 'json')) || [];
    if (learned.indexOf(w) === -1) {
      learned.push(w);
      await KV.put('learned:' + col, JSON.stringify(learned));
      for (const id of Object.keys(rec.u)) {
        if (/^\d+$/.test(id)) {
          const u = await mzGetUser(KV, id);
          u.coins += 10;
          await KV.put('u:' + id, JSON.stringify(u));
          try { await mzBale(env, 'sendMessage', { chat_id: id, text: '🎉 واژه «' + w + '» که ثبت کرده بودی، با اجماع بازیکن‌ها به فرهنگ‌نامهٔ نبرد واژه‌ها اضافه شد! +۱۰ سکه' }); } catch (e) {}
        }
      }
    }
    return true;
  }
  await KV.put(key, JSON.stringify(rec));
  return false;
}
async function mzClose(env, KV, key, chatId) {
  try { await KV.delete(key); } catch (e) {}
  let active = (await KV.get('mz_active', 'json')) || [];
  active = active.filter(function(c) { return c !== String(chatId); });
  await KV.put('mz_active', JSON.stringify(active));
  await mzBale(env, 'sendMessage', { chat_id: chatId, text: '🗑️ میز بسته شد. برای میز جدید: /نبرد' });
}

async function engineMorning(env) {
  const KV = env.GAME_KV;
  const CHANNEL = '@bale_game_center';
  let bank = null;
  try { const c = await KV.get('esm_bank', 'json'); if (c && c.list) bank = c.list; } catch (e) {}
  if (!bank) { try { const r = await fetch('https://metabolicbit-jpg.github.io/bale-game/words.json'); bank = await r.json(); } catch (e) {} }
  if (bank) {
    const col = MZ_COLS[Math.floor(Math.random() * MZ_COLS.length)];
    const list = bank[col] || [];
    if (list.length) {
      const w = list[Math.floor(Math.random() * list.length)];
      await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '📖 واژه روز — ستون «' + col + '»\n\n«' + w + '»\n\n🎮 امشب توی میزگرد با همین کلمه امتیاز بگیر!', reply_markup: cbButtons('word:' + new Date().toISOString().slice(0, 10)) });
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await KV.put('daily_code', JSON.stringify({ date: today, code: code }));
  await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '🎁 مأموریت روز: امروز یه میزگرد بزن و حداقل ۳ ستون رو پر کن!\n\n🔑 کد جایزه: ' + code + '\n\nکد رو خصوصی به بات بفرست:\n/کد ' + code + '\n→ +۲۵ سکه', reply_markup: cbButtons('mission:' + today) });
}

async function engineEvening(env) {
  const KV = env.GAME_KV;
  const CHANNEL = '@bale_game_center';
  const today = new Date().toISOString().slice(0, 10);
  try { await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '🎲 میزگرد امشب!\n\nساعت ۲۱:۳۰ پای میز حاضر باش؛ توی گروه «مرکز بازی» بنویس /نبرد\n\n👥 ble.ir/game_center_bale\n📖 راهنما: /rahnama', reply_markup: cbButtons('invite:' + today) }); } catch (e) {}
  const lb = (await KV.get('lb', 'json')) || [];
  if (lb.length) {
    let t = '🏆 تابلوی افتخار\n\n';
    const medals = ['🥇','','🥉','۴.','۵.'];
    lb.slice(0, 5).forEach(function(e, i) { t += medals[i] + ' ' + e.name + ' — ' + e.best + '\n'; });
    t += '\n🎯 فردا تو نفر اول باش!';
    try { await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: t, reply_markup: cbButtons('board:' + today) }); } catch (e) {}
  }
}

async function engineAutoNabard(env) {
  const KV = env.GAME_KV;
  const gid = await KV.get('group_main');
  if (!gid) return;
  const key = 'mz:' + gid;
  const existing = await KV.get(key, 'json');
  if (existing && existing.phase !== 'result') return;
  const adminId = (await KV.get('admin_id')) || '0';
  const st = { chat: Number(gid), host: adminId, phase: 'countdown', createdAt: Date.now(), startsAt: Date.now() + 60000, players: [], bets: [], letter: null, golden: 0, endsAt: 0, result: null, court: [], courtUntil: 0 };
  await KV.put(key, JSON.stringify(st));
  let active = (await KV.get('mz_active', 'json')) || [];
  if (active.indexOf(String(gid)) === -1) active.push(String(gid));
  await KV.put('mz_active', JSON.stringify(active));
  await mzBale(env, 'sendMessage', { chat_id: gid, text: '📣🏟️ میزگرد شبانهٔ خودکار — ' + mzWhen() + '\n⏳ شروع تا ۶۰ ثانیه؛ همین حالا پای میز بشین!\n۹۰ ثانیه، ۶ ستون، ستون طلایی ×۲ — جواب‌ها خصوصی 🔮', reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '📖 راهنما', callback_data: 'mz_guide' }] ] } });
}
async function engineRecess(env, open) {
  const KV = env.GAME_KV;
  const gid = await KV.get('group_main');
  if (!gid) return;
  await KV.put('recess', open ? '1' : '0');
  await modSetLock(env, gid, !open);
  await mzBale(env, 'sendMessage', { chat_id: gid, text: open ? '🎈 زنگ تفریح باز شد! ۲۰ دقیقه گفتگوی آزاد — با رعایت احترام و قوانین.' : '🏟️ زنگ تفریح تمام شد؛ سالن به حالت مسابقه برگشت.' });
}
async function engineDigest(env) {
  const KV = env.GAME_KV;
  const s = (await KV.get('modstat', 'json')) || { del: 0, mute: 0, rep: 0, join: 0 };
  const adminG = await KV.get('admin_id');
  if (adminG) await mzBale(env, 'sendMessage', { chat_id: adminG, text: '📊 گزارش شبانهٔ گروه\n\n🗑️ حذف: ' + s.del + '\n🔇 سکوت: ' + s.mute + '\n📬 گزارش: ' + s.rep + '\n👥 عضو جدید: ' + s.join + '\n\n' + ((s.del + s.mute) > 5 ? '⚠️ امروز پرفتنش بود؛ بررسی کن.' : '✅ همه‌چیز آروم بود.') });
  await KV.put('modstat', JSON.stringify({ del: 0, mute: 0, rep: 0, join: 0 }));
}

async function mzJudge(env, KV, st) {
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
  if (toFetch.length) {
    const got = await mzOnlineCheck(toFetch);
    for (const w in got.out) online[w] = got.out[w];
    if (got.cacheable) for (const w in got.out) KV.put('wb2:' + w, JSON.stringify(got.out[w]));
  }
  async function wordScore(col, w, uid) {
    if (w.length < 2 || w.charAt(0) !== st.letter) return 0;
    if ((bank[col] || []).indexOf(w) !== -1) return 10;
    if (await mzLearnedHas(KV, col, w)) return 10;
    if (mzRootHit(col, w)) return 10;
    if (MZ_ONLINE_COLS.indexOf(col) !== -1) {
      const o = online[w];
      if (o && o.wp) return 10;
      if (o && o.exists) {
        const keys = MZ_CAT_KEYS[col];
        const catOk = (o.cats || []).some(function(c) { return keys.some(function(k) { return c.indexOf(k) !== -1; }); });
        if (catOk) return 10;
      }
      if (w.length >= 3 && await mzConsensus(KV, env, col, w, uid)) return 10;
      if (o && o.exists) return 5;
      return 0;
    }
    return 10;
  }
  st.players.forEach(function(p) { p.cells = [0,0,0,0,0,0]; });
  for (let i = 0; i < MZ_COLS.length; i++) {
    const col = MZ_COLS[i];
    for (let pi = 0; pi < st.players.length; pi++) {
      const p = st.players[pi];
      const w = mzNorm(p.answers[col] || '');
      let s = await wordScore(col, w, p.id);
      const dup = st.players.some(function(o, oi) { return oi !== pi && s > 0 && mzNorm(o.answers[col] || '') === w; });
      if (dup) s = Math.ceil(s / 2);
      if (i === st.golden) s *= 2;
      p.cells[i] = s;
      p.score += s;
    }
  }
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
  if (winId) { const wp2 = st.players.find(function(p) { return p.id === winId; }); if (wp2) t += '\n👑 واژه‌سالار این میز: ' + wp2.name + '\n'; }
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

  st.court = [];
  const seenC = [];
  for (const p of st.players) {
    MZ_COLS.forEach(function(col, i) {
      if (st.court.length >= 4) return;
      const w = mzNorm(p.answers[col] || '');
      if (p.cells && p.cells[i] === 0 && w.length >= 3 && w.charAt(0) === st.letter && MZ_ONLINE_COLS.indexOf(col) !== -1 && seenC.indexOf(w) === -1) {
        seenC.push(w);
        st.court.push({ w: w, col: col, owner: p.id, ownerName: p.name, yes: [], no: [], done: false, g: i === st.golden });
      }
    });
  }
  if (st.court.length) {
    st.courtUntil = Date.now() + 600000;
    t += '\n🏛️ دادگاه میز: این کلمات رد شدن — رأی بدید!\n';
    st.court.forEach(function(c) { t += '• ' + c.w + ' (' + c.col + ') — مالِ ' + c.ownerName + '\n'; });
  } else { st.courtUntil = 0; }

  t += '\n' + MZ_TAUNTS[Math.floor(Math.random() * MZ_TAUNTS.length)];

  const courtRows = [];
  st.court.forEach(function(c, i) {
    courtRows.push([{ text: '👍 ' + c.w, callback_data: 'mz_vote_' + i + '_y' }, { text: '👎 ' + c.w, callback_data: 'mz_vote_' + i + '_n' }]);
  });
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: t, reply_markup: courtRows.length ? { inline_keyboard: courtRows } : undefined });

  let active = (await KV.get('mz_active', 'json')) || [];
  if (st.court.length) { if (active.indexOf(String(st.chat)) === -1) active.push(String(st.chat)); }
  else { active = active.filter(function(c2) { return c2 !== String(st.chat); }); }
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
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: '🔔️ نبرد شروع شد!\nحرف: ' + st.letter + ' | ستون طلایی: ' + MZ_COLS[st.golden] + ' ⭐\n جواب‌ها رو خصوصی به بات بفرستید.\n🔮 تماشاگرها: پیش‌بینی کنید کی قهرمانه!', reply_markup: { inline_keyboard: betRows } });
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

    if (chat.type === 'channel') return true;

    // ===== لایه‌های ۰ تا ۳: قفل، دروازهٔ ورود، محتوا، رفتار =====
    if (isGroup && msg.new_chat_members && msg.new_chat_members.length) {
      await KV.put('group_main', String(chat.id));
      const js = (await KV.get('joinbuf', 'json')) || [];
      js.push(Date.now());
      while (js.length && Date.now() - js[0] > 60000) js.shift();
      await KV.put('joinbuf', JSON.stringify(js), { expirationTtl: 120 });
      await modCount(KV, 'join');
      if (js.length >= 10) {
        await modSetLock(env, chat.id, true);
        const adminG = await KV.get('admin_id');
        if (adminG) await mzBale(env, 'sendMessage', { chat_id: adminG, text: '🚨 هجوم عضویت در گروه! قفل اضطراری فعال شد.' });
        return true;
      }
      for (const nm of msg.new_chat_members) {
        if (nm.is_bot) continue;
        const nmName = (nm.first_name || '') + ' ' + (nm.last_name || '');
        if (/https?:|@|\d{7,}/.test(nmName)) {
          try { await mzBale(env, 'restrictChatMember', { chat_id: chat.id, user_id: Number(nm.id), permissions: { can_send_messages: false } }); } catch (e) {}
        }
      }
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '👋 خوش اومدید!\n📜 قوانین: /rules\n🏟️ میزگرد هر شب ۲۱:۳۰ خودکار — جواب‌ها خصوصی به بات.' });
      return true;
    }
    if (isGroup && msg.from && !msg.from.is_bot) {
      const uidG = String(msg.from.id);
      const adminG = await KV.get('admin_id');
      let priv = uidG === adminG;
      if (!priv) {
        try { const cm = await mzBale(env, 'getChatMember', { chat_id: chat.id, user_id: Number(uidG) }); priv = !!(cm && cm.ok && ['administrator', 'creator'].includes(cm.result.status)); } catch (e) {}
      }
      if (!priv) {
        const recessOn = (await KV.get('recess')) === '1';
        const allowedCmd = /^\/(نبرد|nabard|لغو|laghv|rahnama|راهنما|کد|code|start|ایدی|id|قوانین|rules)\b/.test(text);
        const hasLink = /https?:\/\/|t\.me\/|ble\.ir\//i.test(msg.text || '');
        const isFwd = !!(msg.forward_from || msg.forward_from_chat || msg.forward_sender_name);
        const hasMedia = !!(msg.photo || msg.video || msg.sticker || msg.document || msg.audio || msg.voice);
        const bwExtra = (await KV.get('mod_words', 'json')) || [];
        const low = msg.text || '';
        const bad = MOD_BW.concat(bwExtra).some(function(w) { return w && low.indexOf(w) !== -1; });
        const fkey = 'flood:' + chat.id + ':' + uidG;
        const farr = (await KV.get(fkey, 'json')) || [];
        farr.push(Date.now());
        while (farr.length && Date.now() - farr[0] > 10000) farr.shift();
        await KV.put(fkey, JSON.stringify(farr), { expirationTtl: 120 });
        let violation = null;
        if (hasLink || isFwd) violation = 'لینک/فوروارد';
        else if (bad) violation = 'کلام نامناسب';
        else if (hasMedia) violation = 'رسانهٔ غیرمجاز';
        else if (farr.length >= 5) violation = 'اسپم';
        else if (!recessOn && !allowedCmd) violation = 'سالن قفله — فقط دکمه‌ها و دستورها';
        if (violation) {
          try { await mzBale(env, 'deleteMessage', { chat_id: chat.id, message_id: msg.message_id }); } catch (e) {}
          await modCount(KV, 'del');
          const wkey = 'warn:' + chat.id + ':' + uidG;
          const w = parseInt(await KV.get(wkey) || '0') + 1;
          if (w >= 5) {
            await KV.put(wkey, '0');
            try { await mzBale(env, 'banChatMember', { chat_id: chat.id, user_id: Number(uidG) }); } catch (e) {}
            await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ ' + (msg.from.first_name || 'کاربر') + ' به‌دلیل تکرار تخلف حذف شد.' });
          } else if (w >= 3) {
            await KV.put(wkey, String(w), { expirationTtl: 86400 });
            try { await mzBale(env, 'restrictChatMember', { chat_id: chat.id, user_id: Number(uidG), permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); } catch (e) {}
            await modCount(KV, 'mute');
            await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔇 ' + (msg.from.first_name || 'کاربر') + ' به‌دلیل «' + violation + '» ۱ ساعت ساکت شد.' });
          } else {
            await KV.put(wkey, String(w), { expirationTtl: 86400 });
            await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⚠️ ' + (msg.from.first_name || 'کاربر') + '، «' + violation + '» مجاز نیست.\nاخطار ' + w + ' از ۵ — ۳ اخطار=سکوت، ۵=اخراج.' });
          }
          return true;
        }
      }
    }

    // ===== فرمان‌های ادمین (لایهٔ ۵) =====
    if (text === '/قفل' || text === '/lock') {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) { await modSetLock(env, chat.id, true); await KV.put('recess', '0'); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔒 سالن قفل شد.' }); }
      return true;
    }
    if (text === '/باز' || text === '/unlock') {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) { await modSetLock(env, chat.id, false); await KV.put('recess', '1'); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔓 سالن باز شد.' }); }
      return true;
    }
    if (text === '/سکوت' && msg.reply_to_message && msg.reply_to_message.from) {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) {
        try { await mzBale(env, 'restrictChatMember', { chat_id: chat.id, user_id: Number(msg.reply_to_message.from.id), permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); } catch (e) {}
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔇 کاربر ۱ ساعت ساکت شد.' });
      }
      return true;
    }
    if (text === '/اخراج' && msg.reply_to_message && msg.reply_to_message.from) {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) {
        try { await mzBale(env, 'banChatMember', { chat_id: chat.id, user_id: Number(msg.reply_to_message.from.id) }); } catch (e) {}
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ کاربر حذف شد.' });
      }
      return true;
    }
    if (text.indexOf('/افزودن_کلمه ') === 0) {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) {
        const w = text.slice(text.indexOf(' ') + 1);
        const arr = (await KV.get('mod_words', 'json')) || [];
        if (w && arr.indexOf(w) === -1) arr.push(w);
        await KV.put('mod_words', JSON.stringify(arr));
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ به فهرست سیاه اضافه شد (' + arr.length + ' مورد).' });
      }
      return true;
    }
    if (text === '/کلمات') {
      if (String((msg.from && msg.from.id) || chat.id) === (await KV.get('admin_id'))) {
        const arr = (await KV.get('mod_words', 'json')) || [];
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '📛 فهرست سیاه سفارشی:\n' + (arr.length ? arr.join('، ') : 'خالی') });
      }
      return true;
    }

    if (text === '/admin') {
      const cur = await KV.get('admin_id');
      const uid3 = String((msg.from && msg.from.id) || chat.id);
      if (!cur) {
        await KV.put('admin_id', uid3);
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ شناسه‌ات به‌عنوان ادمینِ بات ذخیره شد.' });
      } else if (cur === uid3) {
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ تو همین حالا ادمین بات هستی.' });
      } else {
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ ادمین بات قبلاً ثبت شده؛ فقط ادمین فعلی می‌تونه با /انتقال_ادمین عوضش کنه.' });
      }
      return true;
    }
    if (text.indexOf('/انتقال_ادمین ') === 0) {
      const cur2 = await KV.get('admin_id');
      const uid4 = String((msg.from && msg.from.id) || chat.id);
      if (cur2 === uid4) {
        await KV.put('admin_id', text.split(' ')[1]);
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ ادمین بات منتقل شد.' });
      } else {
        await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ فقط ادمین فعلی بات می‌تونه ادمین رو منتقل کنه.' });
      }
      return true;
    }
    if (text.indexOf('/پست ') === 0 || text.indexOf('/post ') === 0) {
      const uid2 = String((msg.from && msg.from.id) || chat.id);
      const adminId = await KV.get('admin_id');
      if (uid2 === adminId) {
        const body2 = text.slice(text.indexOf(' ') + 1);
        const r = await mzBale(env, 'sendMessage', { chat_id: '@bale_game_center', text: body2, reply_markup: cbButtons('apost:' + Date.now()) });
        await mzBale(env, 'sendMessage', { chat_id: uid2, text: (r && r.ok) ? '📢 پست با دکمه‌های زنده منتشر شد!' : '❌ انتشار ناموفق بود.' });
      } else { await mzBale(env, 'sendMessage', { chat_id: uid2, text: 'فقط ادمین می‌تونه پست بذاره.' }); }
      return true;
    }
    if (text === '/ایدی' || text === '/id') {
      let t = '🆔 شناسهٔ عددی تو: ' + String((msg.from && msg.from.id) || chat.id);
      if (isGroup) t += '\n🆔 شناسهٔ این گروه: ' + String(chat.id);
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: t });
      return true;
    }
    if (text === '/لاگ' || text === '/log') {
      const log = (await KV.get('react_log', 'json')) || [];
      const elog = (await KV.get('edit_log', 'json')) || [];
      const mb = await KV.get('menubtn_log');
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: (mb ? ('🟢 پاسخ setChatMenuButton:\n' + mb + '\n\n') : '') + (elog.length ? ('🛠️ ویرایش دکمه‌ها:\n' + JSON.stringify(elog).slice(0, 1200) + '\n\n') : '') + (log.length ? ('🧪 رویدادها:\n' + JSON.stringify(log.slice(0, 3)).slice(0, 800)) : '🧪 رویدادی نیست.') });
      return true;
    }

    if (text === '/راهنما' || text === '/rahnama') { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: MZ_GUIDE }); return true; }
    if (text === '/قوانین' || text === '/rules') { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: MZ_RULES }); return true; }
    if (text.indexOf('/کد') === 0 || text.indexOf('/code') === 0) {
      const uid = String((msg.from && msg.from.id) || chat.id);
      const today = new Date().toISOString().slice(0, 10);
      const dc = (await KV.get('daily_code', 'json')) || null;
      const arg = text.split(' ')[1] || '';
      if (dc && dc.date === today && arg.trim().toUpperCase() === dc.code) {
        const u = await mzGetUser(KV, uid);
        if (u.claimed && u.claimed.dailyCode === today) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'این کد رو امروز گرفتی!' }); }
        else {
          if (!u.claimed) u.claimed = {};
          u.claimed.dailyCode = today;
          u.coins += 25;
          await KV.put('u:' + uid, JSON.stringify(u));
          await mzBale(env, 'sendMessage', { chat_id: uid, text: '🎁 مأموریت روز انجام شد! +۲۵ سکه\n🪙 موجودی: ' + u.coins });
        }
      } else { await mzBale(env, 'sendMessage', { chat_id: uid, text: '❌ کد اشتباه یا مال امروز نیست.' }); }
      return true;
    }
    if (isGroup && (text === '/start')) { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🎮 مرکز بازی در خدمت این گروه!\n\n🏟️ میزگرد هر شب ۲۱:۳۰ خودکار\n📖 /rahnama — 📜 /rules' }); return true; }

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
      const st = { chat: chat.id, host: uid, phase: 'join', createdAt: Date.now(), players: [], bets: [], letter: null, golden: 0, endsAt: 0, result: null, court: [], courtUntil: 0 };
      await KV.put(key, JSON.stringify(st));
      let active = (await KV.get('mz_active', 'json')) || [];
      if (active.indexOf(String(chat.id)) === -1) active.push(String(chat.id));
      await KV.put('mz_active', JSON.stringify(active));
      await KV.put('group_main', String(chat.id));
      const sent = await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '📣🏟️ میزگرد واژه‌ها — ' + mzWhen() + '\n👑 میزبان: ' + (msg.from.first_name || '؟') + '\n۹۰ ثانیه، ۶ ستون، ستون طلایی ×۲.\nجواب‌ها خصوصی؛ نتیجه عمومی! تماشاگرها پیش‌بینی کنند 🔮', reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '⚔️ شروع نبرد (میزبان)', callback_data: 'mz_start' }], [{ text: '📨 دعوت دوستان به گروه', callback_data: 'mz_invite' }, { text: '📖 راهنما', callback_data: 'mz_guide' }] ] } });
      try { if (sent && sent.result && sent.result.message_id) await mzBale(env, 'pinChatMessage', { chat_id: chat.id, message_id: sent.result.message_id, disable_notification: true }); } catch (e) {}
      return true;
    }

    if (isGroup && (text === '/لغو' || text === '/لغو میز' || text === '/laghv')) {
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
            if (st.players.every(function(x) { return x.submitted; })) { await mzJudge(env, KV, st); await mzPostResult(env, KV, st); }
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
        if (st.phase !== 'join' && st.phase !== 'countdown') { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'میز از دست رفت! دور بعد زودتر بیا.' }); return true; }
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

      if (data === 'mz_guide') { await mzBale(env, 'sendMessage', { chat_id: chatId, text: MZ_GUIDE }); return true; }

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
        await mzBale(env, 'sendMessage', { chat_id: chatId, text: '📢 نبرد تا ' + MZ_COUNTDOWN + ' ثانیه دیگه شروع میشه! ⏳ آماده باشید...' });
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async function() {
            await new Promise(function(r) { setTimeout(r, MZ_COUNTDOWN * 1000 + 500); });
            const st2 = await KV.get(key, 'json');
            if (st2 && st2.phase === 'countdown') await mzStartPlay(env, KV, st2, key);
          })());
        }
        return true;
      }

      if (data.indexOf('mz_bet_') === 0 && data.indexOf('mz_vote_') !== 0) {
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

      if (data.indexOf('mz_vote_') === 0) {
        const parts = data.slice(8).split('_');
        const idx = Number(parts[0]);
        const side = parts[1];
        const c = st.court && st.court[idx];
        if (!c || c.done || st.phase !== 'result') return true;
        if (uid === c.owner) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'روی کلمهٔ خودت نمی‌تونی رأی بدی!' }); return true; }
        if (c.yes.indexOf(uid) !== -1 || c.no.indexOf(uid) !== -1) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'قبلاً رأی دادی!' }); return true; }
        if (side === 'y') c.yes.push(uid); else c.no.push(uid);
        if (/^\d+$/.test(uid)) { const u = await mzGetUser(KV, uid); u.coins += 2; await KV.put('u:' + uid, JSON.stringify(u)); }
        let msg2 = '🗳️ رأی تو ثبت شد (+۲ سکه)';
        if (c.yes.length >= 2 && c.yes.length > c.no.length) {
          c.done = true;
          const learned = (await KV.get('learned:' + c.col, 'json')) || [];
          if (learned.indexOf(c.w) === -1) { learned.push(c.w); await KV.put('learned:' + c.col, JSON.stringify(learned)); }
          const reward = c.g ? 20 : 10;
          if (/^\d+$/.test(c.owner)) {
            const ou = await mzGetUser(KV, c.owner);
            ou.coins += reward;
            await KV.put('u:' + c.owner, JSON.stringify(ou));
            try { await mzBale(env, 'sendMessage', { chat_id: c.owner, text: '🏛️ دادگاه میز کلمهٔ «' + c.w + '» رو پذیرفت! +' + reward + ' سکه بهت برگشت.' }); } catch (e) {}
          }
          await mzBale(env, 'sendMessage', { chat_id: chatId, text: '✅ «' + c.w + '» با رأی میز پذیرفته شد و به فرهنگ‌نامه رفت!' });
          msg2 = '🗳️ رأی تو ثبت شد — کلمه پذیرفته شد! 🎉';
        }
        await KV.put(key, JSON.stringify(st));
        await mzBale(env, 'sendMessage', { chat_id: uid, text: msg2 });
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
    async function cbPostState(pid, upd) {
      const st = (await KV.get('postst:' + pid, 'json')) || { likes: 0, sug: 0 };
      if (upd === 'like') st.likes += 1;
      if (upd === 'sug') st.sug = 1;
      await KV.put('postst:' + pid, JSON.stringify(st));
      return st;
    }
    function cbMarkedButtons(st, pid) {
      return { inline_keyboard: [ [
        { text: (st.likes > 0 ? '❤️ ' + fa(st.likes) + ' لایک' : '❤️ پسندیدم (+۳)'), callback_data: 'cb_like:' + pid },
        { text: (st.sug ? '⬆️ پیشنهاد شد' : '💡 پیشنهاد به مجله (+۵)'), callback_data: 'cb_sug' }
      ] ] };
    }
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
      await bale('sendMessage', { chat_id: chatId, text: '📋 کارهای سکه‌دار:\n\n👥 عضویت کانال: +۱۰۰\n👥 عضویت گروه: +۱۰۰\n🎮 هر بازی: تا +۵۰\n🎯 رکورد جدید: +۵۰ اضافه\n ورود روزانه: +۰ (خودکار)', reply_markup: { inline_keyboard: [ [{ text: '📢 کانال', url: 'https://ble.ir/' + CHANNEL.replace('@', '') }, { text: '👥 گروه', url: 'https://ble.ir/' + GROUP.replace('@', '') }], [{ text: '✅ عضو کانال شدم', callback_data: 'task_channel' }], [{ text: '✅ عضو گروه شدم', callback_data: 'task_group' }] ] } });
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

    if (url.pathname === '/app') {
      const html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://tapi.bale.ai/miniapp.js?3"></script><style>body{font-family:sans-serif;background:#0f2027;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}button{font-size:22px;padding:14px 40px;border:0;border-radius:14px;background:#22c55e;color:#fff}</style></head><body><button id="b">🚀 شروع کن</button><script>var W=(window.Bale&&Bale.WebApp)||(window.Telegram&&Telegram.WebApp)||null;function go(){try{if(W&&W.sendData){W.sendData("menu_start");return}}catch(e){}location.href="https://ble.ir/game_balebot?start=menu"}document.getElementById("b").onclick=go;try{if(W&&W.sendData){W.sendData("menu_start")}}catch(e){}</script></body></html>';
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
      if (toFetch.length) {
        const got = await mzOnlineCheck(toFetch);
        for (const w in got.out) online[w] = got.out[w];
        if (got.cacheable) for (const w in got.out) KV.put('wb2:' + w, JSON.stringify(got.out[w]));
      }
      async function wordScore(col, w, uid) {
        if (w.length < 2 || w.charAt(0) !== st.letter) return 0;
        if ((bank[col] || []).indexOf(w) !== -1) return 10;
        if (await mzLearnedHas(KV, col, w)) return 10;
        if (mzRootHit(col, w)) return 10;
        if (ESM_ONLINE_COLS.indexOf(col) !== -1) {
          const o = online[w];
          if (o && o.wp) return 10;
          if (o && o.exists) {
            const keys = ESM_CAT_KEYS[col];
            const catOk = (o.cats || []).some(function(c) { return keys.some(function(k) { return c.indexOf(k) !== -1; }); });
            if (catOk) return 10;
          }
          if (w.length >= 3 && await mzConsensus(KV, env, col, w, uid)) return 10;
          if (o && o.exists) return 5;
          return 0;
        }
        return 10;
      }
      for (let i = 0; i < ESM_COLS.length; i++) {
        const col = ESM_COLS[i];
        const a = normFa(p0.answers[col] || '');
        const b = normFa(p1.answers[col] || '';
        let pa = await wordScore(col, a, p0.user || p0.id);
        let pb = await wordScore(col, b, p1.user || p1.id);
        if (pa && pb && a === b) { pa = Math.ceil(pa / 2); pb = Math.ceil(pb / 2); }
        const mult = (st.golden === i) ? 2 : 1;
        pa *= mult; pb *= mult;
        s0 += pa; s1 += pb;
        detail.push({ col: col, a: p0.answers[col] || '-', b: p1.answers[col] || '-', pa: pa, pb: pb, golden: st.golden === i });
      }
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
        const chPost = update.channel_post || (update.message && update.message.chat && update.message.chat.type === 'channel' ? update.message : null);
        if (chPost) {
          try {
            const chText = (chPost.text || '').trim();
            if (chText === '/ایدی' || chText === '/id') {
              await bale('sendMessage', { chat_id: chPost.chat.id, text: '🆔 شناسهٔ عددی این کانال: ' + String(chPost.chat.id) });
              return new Response('ok');
            }
            if (chPost.message_id && !(chPost.reply_markup && chPost.reply_markup.inline_keyboard)) {
              const adminId = await KV.get('admin_id');
              if (adminId) await mzBale(env, 'sendMessage', { chat_id: adminId, text: '📌 پستِ دستی کانال دکمهٔ زنده نمی‌گیره (محدودیت بله).\nبرای لایک/پیشنهاد، متن پست رو خصوصی همین‌جا بفرست با:\n/پست متن پست' });
            }
          } catch (e) {}
          return new Response('ok');
        }
        try {
          const keys = Object.keys(update || {});
          const isReact = keys.some(function(k) { return k.indexOf('reaction') !== -1; });
          if (isReact) {
            const log = (await KV.get('react_log', 'json')) || [];
            log.unshift({ t: Date.now(), keys: keys, data: JSON.stringify(update).slice(0, 700) });
            while (log.length > 30) log.pop();
            await KV.put('react_log', JSON.stringify(log));
            const adminId = await KV.get('admin_id');
            if (adminId) await mzBale(env, 'sendMessage', { chat_id: adminId, text: '🧪 رویداد لایک رسید!\nکلیدها: ' + keys.join(', ') + '\n' + JSON.stringify(update).slice(0, 350) });
            return new Response('ok');
          }
          if (!update.message && !update.callback_query) {
            const log2 = (await KV.get('react_log', 'json')) || [];
            log2.unshift({ t: Date.now(), keys: keys });
            while (log2.length > 30) log2.pop();
            await KV.put('react_log', JSON.stringify(log2));
          }
        } catch (e) {}
        if (await mzHandle(update, env, ctx)) return new Response('ok');
        if (update.message) {
          let text = update.message.text || '';
          if (!text && update.message.web_app_data && update.message.web_app_data.data === 'menu_start') text = '/start';
          const chat = update.message.chat;
          const uid = String(chat.id);
          const u = await getUser(uid);
          const today = new Date().toISOString().slice(0, 10);
          if (chat.type === 'private') {
            if (msg.forward_from_chat && (await KV.get('group_main')) && String(msg.forward_from_chat.id) === String(await KV.get('group_main'))) {
              const mid = msg.forward_from_message_id;
              const target = msg.forward_from && msg.forward_from.id;
              if (mid) {
                const rkey = 'rep:' + mid;
                const arr = (await KV.get(rkey, 'json')) || [];
                if (arr.indexOf(uid) === -1) arr.push(uid);
                await KV.put(rkey, JSON.stringify(arr), { expirationTtl: 86400 });
                await modCount(KV, 'rep');
                if (arr.length >= 3) {
                  try { await mzBale(env, 'deleteMessage', { chat_id: msg.forward_from_chat.id, message_id: mid }); } catch (e) {}
                  await modCount(KV, 'del');
                  if (target) {
                    try { await mzBale(env, 'restrictChatMember', { chat_id: msg.forward_from_chat.id, user_id: Number(target), permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); } catch (e) {}
                    await modCount(KV, 'mute');
                  }
                  await bale('sendMessage', { chat_id: uid, text: '🚨 پیام با ۳ گزارش حذف و فرستنده ساکت شد. ممنون از همراهی!' });
                } else {
                  await bale('sendMessage', { chat_id: uid, text: '📬 گزارشت ثبت شد (' + fa(arr.length) + ' از ۳).' });
                }
              } else { await bale('sendMessage', { chat_id: uid, text: '📬 گزارش دریافت شد.' }); }
              return new Response('ok');
            }
            if (text === '/start') {
              if (!(await KV.get('cmds_v1'))) {
                await bale('setMyCommands', { commands: [
                  { command: 'start', description: '🎮 منوی مرکز بازی' },
                  { command: 'nabard', description: '🏟️ ساخت میزگرد واژه‌ها' },
                  { command: 'laghv', description: '🗑️ بستن میز فعال' },
                  { command: 'rahnama', description: '📖 راهنمای میزگرد' },
                  { command: 'rules', description: '📜 قوانین گروه' }
                ] });
                await KV.put('cmds_v1', '1');
              }
              if ((await KV.get('menubtn_at')) !== today) {
                let mbLog = '';
                try { const rmb = await bale('setChatMenuButton', { menu_button: { type: 'web_app', text: 'شروع کن', web_app: { url: url.origin + '/app' } } }); mbLog = JSON.stringify(rmb).slice(0, 300); } catch (e) { mbLog = 'exc:' + (e && e.message); }
                await KV.put('menubtn_log', mbLog);
                await KV.put('menubtn_at', today);
              }
              const isMem = await mzCheckMember(env, uid);
              if (!isMem) {
                await bale('sendMessage', { chat_id: chat.id, text: 'سلام ' + ((update.message.from && update.message.from.first_name) || 'دوست') + ' عزیز 🌹\n\n⚠️ برای استفاده از امکانات ربات، ابتدا باید در کانال زیر عضو شوید:\n\nپس از عضویت، روی دکمه «✅ عضو شدم» کلیک کنید.', reply_markup: { inline_keyboard: [ [{ text: '📢 عضویت در کانال گیم‌سنتر', url: 'https://ble.ir/bale_game_center' }], [{ text: '✅ عضو شدم', callback_data: 'join_check' }] ] } });
                return new Response('ok');
              }
              let extra = '';
              if (u.daily.login !== today) { u.daily.login = today; u.coins += 30; await saveUser(uid, u); extra = '\n\n🎁 جایزه ورود امروز: +۳۰ سکه'; }
              const fname = (update.message.from && update.message.from.first_name) || 'دوست';
              await bale('sendMessage', { chat_id: chat.id, text: '🎮 به مرکز بازی بله خوش اومدی، ' + fname + ' عزیز 🌹\n\nاینجا می‌تونی تک‌نفره یا با دوستانت بازی کنی، سکه جمع کنی و قهرمان هفته بشی!\n\n🌼 داوری همهٔ بازی‌ها خودکار و عادله.\n\n🪙 سکه تو: ' + fa(u.coins) + extra + '\n\n🔻 برای شروع از دکمه‌های زیر استفاده کن 🔻', reply_markup: { inline_keyboard: [
                [{ text: '🎮 نبرد واژه‌ها [دونفره]', url: ESM_URL + '?user=' + uid }],
                [{ text: '🌼 حساب کاربری', callback_data: 'profile' }, { text: '🐤 پرنده‌پرش', url: GAME_URL + '?user=' + uid }],
                [{ text: '👤 سایه‌پرش', url: SHADOW_URL + '?user=' + uid }, { text: '🥚 آخرین تخم', url: EGG_URL + '?user=' + uid }],
                [{ text: '🏆 برترین‌ها | رتبه من', callback_data: 'rank' }, { text: '🚦 راهنما', callback_data: 'guide_menu' }],
                [{ text: '🏟️ میزگرد گروهی [چندنفره]', url: 'https://ble.ir/game_center_bale' }],
                [{ text: '📋 کارها', callback_data: 'tasks' }, { text: '🛒 فروشگاه', callback_data: 'shop' }],
                [{ text: '📢 مجله کانال', url: 'https://ble.ir/bale_game_center' }, { text: '🆔 آیدی من', callback_data: 'myid' }]
              ] } });
            }
            else if (text === '/coins') { await bale('sendMessage', { chat_id: chat.id, text: '🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ بهترین رکورد: ' + fa(u.best) }); }
            else if (text === '/tasks') { await sendTasks(chat.id); }
            else if (text === '/shop') { await sendShop(chat.id, u); }
            else if (text === '/rank') { await bale('sendMessage', { chat_id: chat.id, text: await rankText() }); }
          }
        }
        if (update.callback_query) {
          const cb = update.callback_query;
          const uid = String(cb.from.id);
          const chatId = cb.message.chat.id;
          const data = cb.data || '';
          const u = await getUser(uid);
          let msg = null;
          if (data === 'profile') {
            msg = '🌼 حساب کاربری تو\n\n🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ بهترین رکورد: ' + fa(u.best) + '\n🏅 برد نبرد واژه‌ها: ' + fa((u.esm && u.esm.wins) || 0) + ' از ' + fa((u.esm && u.esm.games) || 0);
          }
          else if (data === 'myid') { msg = '🆔 شناسهٔ عددی تو: ' + uid; }
          else if (data === 'guide_menu') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            await bale('sendMessage', { chat_id: chatId, text: '🚦 راهنمای مرکز بازی\n\n🎮 تک‌نفره: پرنده‌پرش، سایه‌پرش، آخرین تخم\n🎮 دونفره: نبرد واژه‌ها\n🏟️ چندنفره: میزگرد گروهی — هر شب ۲۱:۳۰ خودکار\n🪙 سکه: بازی + لایک پست کانال + پیشنهاد به مجله + کارها\n🏆 قهرمان هفته: بیشترین امتیاز میزگرد\n\n' + MZ_GUIDE });
            return new Response('ok');
          }
          else if (data === 'join_check') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            const isMem2 = await mzCheckMember(env, uid);
            if (isMem2) await bale('sendMessage', { chat_id: uid, text: '🎉 عضویت تأیید شد! خوش اومدی.\nمنوی اصلی: /start' });
            else await bale('sendMessage', { chat_id: uid, text: '❌ هنوز عضو نشدی! اول عضو کانال شو، بعد دوباره «✅ عضو شدم» رو بزن.' });
            return new Response('ok');
          }
          if (data.indexOf('cb_like:') === 0) {
            const pidU = 'post:' + cb.message.chat.id + ':' + cb.message.message_id;
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            u.coins += 3;
            await saveUser(uid, u);
            const stp = await cbPostState(pidU, 'like');
            const elog = (await KV.get('edit_log', 'json')) || [];
            try {
              const rM = await bale('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: cbMarkedButtons(stp, pidU) });
              elog.unshift({ m: 'like', ok: !!(rM && rM.ok), err: (rM && rM.description) || '' });
            } catch (e) { elog.unshift({ m: 'like', err: String(e && e.message) }); }
            while (elog.length > 8) elog.pop();
            await KV.put('edit_log', JSON.stringify(elog));
            await bale('sendMessage', { chat_id: uid, text: '❤️ ممنون از همراهی! +۳ سکه\n👍 مجموع لایک این پست: ' + fa(stp.likes) + '\n🪙 موجودی: ' + fa(u.coins) });
            return new Response('ok');
          }
          if (data === 'cb_sug') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            const pidU = 'post:' + cb.message.chat.id + ':' + cb.message.message_id;
            const adminId = await KV.get('admin_id');
            let fwdOk = false;
            if (adminId) {
              try { const rf = await bale('forwardMessage', { chat_id: adminId, from_chat_id: cb.message.chat.id, message_id: cb.message.message_id }); fwdOk = !!(rf && rf.ok); } catch (e) {}
              if (fwdOk) await bale('sendMessage', { chat_id: adminId, text: '📬 پیشنهاد برای مجله از طرف ' + (cb.from.first_name || 'کاربر') });
            }
            const stp2 = await cbPostState(pidU, 'sug');
            const elog2 = (await KV.get('edit_log', 'json')) || [];
            try {
              const rM2 = await bale('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: cbMarkedButtons(stp2, pidU) });
              elog2.unshift({ m: 'sug', ok: !!(rM2 && rM2.ok), err: (rM2 && rM2.description) || '' });
            } catch (e) { elog2.unshift({ m: 'sug', err: String(e && e.message) }); }
            while (elog2.length > 8) elog2.pop();
            await KV.put('edit_log', JSON.stringify(elog2));
            u.coins += 5;
            await saveUser(uid, u);
            await bale('sendMessage', { chat_id: uid, text: '📬 پیشنهادت ' + (fwdOk ? 'به مجله رسید ✅' : 'ثبت شد') + '! +۵ سکه\n🪙 موجودی: ' + fa(u.coins) });
            return new Response('ok');
          }
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
            else { u.claimed[key] = 1; u.coins += 100; await saveUser(uid, u); msg = '✅ عضویت تأیید شد! +۱۰۰ سکه\n🪙 موجودی: ' + fa(u.coins); }
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

    return new Response('🎮 Bale Game Server v28 is running!');
  },

  async scheduled(event, env) {
    const KV = env.GAME_KV;
    try {
      const d = new Date(Date.now() + 3.5 * 3600 * 1000);
      const hm = d.getUTCHours() * 60 + d.getUTCMinutes();
      const date = d.toISOString().slice(0, 10);
      const SLOTS = [
        [390, 'inject'],
        [395, 'ensure_lock'],
        [510, 'danestani'],
        [540, 'morning'],
        [660, 'tarfand'],
        [840, 'nabz'],
        [1020, 'bazi'],
        [1170, 'moma'],
        [1260, 'evening'],
        [1290, 'nabard_auto'],
        [1355, 'recess_open'],
        [1380, 'recess_close'],
        [1385, 'digest']
      ];
      for (const s of SLOTS) {
        if (hm >= s[0] && hm < s[0] + 10) {
          const key = 'slot:' + date + ':' + s[1];
          if (!(await KV.get(key))) {
            await KV.put(key, '1', { expirationTtl: 86400 });
            try {
              if (s[1] === 'inject') await engineInject(env);
              else if (s[1] === 'ensure_lock') { const g = await KV.get('group_main'); if (g) { await modSetLock(env, g, true); await KV.put('recess', '0'); } }
              else if (s[1] === 'morning') await engineMorning(env);
              else if (s[1] === 'evening') await engineEvening(env);
              else if (s[1] === 'nabard_auto') await engineAutoNabard(env);
              else if (s[1] === 'recess_open') await engineRecess(env, true);
              else if (s[1] === 'recess_close') await engineRecess(env, false);
              else if (s[1] === 'digest') await engineDigest(env);
              else if (s[1] === 'moma') await cbPost(env, 'moma', { riddle: true });
              else if (s[1] === 'answer') await cbAnswer(env);
              else if (s[1] === 'bazi') await cbPost(env, (new Date().getDate() % 2 === 0) ? 'bazi' : 'ai');
              else await cbPost(env, s[1]);
            } catch (e) {}
          }
        }
      }
    } catch (e) { console.log('engine error', e && e.message); }
    const active = (await KV.get('mz_active', 'json')) || [];
    const remaining = [];
    for (const chatId of active) {
      const st = await KV.get('mz:' + chatId, 'json');
      if (!st) continue;
      if (st.phase === 'countdown' && Date.now() > st.startsAt) { await mzStartPlay(env, KV, st, 'mz:' + chatId); remaining.push(chatId); }
      else if (st.phase === 'play' && Date.now() > st.endsAt) {
        st.players.forEach(function(p) { if (!p.submitted) { p.submitted = true; p.timeBonus = 0; } });
        await mzJudge(env, KV, st);
        await mzPostResult(env, KV, st);
      }
      else if (st.phase === 'join' && Date.now() - st.createdAt > 300000) { await mzBale(env, 'sendMessage', { chat_id: chatId, text: '😴 میز جمع شد (کسی شروع نکرد).' }); }
      else if (st.phase === 'result') {
        if (st.court && st.court.length && Date.now() > (st.courtUntil || 0)) {
          st.court = []; st.courtUntil = 0;
          await KV.put('mz:' + chatId, JSON.stringify(st));
        } else { remaining.push(chatId); }
      }
      else remaining.push(chatId);
    }
    await KV.put('mz_active', JSON.stringify(remaining));
  }
};