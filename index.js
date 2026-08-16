// ========== مرکز بازی بله (v36: CORS هوشمند + API پایدار) ==========
// Worker: https://aged-river-6500bale-game-server.metabolicbit.workers.dev/
// تغییرات v36: CORS هوشمند، /api/ping، /api/me کامل، لاگ خطای دقیق

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
const MZ_TAUNTS = ['به‌به! چه میز داغی بود! 😎','این دور ترکوندی! 🔥','دور بعد جبران می‌کنی؟ 😏','سفرهٔ واژه هنوز پهنه! 🍽️'];
const MZ_COUNTDOWN = 20;
const MZ_GUIDE = '📖 راهنمای میزگرد واژه‌ها\n\n۱) 🏟️ ساخت میز: در گروه بنویس /نبرد\n۲) 🪑 عضوها با دکمهٔ «نشستن پای میز» join می‌شن (۲ تا ۸ نفر)\n۳) ⚔️ میزبان با «شروع نبرد» مسابقه رو آغاز می‌کنه\n۴) ✍️ جواب هر ستون رو خصوصی به بات بفرست\n۵) 🏁 نتیجه عمومی اعلام می‌شه + عنوان واژه‌سالار\n۶)  تماشاگرها می‌تونن قهرمان رو پیش‌بینی کنن\n۷) 🏛️ کلمات ردشده به «دادگاه میز» میرن\n۸) 🗑️ بستن میز: /لغو (فقط میزبان)';
const MZ_RULES = '📜 قوانین گروه مرکز بازی\n\n۱) 🏟️ سالن مسابقه قفله؛ گفتگوی آزاد فقط در «زنگ تفریح»\n۲) ⚠️ ارسال لینک، فوروارد و تبلیغ = حذف پیام + اخطار\n۳)  کلام نامناسب = حذف پیام + اخطار\n۴) 🔇 پس از ۳ اخطار = یک ساعت سکوت\n۵) ⛔️ پس از ۵ اخطار = حذف از گروه\n۶)  میزگرد هر شب ۲۱:۳۰ خودکار\n۷) ✍️ جواب‌ها فقط خصوصی به بات\n۸) 📬 گزارش تخلف: پیام متخلف رو به بات فوروارد کن\n۹) ❤️ احترام متقابل = خط قرمز ما';
const MOD_BW = ['کیر','کون','جنده','حرومی','بیناموس','بی‌ناموس','ناموست','گوه','لاشی','خرکس'];
const TEST_MODE = false;
const TESTERS = [];
const REPLY_MENU = ['🎮 شروع','🌼 حساب کاربری','🛒 فروشگاه','📋 کارها','🏆 برترین‌ها | رتبه من','🚦 راهنما','📜 قوانین','❌ بستن منو'];

// ---------- فاز ۲: Cron مقاوم + ریتم مجلهٔ سیمرغ ----------
const CRON_TASKS = {
  inject:       { h: 6,  m: 30, fn: 'inject' },
  ensure_lock:  { h: 6,  m: 35, fn: 'ensureLock' },
  morning:      { h: 8,  m: 30, fn: 'morning' },
  sobh:         { h: 8,  m: 35, fn: 'section', s: 'sobh' },
  danestani:    { h: 10, m: 0,  fn: 'section', s: 'danestani', not: [0] },
  sher:         { h: 10, m: 0,  fn: 'section', s: 'sher', dow: [0] },
  tonz:         { h: 11, m: 30, fn: 'section', s: 'tonz' },
  bozorgan:     { h: 12, m: 0,  fn: 'section', s: 'bozorgan' },
  cinema:       { h: 13, m: 0,  fn: 'section', s: 'cinema' },
  nabz:         { h: 14, m: 30, fn: 'section', s: 'nabz' },
  dastanak:     { h: 16, m: 0,  fn: 'section', s: 'dastanak', not: [3] },
  ekhteraat:    { h: 16, m: 0,  fn: 'section', s: 'ekhteraat', dow: [3] },
  bazi:         { h: 17, m: 30, fn: 'section', s: 'bazi', not: [5] },
  vitrin:       { h: 17, m: 30, fn: 'section', s: 'vitrin', dow: [5] },
  shahnameh:    { h: 18, m: 0,  fn: 'section', s: 'shahnameh', dow: [6] },
  rotate19:     { h: 19, m: 0,  fn: 'rotate19' },
  moma:         { h: 19, m: 30, fn: 'section', s: 'moma', riddle: true },
  asatir:       { h: 20, m: 0,  fn: 'section', s: 'asatir', dow: [4] },
  evening:      { h: 21, m: 0,  fn: 'evening' },
  nabard_auto:  { h: 21, m: 30, fn: 'nabard' },
  answer:       { h: 22, m: 30, fn: 'answer' },
  recess_open:  { h: 22, m: 45, fn: 'recess', open: true },
  recess_close: { h: 23, m: 10, fn: 'recess', open: false },
  digest:       { h: 23, m: 45, fn: 'digest' }
};

function cbButtons(pid) {
  return { inline_keyboard: [ [{ text: '❤️ پسندیدم (+۳)', callback_data: 'cb_like:' + pid }, { text: '💡 پیشنهاد به مجله (+۵)', callback_data: 'cb_sug' }] ] };
}
function mkReplyMenu() {
  return { keyboard: [
    [{ text: '🎮 شروع' }],
    [{ text: '🌼 حساب کاربری' }, { text: '🛒 فروشگاه' }],
    [{ text: '📋 کارها' }, { text: '🏆 برترین‌ها | رتبه من' }],
    [{ text: '🚦 راهنما' }, { text: '📜 قوانین' }],
    [{ text: '❌ بستن منو' }]
  ], resize_keyboard: true };
}
async function menuStat(KV, label) { const s = (await KV.get('menu_stat', 'json')) || {}; s[label] = (s[label] || 0) + 1; await KV.put('menu_stat', JSON.stringify(s)); }
async function isTester(KV, uid) {
  if (TEST_MODE) return true;
  if (TESTERS.indexOf(uid) !== -1) return true;
  if (uid === (await KV.get('admin_id'))) return true;
  const arr = (await KV.get('testers', 'json')) || [];
  return arr.indexOf(uid) !== -1;
}
function faP(n) { const p = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹']; return String(n).replace(/\d/g, d => p[d]); }
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
  try { const c = await KV.get('esm_bank', 'json'); if (c && c.list) return c.list; } catch (e) {}
  try { const r = await fetch('https://metabolicbit-jpg.github.io/bale-game/words.json'); return await r.json(); } catch (e) { return {}; }
}
async function mzLearnedHas(KV, col, w) { const l = (await KV.get('learned:' + col, 'json')) || []; return l.indexOf(w) !== -1; }
async function mzCheckMember(env, uid) {
  try { const r = await mzBale(env, 'getChatMember', { chat_id: '@bale_game_center', user_id: Number(uid) }); return !!(r && r.ok && ['member','administrator','creator'].includes(r.result.status)); } catch (e) { return false; }
}
async function modSetLock(env, gid, lock) {
  try { await mzBale(env, 'setChatPermissions', { chat_id: gid, permissions: { can_send_messages: !lock, can_send_media_messages: !lock, can_send_other_messages: !lock, can_add_web_page_previews: !lock } }); } catch (e) {}
}
async function modCount(KV, k) { const s = (await KV.get('modstat', 'json')) || { del: 0, mute: 0, rep: 0, join: 0 }; s[k] = (s[k] || 0) + 1; await KV.put('modstat', JSON.stringify(s)); }

// ---------- مجلهٔ سیمرغ ----------
const CB_URL = 'https://metabolicbit-jpg.github.io/bale-game/content.json';
const CB_EMERG = [
  '🧠 آیا می‌دانستید؟ مغز شما حتی وقتی می‌خندید هم در حال یادگیریه! 😄',
  '❓ معما: چه چیزی مال توئه ولی بقیه بیشتر استفاده‌ش می‌کنن؟ (جواب: اسمت!)',
  '💡 ترفند: قانون ۲ دقیقه — اگه کاری کمتر از ۲ دقیقه‌ست، همین حالا انجامش بده!',
  '🎮 یادت باشه: هر شب ساعت ۲۱ میزگرد واژه‌ها در گروه! /نبرد',
  '🤖 پرامپت روز: «یه نکته بگو که ۹۰٪ آدم‌ها نمی‌دونن»'
];
async function cbLoadBank(KV) {
  let bank = null;
  try { bank = await KV.get('cb_bank', 'json'); } catch (e) {}
  const at = parseInt(await KV.get('cb_bank_at') || '0');
  if (Date.now() - at < 24 * 3600 * 1000 && bank && bank.sections) return bank;
  try { const r = await fetch(CB_URL); const nb = await r.json(); if (nb && nb.sections) { await KV.put('cb_bank', JSON.stringify(nb)); await KV.put('cb_bank_at', String(Date.now())); return nb; } } catch (e) {}
  return bank;
}
async function cbPost(env, sectionKey, opts) {
  const KV = env.GAME_KV; const CHANNEL = '@bale_game_center';
  let text = null;
  if (sectionKey === 'nabz') {
    const queue = (await KV.get('cb_news', 'json')) || [];
    if (queue.length) { const it = queue.shift(); await KV.put('cb_news', JSON.stringify(queue)); text = '🌍 نبض روز\n\n' + it.t + '\n\n🔗 ' + (it.l || '') + '\n\n#نبض_روز'; }
  }
  const bank = await cbLoadBank(KV);
  if (!text && bank && bank.sections && bank.sections[sectionKey]) {
    const sec = bank.sections[sectionKey]; const items = sec.items || [];
    if (items.length) {
      let ptr = parseInt(await KV.get('cb_ptr:' + sectionKey) || '0');
      if (isNaN(ptr) || ptr >= items.length) ptr = 0;
      const it = items[ptr];
      await KV.put('cb_ptr:' + sectionKey, String(ptr + 1));
      let head = (sec.emoji || '') + ' ' + (sec.name || '');
      if (it.s) head += ' | ' + it.s;
      text = head + '\n\n' + it.t;
      if (it.q) text += '\n\n💭 ' + it.q;
      let tags = sec.hash || '';
      if (it.h) tags += ' ' + it.h;
      if (tags) text += '\n\n' + tags;
      if (opts && opts.riddle) { text += '\n\n🕰️ جواب ساعت ۲۲:۳۰ همین‌جا!'; await KV.put('cb_riddle', JSON.stringify({ date: new Date().toISOString().slice(0, 10), a: it.a || '' })); }
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
    try { await mzBale(env, 'sendMessage', { chat_id: '@bale_game_center', text: '✅ جواب معمای امروز: ' + r.a + '\n\nدمتون گرم که حدس زدید! 🙌\nفردا یه معمای دیگه داریم.\n\nشب بخیر رفیق! 🌙', reply_markup: cbButtons('answer:' + today) }); } catch (e) {}
  }
}
function cbClean(s) { return (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(); }
function cbRssParse(xml, max) {
  const out = []; const re = /<item\b[\s\S]*?<\/item>/gi; let m;
  while ((m = re.exec(xml)) && out.length < max) {
    const b = m[0];
    const t = /<title[\s\S]*?>([\s\S]*?)<\/title>/i.exec(b);
    const l = /<link[\s\S]*?>([\s\S]*?)<\/link>/i.exec(b);
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
      const items = cbRssParse(await r.text(), 6);
      for (const it of items) { if (added >= 3) break; if (!it.t || it.t.length < 15 || seen.indexOf(it.t) !== -1) continue; seen.push(it.t); queue.push({ t: it.t, l: it.l }); added++; }
    } catch (e) {}
  }
  while (seen.length > 300) seen.shift();
  while (queue.length > 10) queue.shift();
  await KV.put('cb_seen', JSON.stringify(seen));
  await KV.put('cb_news', JSON.stringify(queue));
}
async function engineEnsureLock(env) { const KV = env.GAME_KV; const g = await KV.get('group_main'); if (g) { await modSetLock(env, g, true); await KV.put('recess', '0'); } }
async function engineMorning(env) {
  const KV = env.GAME_KV; const CHANNEL = '@bale_game_center';
  const bank = await mzLoadBank(KV);
  if (bank) {
    const col = MZ_COLS[Math.floor(Math.random() * MZ_COLS.length)];
    const list = bank[col] || [];
    if (list.length) {
      const w = list[Math.floor(Math.random() * list.length)];
      await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '📖 واژه روز — ستون «' + col + '»\n\n«' + w + '»\n\n🎮 امشب توی میزگرد با همین کلمه امتیاز بگیر!', reply_markup: cbButtons('word:' + new Date().toISOString().slice(0, 10)) });
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await KV.put('daily_code', JSON.stringify({ date: today, code: code }));
  await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '🎁 مأموریت روز: امروز یه میزگرد بزن و حداقل ۳ ستون رو پر کن!\n\n🔑 کد جایزه: ' + code + '\n\nکد رو خصوصی به بات بفرست:\n/کد ' + code + '\n→ +' + faP(25) + ' سکه', reply_markup: cbButtons('mission:' + today) });
}
async function engineEvening(env) {
  const KV = env.GAME_KV; const CHANNEL = '@bale_game_center';
  const today = new Date().toISOString().slice(0, 10);
  try { await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: '🎲 میزگرد امشب!\n\nساعت ۲۱:۳۰ پای میز حاضر باش؛ توی گروه «مرکز بازی» بنویس /نبرد\n\n👥 ble.ir/game_center_bale\n📖 راهنما: /rahnama', reply_markup: cbButtons('invite:' + today) }); } catch (e) {}
  const lb = (await KV.get('lb', 'json')) || [];
  if (lb.length) {
    let t = '🏆 تابلوی افتخار\n\n';
    const medals = ['🥇','','🥉','۴.','۵.'];
    lb.slice(0, 5).forEach((e, i) => { t += medals[i] + ' ' + e.name + ' — ' + e.best + '\n'; });
    t += '\n🎯 فردا تو نفر اول باش!';
    try { await mzBale(env, 'sendMessage', { chat_id: CHANNEL, text: t, reply_markup: cbButtons('board:' + today) }); } catch (e) {}
  }
}
async function engineAutoNabard(env) {
  const KV = env.GAME_KV;
  const gid = await KV.get('group_main'); if (!gid) return;
  const key = 'mz:' + gid;
  const existing = await KV.get(key, 'json');
  if (existing && existing.phase !== 'result') return;
  const adminId = (await KV.get('admin_id')) || '0';
  const st = { chat: Number(gid), host: adminId, phase: 'countdown', createdAt: Date.now(), startsAt: Date.now() + 60000, players: [], bets: [], letter: null, golden: 0, endsAt: 0, result: null, court: [], courtUntil: 0 };
  await KV.put(key, JSON.stringify(st));
  let active = (await KV.get('mz_active', 'json')) || [];
  if (active.indexOf(String(gid)) === -1) active.push(String(gid));
  await KV.put('mz_active', JSON.stringify(active));
  await mzBale(env, 'sendMessage', { chat_id: gid, text: '📣 میزگرد شبانهٔ واژه‌ها — ' + mzWhen() + '\n\n⏳ شروع مسابقه تا ' + faP(60) + ' ثانیهٔ دیگر\n🪑 همین حالا با دکمهٔ «نشستن پای میز» جات رو رزرو کن!\n\n📝 ' + faP(6) + ' ستون | ⏱ ' + faP(90) + ' ثانیه | ⭐ ستون طلایی با ضریب ۲\n✍️ جواب‌ها فقط خصوصی به بات', reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '📖 راهنما', callback_data: 'mz_guide' }] ] } });
}
async function engineRecess(env, open) {
  const KV = env.GAME_KV;
  const gid = await KV.get('group_main'); if (!gid) return;
  await KV.put('recess', open ? '1' : '0');
  await modSetLock(env, gid, !open);
  await mzBale(env, 'sendMessage', { chat_id: gid, text: open ? '🎈 زنگ تفریح باز شد!\n\nبه‌مدت ۲۰ دقیقه گفتگوی آزاد آزاده؛ فقط احترام و قوانین رو رعایت کنید. 🌷' : '🏟️ زنگ تفریح به پایان رسید.\n\nسالن دوباره به حالت مسابقه برگشت؛ منتظر میزگرد شبانه باشید!' });
}
async function engineDigest(env) {
  const KV = env.GAME_KV;
  const s = (await KV.get('modstat', 'json')) || { del: 0, mute: 0, rep: 0, join: 0 };
  const ms = (await KV.get('menu_stat', 'json')) || {};
  const adminG = await KV.get('admin_id');
  if (adminG) await mzBale(env, 'sendMessage', { chat_id: adminG, text: '📊 گزارش شبانهٔ گروه\n\n🗑️ پیام حذف‌شده: ' + faP(s.del) + '\n🔇 سکوت‌شده: ' + faP(s.mute) + '\n📬 گزارش ثبت‌شده: ' + faP(s.rep) + '\n👥 عضو جدید: ' + faP(s.join) + '\n\nکلیک‌های منو:\n' + Object.keys(ms).map(k => k + ': ' + faP(ms[k])).join('\n') + '\n\n' + ((s.del + s.mute) > 5 ? '⚠️ امروز پرفتنش بود؛ بررسی کن.' : '✅ همه‌چیز آروم بود.') });
  await KV.put('modstat', JSON.stringify({ del: 0, mute: 0, rep: 0, join: 0 }));
}

// ---------- بررسی آنلاین کلمات ----------
async function mzOnlineCheck(words) {
  const out = {};
  const uniq = words.filter((w, i) => words.indexOf(w) === i).slice(0, 15);
  if (!uniq.length) return { out, cacheable: false };
  const titles = uniq.map(encodeURIComponent).join('|');
  const wt = {}; const wp = {}; let ok1 = false, ok2 = false;
  try {
    const r = await fetch('https://fa.wiktionary.org/w/api.php?action=query&prop=categories&titles=' + titles + '&cllimit=50&format=json&origin=*');
    const j = await r.json(); const pages = (j.query && j.query.pages) || {};
    for (const id in pages) { const pg = pages[id]; if (pg.missing !== undefined) wt[pg.title] = { exists: false, cats: [] }; else wt[pg.title] = { exists: true, cats: (pg.categories || []).map(c => c.title) }; }
    ok1 = true;
  } catch (e) {}
  try {
    const r2 = await fetch('https://fa.wikipedia.org/w/api.php?action=query&titles=' + titles + '&format=json&origin=*');
    const j2 = await r2.json(); const pages2 = (j2.query && j2.query.pages) || {};
    for (const id in pages2) { const pg = pages2[id]; wp[pg.title] = pg.missing === undefined; }
    ok2 = true;
  } catch (e) {}
  uniq.forEach(w => { const t = wt[w]; out[w] = { exists: !!(t && t.exists), cats: t ? t.cats : [], wp: !!wp[w] }; });
  const missing = uniq.filter(w => !out[w].wp && !out[w].exists).slice(0, 5);
  for (const w of missing) {
    try {
      const r3 = await fetch('https://fa.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(w) + '&limit=1&format=json');
      const j3 = await r3.json();
      if (j3 && j3[1] && j3[1][0] && mzNorm(j3[1][0]) === w) out[w].wp = true;
    } catch (e) {}
  }
  return { out, cacheable: ok1 && ok2 };
}
async function mzConsensus(KV, env, col, w, uid) {
  const key = 'wc:' + w;
  const rec = (await KV.get(key, 'json')) || { u: {} };
  rec.u[uid] = col;
  if (Object.keys(rec.u).length >= 2) {
    const learned = (await KV.get('learned:' + col, 'json')) || [];
    if (learned.indexOf(w) === -1) {
      learned.push(w); await KV.put('learned:' + col, JSON.stringify(learned));
      for (const id of Object.keys(rec.u)) {
        if (/^\d+$/.test(id)) {
          const u = await mzGetUser(KV, id); u.coins += 10; await KV.put('u:' + id, JSON.stringify(u));
          try { await mzBale(env, 'sendMessage', { chat_id: id, text: '🎉 واژه «' + w + '» با اجماع به فرهنگ‌نامه اضافه شد! +' + faP(10) + ' سکه' }); } catch (e) {}
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
  active = active.filter(c => c !== String(chatId));
  await KV.put('mz_active', JSON.stringify(active));
  await mzBale(env, 'sendMessage', { chat_id: chatId, text: '🗑️ میز بسته شد.\nبرای میز جدید: /نبرد' });
}

// ---------- داوری میزگرد ----------
async function mzJudge(env, KV, st) {
  const bank = await mzLoadBank(KV);
  const need = [];
  st.players.forEach(p => {
    MZ_COLS.forEach(col => {
      if (MZ_ONLINE_COLS.indexOf(col) === -1) return;
      const w = mzNorm(p.answers[col] || '');
      if (w.length >= 2 && w.charAt(0) === st.letter && (bank[col] || []).indexOf(w) === -1 && !mzRootHit(col, w)) need.push(w);
    });
  });
  const online = {}; const toFetch = [];
  const uniqNeed = need.filter((w, i) => need.indexOf(w) === i);
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
        if ((o.cats || []).some(c => keys.some(k => c.indexOf(k) !== -1))) return 10;
      }
      if (w.length >= 3 && await mzConsensus(KV, env, col, w, uid)) return 10;
      if (o && o.exists) return 5;
      return 0;
    }
    return 10;
  }
  st.players.forEach(p => { p.cells = [0,0,0,0,0,0]; });
  for (let i = 0; i < MZ_COLS.length; i++) {
    const col = MZ_COLS[i];
    for (let pi = 0; pi < st.players.length; pi++) {
      const p = st.players[pi];
      const w = mzNorm(p.answers[col] || '');
      let s = await wordScore(col, w, p.id);
      const dup = st.players.some((o, oi) => oi !== pi && s > 0 && mzNorm(o.answers[col] || '') === w);
      if (dup) s = Math.ceil(s / 2);
      if (i === st.golden) s *= 2;
      p.cells[i] = s; p.score += s;
    }
  }
  st.players.forEach(p => { p.score += (p.timeBonus || 0); });
  st.phase = 'result';
  const sorted = st.players.slice().sort((a, b) => b.score - a.score);
  st.result = { winnerId: sorted.length > 1 && sorted[0].score > sorted[1].score ? sorted[0].id : (sorted.length === 1 ? sorted[0].id : null), sorted: sorted.map(p => ({ id: p.id, name: p.name, score: p.score })) };
}
async function mzPostResult(env, KV, st) {
  const winId = st.result.winnerId;
  let total = 0;
  for (const p of st.players) {
    total += p.score;
    const u = await mzGetUser(KV, p.id);
    const coins = (p.id === winId ? 20 : 0) + Math.floor(p.score / 5);
    u.coins += coins; p.coinsWon = coins;
    await KV.put('u:' + p.id, JSON.stringify(u));
  }
  const gTotal = parseInt(await KV.get('mzg:' + st.chat) || '0');
  await KV.put('mzg:' + st.chat, String(gTotal + total));
  let t = '🏁 نتیجهٔ نهایی میزگرد!\n\nستون | ' + st.players.map(p => mzShort(p.name)).join(' | ') + '\n';
  MZ_COLS.forEach((col, i) => { t += col + ' | ' + st.players.map(p => (p.cells ? p.cells[i] : 0)).join(' | ') + '\n'; });
  t += '⚡ سرعت | ' + st.players.map(p => p.timeBonus || 0).join(' | ') + '\n';
  t += '🏅 مجموع | ' + st.players.map(p => p.score).join(' | ') + '\n\n';
  const medals = ['🥇','🥈','🥉','۴.','۵.','۶.','۷.','۸.'];
  st.result.sorted.forEach((r, i) => { t += (medals[i] || '•') + ' ' + r.name + ' — ' + faP(r.score) + '\n'; });
  if (winId) { const wp = st.players.find(p => p.id === winId); if (wp) t += '\n👑 واژه‌سالار این میز: ' + wp.name + '\n'; }
  const winIdx = winId ? st.players.findIndex(p => p.id === winId) : -1;
  let betText = '';
  for (const b of st.bets) {
    const targetName = st.players[b.on] ? st.players[b.on].name : '؟';
    const u = await mzGetUser(KV, b.user);
    if (winId === null) { u.coins += b.amount; betText += '↩️ پیش‌بینی ' + b.name + ' دربارهٔ ' + targetName + ' برگشت.\n'; }
    else if (b.on === winIdx) { const gain = b.amount + Math.floor(b.amount * 0.8); u.coins += gain; betText += '💰 ' + b.name + ' هوادارِ ' + targetName + ' برنده شد: +' + faP(gain) + '\n'; }
    else betText += '😅 پیش‌بینی ' + b.name + ' دربارهٔ ' + targetName + ' درست نبود.\n';
    await KV.put('u:' + b.user, JSON.stringify(u));
  }
  if (betText) t += '\n' + betText;
  st.court = []; const seenC = [];
  for (const p of st.players) {
    MZ_COLS.forEach((col, i) => {
      if (st.court.length >= 4) return;
      const w = mzNorm(p.answers[col] || '');
      if (p.cells && p.cells[i] === 0 && w.length >= 3 && w.charAt(0) === st.letter && MZ_ONLINE_COLS.indexOf(col) !== -1 && seenC.indexOf(w) === -1) {
        seenC.push(w);
        st.court.push({ w, col, owner: p.id, ownerName: p.name, yes: [], no: [], done: false, g: i === st.golden });
      }
    });
  }
  if (st.court.length) {
    st.courtUntil = Date.now() + 600000;
    t += '\n🏛️ دادگاه میز\n\nاین کلمات رد شدن؛ با رأی‌گیری تصمیم می‌گیریم:\n';
    st.court.forEach(c => { t += '• ' + c.w + ' (' + c.col + ') — مالِ ' + c.ownerName + '\n'; });
  } else st.courtUntil = 0;
  t += '\n' + MZ_TAUNTS[Math.floor(Math.random() * MZ_TAUNTS.length)];
  const courtRows = [];
  st.court.forEach((c, i) => { courtRows.push([{ text: '👍 ' + c.w, callback_data: 'mz_vote_' + i + '_y' }, { text: '👎 ' + c.w, callback_data: 'mz_vote_' + i + '_n' }]); });
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: t, reply_markup: courtRows.length ? { inline_keyboard: courtRows } : undefined });
  let active = (await KV.get('mz_active', 'json')) || [];
  if (st.court.length) { if (active.indexOf(String(st.chat)) === -1) active.push(String(st.chat)); }
  else active = active.filter(c2 => c2 !== String(st.chat));
  await KV.put('mz_active', JSON.stringify(active));
  await KV.put('mz:' + st.chat, JSON.stringify(st));
}
async function mzStartPlay(env, KV, st, key) {
  st.phase = 'play';
  st.letter = MZ_LETTERS[Math.floor(Math.random() * MZ_LETTERS.length)];
  st.golden = Math.floor(Math.random() * MZ_COLS.length);
  st.endsAt = Date.now() + 90000;
  st.players.forEach(p => { p.idx = 0; p.answers = {}; p.submitted = false; p.score = 0; p.timeBonus = 0; p.cells = [0,0,0,0,0,0]; });
  await KV.put(key, JSON.stringify(st));
  const betRows = [];
  for (let i = 0; i < st.players.length; i += 2) {
    const row = [{ text: '🔮 ' + st.players[i].name, callback_data: 'mz_bet_' + i }];
    if (st.players[i + 1]) row.push({ text: '🔮 ' + st.players[i + 1].name, callback_data: 'mz_bet_' + (i + 1) });
    betRows.push(row);
  }
  await mzBale(env, 'sendMessage', { chat_id: st.chat, text: '🔔 مسابقه شروع شد!\n\n🔤 حرف این دور: ' + st.letter + '\n⭐ ستون طلایی: ' + MZ_COLS[st.golden] + ' (با ضریب ۲)\n\n✍️ بازیکن‌ها: جواب هر ستون رو خصوصی بفرستید\n🔮 تماشاگرها: پیش‌بینی قهرمان رو ثبت کنید', reply_markup: { inline_keyboard: betRows } });
  for (const p of st.players) {
    await mzBale(env, 'sendMessage', { chat_id: p.id, text: '🏟️ مسابقه شروع شد!\n\n🔤 حرف این دور: ' + st.letter + '\n✍️ ستون ' + faP(1) + ' از ' + faP(6) + ' — ' + MZ_COLS[0] + ':' });
  }
}

// ---------- هندلرهای ماژولار میزگرد ----------
async function handleMzJoin(env, KV, st, uid, name, chatId) {
  if (st.phase !== 'join' && st.phase !== 'countdown') { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'میز از دست رفت! دور بعد زودتر بیا.' }); return; }
  if (st.players.length >= 8) return;
  if (!st.players.find(p => p.id === uid)) {
    st.players.push({ id: uid, name, answers: {}, idx: 0, submitted: false, score: 0, timeBonus: 0, cells: [0,0,0,0,0,0] });
    await KV.put('mzu:' + uid, String(chatId));
    await mzBale(env, 'sendMessage', { chat_id: chatId, text: '🪑 ' + name + ' پای میز نشست.\n👥 حاضرین: ' + faP(st.players.length) + ' نفر' });
    await KV.put('mz:' + chatId, JSON.stringify(st));
  }
}
async function handleMzStart(env, KV, st, uid, chatId, ctx) {
  if (uid !== st.host) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه نبرد رو شروع کنه!' }); return; }
  if (st.phase !== 'join') return;
  if (st.players.length < 2) {
    await mzBale(env, 'sendMessage', { chat_id: chatId, text: 'حداقل ۲ نفر باید پای میز باشن!' });
    await mzBale(env, 'sendMessage', { chat_id: uid, text: 'حداقل ۲ نفر باید پای میز باشن!' });
    return;
  }
  st.phase = 'countdown'; st.startsAt = Date.now() + MZ_COUNTDOWN * 1000;
  await KV.put('mz:' + chatId, JSON.stringify(st));
  await mzBale(env, 'sendMessage', { chat_id: chatId, text: '📢 مسابقه تا ' + faP(MZ_COUNTDOWN) + ' ثانیهٔ دیگر شروع می‌شه!\n⏳ آماده باشید...' });
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil((async () => {
      await new Promise(r => setTimeout(r, MZ_COUNTDOWN * 1000 + 500));
      const st2 = await KV.get('mz:' + chatId, 'json');
      if (st2 && st2.phase === 'countdown') await mzStartPlay(env, KV, st2, 'mz:' + chatId);
    })());
  }
}
async function handleMzBet(env, KV, st, uid, name, data) {
  if (st.phase !== 'play') return;
  const idx = Number(data.slice(7));
  const target = st.players[idx]; if (!target) return;
  if (st.bets.find(b => b.user === uid)) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'قبلاً پیش‌بینی کردی!' }); return; }
  const u = await mzGetUser(KV, uid);
  if (u.coins < 20) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'سکه کافی نیست (' + faP(20) + ' لازمه)' }); return; }
  u.coins -= 20; await KV.put('u:' + uid, JSON.stringify(u));
  st.bets.push({ user: uid, name, on: idx, amount: 20 });
  await KV.put('mz:' + st.chat, JSON.stringify(st));
  await mzBale(env, 'sendMessage', { chat_id: uid, text: '🔮 پیش‌بینی ' + faP(20) + ' سکه‌ای روی قهرمانیِ ' + target.name + ' ثبت شد!' });
}
async function handleMzVote(env, KV, st, uid, data, chatId) {
  const parts = data.slice(8).split('_');
  const idx = Number(parts[0]); const side = parts[1];
  const c = st.court && st.court[idx];
  if (!c || c.done || st.phase !== 'result') return;
  if (uid === c.owner) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'روی کلمهٔ خودت نمی‌تونی رأی بدی!' }); return; }
  if (c.yes.indexOf(uid) !== -1 || c.no.indexOf(uid) !== -1) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'قبلاً رأی دادی!' }); return; }
  if (side === 'y') c.yes.push(uid); else c.no.push(uid);
  if (/^\d+$/.test(uid)) { const u = await mzGetUser(KV, uid); u.coins += 2; await KV.put('u:' + uid, JSON.stringify(u)); }
  let msg2 = '🗳️ رأی تو ثبت شد (+' + faP(2) + ' سکه)';
  if (c.yes.length >= 2 && c.yes.length > c.no.length) {
    c.done = true;
    const learned = (await KV.get('learned:' + c.col, 'json')) || [];
    if (learned.indexOf(c.w) === -1) { learned.push(c.w); await KV.put('learned:' + c.col, JSON.stringify(learned)); }
    const reward = c.g ? 20 : 10;
    if (/^\d+$/.test(c.owner)) {
      const ou = await mzGetUser(KV, c.owner); ou.coins += reward; await KV.put('u:' + c.owner, JSON.stringify(ou));
      try { await mzBale(env, 'sendMessage', { chat_id: c.owner, text: '🏛️ دادگاه کلمهٔ «' + c.w + '» رو پذیرفت! +' + faP(reward) + ' سکه برگشت.' }); } catch (e) {}
    }
    await mzBale(env, 'sendMessage', { chat_id: chatId, text: '✅ «' + c.w + '» پذیرفته شد و به فرهنگ‌نامه رفت!' });
    msg2 = '🗳️ رأی تو ثبت شد — کلمه پذیرفته شد! 🎉';
  }
  await KV.put('mz:' + st.chat, JSON.stringify(st));
  await mzBale(env, 'sendMessage', { chat_id: uid, text: msg2 });
}

async function mzHandle(update, env, ctx) {
  const KV = env.GAME_KV;
  if (update.message) {
    const msg = update.message; const chat = msg.chat || {};
    const text = (msg.text || '').trim();
    const isGroup = chat.type === 'group' || chat.type === 'supergroup';
    if (chat.type === 'channel') return true;
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
        if (adminG) await mzBale(env, 'sendMessage', { chat_id: adminG, text: '🚨 هجوم عضویت در گروه!\nقفل اضطراری فعال شد.' });
        return true;
      }
      for (const nm of msg.new_chat_members) {
        if (nm.is_bot) continue;
        const nmName = (nm.first_name || '') + ' ' + (nm.last_name || '');
        if (/https?:|@|\d{7,}/.test(nmName)) { try { await mzBale(env, 'restrictChatMember', { chat_id: chat.id, user_id: Number(nm.id), permissions: { can_send_messages: false } }); } catch (e) {} }
      }
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '👋 به خانواده مرکز بازی خوش اومدی!\n\n📜 قوانین: /rules\n🏟️ میزگرد هر شب ۲۱:۳۰ خودکار\n✍️ جواب‌ها فقط خصوصی به بات' });
      return true;
    }
    if (isGroup && msg.from && !msg.from.is_bot) {
      const uidG = String(msg.from.id);
      const adminG = await KV.get('admin_id');
      let priv = uidG === adminG;
      if (!priv) { try { const cm = await mzBale(env, 'getChatMember', { chat_id: chat.id, user_id: Number(uidG) }); priv = !!(cm && cm.ok && ['administrator','creator'].includes(cm.result.status)); } catch (e) {} }
      if (!priv) {
        const recessOn = (await KV.get('recess')) === '1';
        const testerG = await isTester(KV, uidG);
        const allowedCmd = /^\/(نبرد|nabard|لغو|laghv|rahnama|راهنما|کد|code|start|ایدی|id|قوانین|rules)\b/.test(text);
        const hasLink = /https?:\/\/|t\.me\/|ble\.ir\//i.test(msg.text || '');
        const isFwd = !!(msg.forward_from || msg.forward_from_chat || msg.forward_sender_name);
        const hasMedia = !!(msg.photo || msg.video || msg.sticker || msg.document || msg.audio || msg.voice);
        const bwExtra = (await KV.get('mod_words', 'json')) || [];
        const bad = MOD_BW.concat(bwExtra).some(w => w && (msg.text || '').indexOf(w) !== -1);
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
        else if (!recessOn && !allowedCmd && !testerG) violation = 'پیام خارج از چارچوب';
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
            await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔇 ' + (msg.from.first_name || 'کاربر') + ' به‌دلیل «' + violation + '» یک ساعت ساکت شد.' });
          } else {
            await KV.put(wkey, String(w), { expirationTtl: 86400 });
            await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⚠️ ' + (msg.from.first_name || 'کاربر') + ' عزیز، «' + violation + '» مجاز نیست.\n📌 اخطار ' + faP(w) + ' از ' + faP(5) + '\n🔇 ۳ اخطار = سکوت | ⛔️ ۵ اخطار = حذف\n🌷 قوانین: /rules' });
          }
          return true;
        }
      }
    }
    const myId = String((msg.from && msg.from.id) || chat.id);
    const isAdminMsg = myId === (await KV.get('admin_id'));
    if ((text === '/قفل' || text === '/lock') && isAdminMsg) { await modSetLock(env, chat.id, true); await KV.put('recess', '0'); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔒 سالن قفل شد.' }); return true; }
    if ((text === '/باز' || text === '/unlock') && isAdminMsg) { await modSetLock(env, chat.id, false); await KV.put('recess', '1'); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔓 سالن باز شد.' }); return true; }
    if (text === '/سکوت' && msg.reply_to_message && msg.reply_to_message.from && isAdminMsg) {
      try { await mzBale(env, 'restrictChatMember', { chat_id: chat.id, user_id: Number(msg.reply_to_message.from.id), permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); } catch (e) {}
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🔇 کاربر یک ساعت ساکت شد.' }); return true;
    }
    if (text === '/اخراج' && msg.reply_to_message && msg.reply_to_message.from && isAdminMsg) {
      try { await mzBale(env, 'banChatMember', { chat_id: chat.id, user_id: Number(msg.reply_to_message.from.id) }); } catch (e) {}
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ کاربر حذف شد.' }); return true;
    }
    if (text.indexOf('/افزودن_کلمه ') === 0 && isAdminMsg) {
      const w = text.slice(text.indexOf(' ') + 1);
      const arr = (await KV.get('mod_words', 'json')) || [];
      if (w && arr.indexOf(w) === -1) arr.push(w);
      await KV.put('mod_words', JSON.stringify(arr));
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ به فهرست سیاه اضافه شد (' + faP(arr.length) + ').' }); return true;
    }
    if (text === '/کلمات' && isAdminMsg) { const arr = (await KV.get('mod_words', 'json')) || []; await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '📛 فهرست سیاه:\n' + (arr.length ? arr.join('، ') : 'خالی') }); return true; }
    if (text.indexOf('/افزودن_تستر ') === 0 && isAdminMsg) {
      const id = text.split(' ')[1];
      const arr = (await KV.get('testers', 'json')) || [];
      if (id && arr.indexOf(id) === -1) arr.push(id);
      await KV.put('testers', JSON.stringify(arr));
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ تستر اضافه شد (' + faP(arr.length) + ').' }); return true;
    }
    if (text.indexOf('/حذف_تستر ') === 0 && isAdminMsg) {
      const id = text.split(' ')[1];
      let arr = (await KV.get('testers', 'json')) || [];
      arr = arr.filter(x => x !== id);
      await KV.put('testers', JSON.stringify(arr));
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🗑️ تستر حذف شد (' + faP(arr.length) + ' مونده).' }); return true;
    }
    if (text === '/تسترها' && isAdminMsg) { const arr = (await KV.get('testers', 'json')) || []; await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🧪 تسترها:\n' + (arr.length ? arr.join('، ') : 'خالی') }); return true; }
    if (text === '/admin') {
      const cur = await KV.get('admin_id');
      if (!cur) { await KV.put('admin_id', myId); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ شناسه‌ات به‌عنوان ادمین بات ذخیره شد.' }); }
      else if (cur === myId) await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ تو ادمین بات هستی.' });
      else await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ ادمین قبلاً ثبت شده؛ فقط با /انتقال_ادمین عوض می‌شه.' });
      return true;
    }
    if (text.indexOf('/انتقال_ادمین ') === 0) {
      const cur = await KV.get('admin_id');
      if (cur === myId) { await KV.put('admin_id', text.split(' ')[1]); await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '✅ ادمین منتقل شد.' }); }
      else await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '⛔️ فقط ادمین فعلی می‌تونه منتقل کنه.' });
      return true;
    }
    if (text.indexOf('/پست ') === 0 || text.indexOf('/post ') === 0) {
      if (myId === (await KV.get('admin_id'))) {
        const body2 = text.slice(text.indexOf(' ') + 1);
        const r = await mzBale(env, 'sendMessage', { chat_id: '@bale_game_center', text: body2, reply_markup: cbButtons('apost:' + Date.now()) });
        await mzBale(env, 'sendMessage', { chat_id: myId, text: (r && r.ok) ? '📢 پست با دکمه‌های زنده منتشر شد!' : '❌ ناموفق.' });
      } else await mzBale(env, 'sendMessage', { chat_id: myId, text: 'فقط ادمین می‌تونه پست بذاره.' });
      return true;
    }
    if (text === '/ایدی' || text === '/id') {
      let t = '🆔 شناسهٔ تو: ' + faP(myId);
      if (isGroup) t += '\n🆔 شناسهٔ گروه: ' + faP(String(chat.id));
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: t }); return true;
    }
    if (text === '/لاگ' || text === '/log') {
      const log = (await KV.get('react_log', 'json')) || [];
      const elog = (await KV.get('edit_log', 'json')) || [];
      const mb = await KV.get('menubtn_log');
      await mzBale(env, 'sendMessage', { chat_id: chat.id, text: (mb ? ('🟢 setChatMenuButton:\n' + mb + '\n\n') : '') + (elog.length ? ('🛠️ ویرایش دکمه‌ها:\n' + JSON.stringify(elog).slice(0, 1200) + '\n\n') : '') + (log.length ? ('🧪 رویدادها:\n' + JSON.stringify(log.slice(0, 3)).slice(0, 800)) : '🧪 رویدادی نیست.') });
      return true;
    }
    if (text === '/راهنما' || text === '/rahnama') { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: MZ_GUIDE }); return true; }
    if (text === '/قوانین' || text === '/rules') { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: MZ_RULES }); return true; }
    if (text.indexOf('/کد') === 0 || text.indexOf('/code') === 0) {
      const uid = myId;
      const today = new Date().toISOString().slice(0, 10);
      const dc = (await KV.get('daily_code', 'json')) || null;
      const arg = text.split(' ')[1] || '';
      if (dc && dc.date === today && arg.trim().toUpperCase() === dc.code) {
        const u = await mzGetUser(KV, uid);
        if (u.claimed && u.claimed.dailyCode === today) await mzBale(env, 'sendMessage', { chat_id: uid, text: 'این کد رو امروز گرفتی!' });
        else {
          if (!u.claimed) u.claimed = {};
          u.claimed.dailyCode = today; u.coins += 25;
          await KV.put('u:' + uid, JSON.stringify(u));
          await mzBale(env, 'sendMessage', { chat_id: uid, text: '🎁 مأموریت روز انجام شد! +' + faP(25) + ' سکه\n🪙 موجودی: ' + faP(u.coins) });
        }
      } else await mzBale(env, 'sendMessage', { chat_id: uid, text: '❌ کد اشتباه یا مال امروز نیست.' });
      return true;
    }
    if (isGroup && text === '/start') { await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '🎮 به گروه مرکز بازی خوش اومدی!\n\n🏟️ میزگرد هر شب ۲۱:۳۰ خودکار\n📖 راهنما: /rahnama\n📜 قوانین: /rules' }); return true; }
    if (isGroup && (text === '/نبرد' || text === '/nabard')) {
      const uid = String(msg.from.id);
      const key = 'mz:' + chat.id;
      const existing = await KV.get(key, 'json');
      if (existing && existing.phase !== 'result') {
        const stale = (existing.phase === 'join' && Date.now() - existing.createdAt > 300000) || (existing.phase !== 'join' && existing.endsAt && Date.now() > existing.endsAt + 120000);
        if (!stale) {
          const m = '⚔️ یه میزگرد دیگه بازه!\nهمون‌جا بشین یا تا پایان صبر کن.';
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
      const sent = await mzBale(env, 'sendMessage', { chat_id: chat.id, text: '📣 میزگرد واژه‌ها — ' + mzWhen() + '\n\n👑 میزبان: ' + (msg.from.first_name || '؟') + '\n⏱ ' + faP(90) + ' ثانیه | 📝 ' + faP(6) + ' ستون | ⭐ ستون طلایی ضریب ۲\n\n✍️ جواب‌ها خصوصی | 🏁 نتیجه عمومی\n🔮 پیش‌بینی قهرمان آزاده!', reply_markup: { inline_keyboard: [ [{ text: '🪑 نشستن پای میز', callback_data: 'mz_join' }, { text: '⚔️ شروع نبرد (میزبان)', callback_data: 'mz_start' }], [{ text: '📨 دعوت دوستان', callback_data: 'mz_invite' }, { text: '📖 راهنما', callback_data: 'mz_guide' }] ] } });
      try { if (sent && sent.result && sent.result.message_id) await mzBale(env, 'pinChatMessage', { chat_id: chat.id, message_id: sent.result.message_id, disable_notification: true }); } catch (e) {}
      return true;
    }
    if (isGroup && (text === '/لغو' || text === '/لغو میز' || text === '/laghv')) {
      const uid = String(msg.from.id);
      const key = 'mz:' + chat.id;
      const st = await KV.get(key, 'json');
      if (st && st.phase !== 'result') {
        if (uid === st.host) await mzClose(env, KV, key, chat.id);
        else await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه میز رو ببنده!' });
      }
      return true;
    }
    if (chat.type === 'private' && msg.text && msg.text.charAt(0) !== '/') {
      const uid = myId;
      if (REPLY_MENU.indexOf(text) !== -1) return false;
      const g = await KV.get('mzu:' + uid);
      if (g) {
        const st = await KV.get('mz:' + g, 'json');
        if (st && st.phase === 'play') {
          const p = st.players.find(x => x.id === uid);
          if (p && !p.submitted) {
            p.answers[MZ_COLS[p.idx]] = msg.text.trim();
            p.idx++;
            if (p.idx >= MZ_COLS.length) {
              p.submitted = true;
              p.timeBonus = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000)) * 2;
              await mzBale(env, 'sendMessage', { chat_id: uid, text: '✅ جوابت ثبت شد!\n⚡ پاداش سرعت: +' + faP(p.timeBonus) + '\n⏳ منتظر بقیه...' });
            } else {
              await mzBale(env, 'sendMessage', { chat_id: uid, text: '✍️ ستون ' + faP(p.idx + 1) + ' از ' + faP(6) + ' — ' + MZ_COLS[p.idx] + ':' });
            }
            if (st.players.every(x => x.submitted)) { await mzJudge(env, KV, st); await mzPostResult(env, KV, st); }
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
      const st = await KV.get('mz:' + chatId, 'json');
      await mzBale(env, 'answerCallbackQuery', { callback_query_id: cb.id });
      if (!st) return true;
      const uid = String(cb.from.id);
      const name = cb.from.first_name || 'بازیکن';
      if (data === 'mz_join') { await handleMzJoin(env, KV, st, uid, name, chatId); return true; }
      if (data === 'mz_close') { if (uid !== st.host) { await mzBale(env, 'sendMessage', { chat_id: uid, text: 'فقط میزبان می‌تونه بببنده!' }); return true; } await mzClose(env, KV, 'mz:' + chatId, chatId); return true; }
      if (data === 'mz_guide') { await mzBale(env, 'sendMessage', { chat_id: chatId, text: MZ_GUIDE }); return true; }
      if (data === 'mz_invite') {
        let link = '';
        try { const r = await mzBale(env, 'exportChatInviteLink', { chat_id: chatId }); if (r.ok) link = r.result; } catch (e) {}
        if (link) await mzBale(env, 'sendMessage', { chat_id: uid, text: '📨 لینک دعوت:\n' + link });
        else await mzBale(env, 'sendMessage', { chat_id: uid, text: 'از تنظیمات گروه لینک دعوت رو کپی کن.' });
        return true;
      }
      if (data === 'mz_start') { await handleMzStart(env, KV, st, uid, chatId, ctx); return true; }
      if (data.indexOf('mz_bet_') === 0 && data.indexOf('mz_vote_') !== 0) { await handleMzBet(env, KV, st, uid, name, data); return true; }
      if (data.indexOf('mz_vote_') === 0) { await handleMzVote(env, KV, st, uid, data, chatId); return true; }
      return true;
    }
  }
  return false;
}

// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const KV = env.GAME_KV;
    const CHANNEL = '@bale_game_center';
    const GROUP = '@game_center_bale';
    const GAME_URL = 'https://metabolicbit-jpg.github.io/bale-game/flappy.html';
    const ESM_URL = 'https://metabolicbit-jpg.github.io/bale-game/esm.html';
    const SHOP = [
      { id: 'skin_gold', name: '🐤 پرنده طلایی', price: 200 },
      { id: 'skin_eagle', name: '🦅 عقاب', price: 350 },
      { id: 'skin_rocket', name: '🚀 موشک', price: 500 },
      { id: 'trail_rainbow', name: '🌈 دنباله رنگین‌کمان', price: 300 },
      { id: 'life_extra', name: '❤️ جان اضافه', price: 100 }
    ];
    async function bale(method, data) { const res = await fetch('https://tapi.bale.ai/bot' + (env.BALE_BOT_TOKEN || '') + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return res.json(); }
    function fa(n) { const p = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹']; return String(n).replace(/\d/g, d => p[d]); }
    async function cbPostState(pid, upd) { const st = (await KV.get('postst:' + pid, 'json')) || { likes: 0, sug: 0 }; if (upd === 'like') st.likes += 1; if (upd === 'sug') st.sug = 1; await KV.put('postst:' + pid, JSON.stringify(st)); return st; }
    function cbMarkedButtons(st, pid) { return { inline_keyboard: [ [ { text: (st.likes > 0 ? '❤️ ' + fa(st.likes) + ' لایک' : '❤️ پسندیدم (+۳)'), callback_data: 'cb_like:' + pid }, { text: (st.sug ? '⬆️ پیشنهاد شد' : '💡 پیشنهاد به مجله (+۵)'), callback_data: 'cb_sug' } ] ] }; }
    function mainInlineMenu(uid) {
      return { inline_keyboard: [
        [{ text: '🎮 نبرد واژه‌ها [دونفره]', url: ESM_URL + '?user=' + uid }],
        [{ text: '🌼 حساب کاربری', callback_data: 'profile' }, { text: '🐤 پرنده‌پرش', url: GAME_URL + '?user=' + uid }],
        [{ text: '🏆 برترین‌ها | رتبه من', callback_data: 'rank' }, { text: '🚦 راهنما', callback_data: 'guide_menu' }],
        [{ text: '🏟️ میزگرد گروهی [چندنفره]', url: 'https://ble.ir/game_center_bale' }],
        [{ text: '📋 کارها', callback_data: 'tasks' }, { text: '🛒 فروشگاه', callback_data: 'shop' }],
        [{ text: '📢 مجله کانال', url: 'https://ble.ir/bale_game_center' }, { text: '🆔 آیدی من', callback_data: 'myid' }]
      ] };
    }
    // ✅ [v36] CORS هوشمند: پاسخ دقیق به Origin درخواست
    function json(obj, status) {
      const origin = request.headers.get('Origin') || '*';
      return new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'false',
          'Vary': 'Origin'
        }
      });
    }
    async function getUser(id) { const raw = await KV.get('u:' + id, 'json'); if (raw) return raw; return { coins: 0, best: 0, games: 0, items: [], claimed: {}, daily: {}, esm: { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } } }; }
    async function saveUser(id, u) { await KV.put('u:' + id, JSON.stringify(u)); }
    async function rankText() {
      const lb = (await KV.get('lb', 'json')) || [];
      if (!lb.length) return '🏆 هنوز کسی نیست! اولین نفر باش!';
      const medals = ['🥇','','🥉','.','۵.'];
      let t = '🏆 برترین‌های مرکز بازی:\n\n';
      lb.slice(0, 5).forEach((e, i) => { t += medals[i] + ' ' + e.name + ' — رکورد: ' + fa(e.best) + '\n'; });
      return t;
    }
    async function updateLB(id, name, best) {
      const lb = (await KV.get('lb', 'json')) || [];
      const e = lb.find(x => x.id === id);
      if (e) { e.name = name; if (best > e.best) e.best = best; }
      else lb.push({ id, name, best });
      lb.sort((a, b) => b.best - a.best);
      await KV.put('lb', JSON.stringify(lb.slice(0, 50)));
    }
    async function sendTasks(chatId) {
      await bale('sendMessage', { chat_id: chatId, text: '📋 کارهای سکه‌دار:\n\n👥 عضویت کانال: +' + fa(100) + '\n👥 عضویت گروه: +' + fa(100) + '\n🎮 هر بازی: تا +' + fa(50) + '\n🎯 رکورد جدید: +' + fa(50) + '\n📅 ورود روزانه: +' + fa(30) + ' (خودکار)', reply_markup: { inline_keyboard: [ [{ text: '📢 کانال', url: 'https://ble.ir/' + CHANNEL.replace('@', '') }, { text: '👥 گروه', url: 'https://ble.ir/' + GROUP.replace('@', '') }], [{ text: '✅ عضو کانال شدم', callback_data: 'task_channel' }], [{ text: '✅ عضو گروه شدم', callback_data: 'task_group' }] ] } });
    }
    async function sendShop(chatId, u) {
      let t = '🛒 فروشگاه اسکین و آیتم\n\n';
      SHOP.forEach(i => { const owned = u.items.includes(i.id) ? ' ✅' : ''; t += i.name + ' — ' + fa(i.price) + ' سکه' + owned + '\n'; });
      t += '\n🪙 سکه تو: ' + fa(u.coins);
      const rows = [];
      SHOP.forEach(i => { if (!u.items.includes(i.id)) rows.push([{ text: 'خرید ' + i.name + ' (' + fa(i.price) + ')', callback_data: 'buy_' + i.id }]); });
      if (!rows.length) rows.push([{ text: 'همه رو خریدی! 🎉', callback_data: 'coins' }]);
      await bale('sendMessage', { chat_id: chatId, text: t, reply_markup: { inline_keyboard: rows } });
    }

    if (url.pathname === '/app') {
      const html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://tapi.bale.ai/miniapp.js?3"></script><style>body{font-family:sans-serif;background:#0f2027;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}button{font-size:22px;padding:14px 40px;border:0;border-radius:14px;background:#22c55e;color:#fff}</style></head><body><button id="b">🚀 شروع کن</button><script>var W=(window.Bale&&Bale.WebApp)||(window.Telegram&&Telegram.WebApp)||null;function go(){try{if(W&&W.sendData){W.sendData("menu_start");return}}catch(e){}location.href="https://ble.ir/game_balebot?start=menu"}document.getElementById("b").onclick=go;try{if(W&&W.sendData){W.sendData("menu_start")}}catch(e){}</script></body></html>';
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ✅ [v36] endpoint تست برای تشخیص زنده بودن worker
    if (url.pathname === '/api/ping') {
      return json({ ok: true, v: 36, ts: Date.now() });
    }

    // ✅ [v36] /api/me — کامل‌تر با فیلد name
    if (url.pathname === '/api/me') {
      if (request.method === 'OPTIONS') return json({ ok: true });
      const uid = String(url.searchParams.get('user') || '');
      if (!uid) return json({ ok: false, error: 'no user' }, 400);
      try {
        const u = await getUser(uid);
        return json({
          ok: true,
          user: uid,
          name: u.name || '🎮 بازیکن',
          coins: Number(u.coins) || 0,
          items: Array.isArray(u.items) ? u.items : [],
          best: Number(u.best) || 0,
          games: Number(u.games) || 0,
          esm: u.esm || { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } },
          gameStats: u.gameStats || {}
        });
      } catch (e) {
        console.error('[v36] /api/me error:', e);
        return json({ ok: false, error: 'db error' }, 500);
      }
    }

    // ✅ [v36] /api/submit — با لاگ دقیق
    if (url.pathname === '/api/submit') {
      if (request.method === 'OPTIONS') return json({ ok: true });
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const uid = String(body.user || '');
          const game = String(body.game || 'flappy');
          const score = Math.max(0, Number(body.score) || 0);
          const bonus = Math.max(0, Math.min(500, Number(body.bonus) || 0));
          if (!uid) return json({ ok: false, error: 'no user' }, 400);
          const u = await getUser(uid);
          if (body.name) u.name = String(body.name).slice(0, 30);
          u.games = (Number(u.games) || 0) + 1;
          let coins = 0;
          const newBest = score > (Number(u.best) || 0);
          coins += Math.min(50, Math.floor(score / 10));
          if (newBest && score > 0) coins += 50;
          coins += Math.min(40, Math.floor(bonus / 5));
          if (newBest) u.best = score;
          u.coins = (Number(u.coins) || 0) + coins;
          if (!u.gameStats) u.gameStats = {};
          if (!u.gameStats[game]) u.gameStats[game] = { plays: 0, best: 0, totalCoins: 0 };
          u.gameStats[game].plays += 1;
          if (score > (u.gameStats[game].best || 0)) u.gameStats[game].best = score;
          u.gameStats[game].totalCoins = (u.gameStats[game].totalCoins || 0) + coins;
          await saveUser(uid, u);
          await updateLB(uid, u.name || '🎮 بازیکن', Number(u.best) || 0);
          console.log('[v36] submit ok:', uid, 'score=' + score, 'coins=' + coins);
          return json({ ok: true, coins, balance: Number(u.coins) || 0, newBest, game });
        } catch (e) {
          console.error('[v36] /api/submit error:', e && e.message, e && e.stack);
          return json({ ok: false, error: e && e.message || 'unknown' }, 500);
        }
      }
      return json({ ok: false, error: 'method not allowed' }, 405);
    }

    // ============ ESM (نبرد واژه‌ها دونفره) ============
    const ESM_COLS = MZ_COLS, ESM_LETTERS = MZ_LETTERS, ESM_ONLINE_COLS = MZ_ONLINE_COLS, ESM_CAT_KEYS = MZ_CAT_KEYS;
    const ESM_SHOP = [ { id: 'mirror', name: '👁️ آینه', price: 50 }, { id: 'fog', name: '🌫️ مه', price: 40 } ];
    function normFa(s) { return mzNorm(s); }
    async function esmGet(r) { return await KV.get('esm:' + r, 'json'); }
    async function esmSet(r, s) { await KV.put('esm:' + r, JSON.stringify(s), { expirationTtl: 86400 }); }
    function esmNewRoom() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 4; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }
    async function esmLoadBank() {
      try { const c = await KV.get('esm_bank', 'json'); if (c && c.list) return c.list; } catch (e) {}
      try { const r = await fetch('https://metabolicbit-jpg.github.io/bale-game/words.json'); const l = await r.json(); KV.put('esm_bank', JSON.stringify({ list: l })); return l; } catch (e) { return {}; }
    }
    async function esmJudge(st) {
      const p0 = st.players[0], p1 = st.players[1];
      let s0 = 0, s1 = 0; const detail = [];
      const bank = await esmLoadBank();
      const needOnline = [];
      ESM_COLS.forEach(col => {
        if (ESM_ONLINE_COLS.indexOf(col) === -1) return;
        [p0.answers[col], p1.answers[col]].forEach(w => { w = normFa(w); if (w.length >= 2 && w.charAt(0) === st.letter && (bank[col] || []).indexOf(w) === -1 && !mzRootHit(col, w)) needOnline.push(w); });
      });
      const online = {}; const toFetch = [];
      const uniq = needOnline.filter((w, i) => needOnline.indexOf(w) === i);
      for (const w of uniq) { const c = await KV.get('wb2:' + w, 'json'); if (c) online[w] = c; else toFetch.push(w); }
      if (toFetch.length) { const got = await mzOnlineCheck(toFetch); for (const w in got.out) online[w] = got.out[w]; if (got.cacheable) for (const w in got.out) KV.put('wb2:' + w, JSON.stringify(got.out[w])); }
      async function wordScore(col, w, uid) {
        if (w.length < 2 || w.charAt(0) !== st.letter) return 0;
        if ((bank[col] || []).indexOf(w) !== -1) return 10;
        if (await mzLearnedHas(KV, col, w)) return 10;
        if (mzRootHit(col, w)) return 10;
        if (ESM_ONLINE_COLS.indexOf(col) !== -1) {
          const o = online[w];
          if (o && o.wp) return 10;
          if (o && o.exists) { const keys = ESM_CAT_KEYS[col]; if ((o.cats || []).some(c => keys.some(k => c.indexOf(k) !== -1))) return 10; }
          if (w.length >= 3 && await mzConsensus(KV, env, col, w, uid)) return 10;
          if (o && o.exists) return 5;
          return 0;
        }
        return 10;
      }
      for (let i = 0; i < ESM_COLS.length; i++) {
        const col = ESM_COLS[i];
        const a = normFa(p0.answers[col] || ''), b = normFa(p1.answers[col] || '');
        let pa = await wordScore(col, a, p0.user || p0.id);
        let pb = await wordScore(col, b, p1.user || p1.id);
        if (pa && pb && a === b) { pa = Math.ceil(pa / 2); pb = Math.ceil(pb / 2); }
        const mult = (st.golden === i) ? 2 : 1;
        pa *= mult; pb *= mult;
        s0 += pa; s1 += pb;
        detail.push({ col, a: p0.answers[col] || '-', b: p1.answers[col] || '-', pa, pb, golden: st.golden === i });
      }
      s0 += (p0.timeBonus || 0); s1 += (p1.timeBonus || 0);
      p0.score = s0; p1.score = s1;
      st.phase = 'result';
      st.result = { detail, winner: s0 === s1 ? -1 : (s0 > s1 ? 0 : 1) };
      for (let idx = 0; idx < 2; idx++) {
        const p = st.players[idx];
        if (p.user) {
          const u = await getUser(p.user);
          const win = st.result.winner === idx, draw = st.result.winner === -1;
          const coins = (win ? 20 : (draw ? 10 : 0)) + Math.floor(p.score / 5);
          u.coins += coins; p.coinsWon = coins;
          if (!u.esm) u.esm = { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } };
          u.esm.games += 1; u.esm.total += p.score; if (win) u.esm.wins += 1;
          await saveUser(p.user, u);
          await bale('sendMessage', { chat_id: p.user, text: '📝 نبرد واژه‌ها تموم شد!\n🏅 امتیاز: ' + fa(p.score) + '\n🪙 سکه: +' + fa(coins) + (win ? '\n🏆 بردی!' : (draw ? '\n🤝 مساوی!' : '\n💪 باختی!')) });
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
          if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' }, 404);
          if (st.phase === 'play' && Date.now() > st.endsAt) { await esmJudge(st); await esmSet(room, st); }
          const me = st.players.find(p => p.id === pid) || null;
          const opp = st.players.find(p => p.id !== pid) || null;
          let peek = null;
          if (me && opp && st.peek && st.peek.by === me.id && Date.now() < st.peek.until) peek = opp.answers;
          return json({ ok: true, st: { phase: st.phase, letter: st.letter, golden: st.golden, endsAt: st.endsAt, code: st.code, players: st.players.map(p => ({ id: p.id, name: p.name, submitted: p.submitted, score: p.score, coinsWon: p.coinsWon || 0, timeBonus: p.timeBonus || 0 })), result: st.result, peek, myPowers: me ? me.powers : null } });
        }
        const body = await request.json();
        const room = (body.room || '').toUpperCase();
        if (act === 'create' || act === 'join') {
          let st;
          if (act === 'create') { const code = esmNewRoom(); st = { code, phase: 'lobby', players: [], letter: null, golden: 0, endsAt: 0, result: null }; await esmSet(code, st); }
          else { st = await esmGet(room); if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' }, 404); if (st.players.length >= 2) return json({ ok: false, error: 'اتاق پره!' }, 400); }
          const inv = body.user ? ((await getUser(body.user)).esm || {}).inv || { mirror: 0, fog: 0 } : { mirror: 0, fog: 0 };
          st.players.push({ id: body.pid, name: body.name || 'بازیکن', user: body.user || '', answers: {}, powers: { mirror: 1 + inv.mirror, fog: 1 + inv.fog }, submitted: false, score: 0, timeBonus: 0 });
          if (st.players.length === 2) st.phase = 'ready';
          await esmSet(st.code, st);
          return json({ ok: true, room: st.code });
        }
        if (act === 'profile') { if (!body.user) return json({ ok: false, error: 'guest' }, 400); const u = await getUser(body.user); return json({ ok: true, coins: u.coins, esm: u.esm || { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } } }); }
        if (act === 'shop') {
          const item = ESM_SHOP.find(i => i.id === body.item);
          if (!item || !body.user) return json({ ok: false, error: 'از بات وارد شو' }, 400);
          const u = await getUser(body.user);
          if (u.coins < item.price) return json({ ok: false, error: 'سکه کافی نیست!' }, 400);
          if (!u.esm) u.esm = { games: 0, wins: 0, total: 0, inv: { mirror: 0, fog: 0 } };
          u.coins -= item.price; u.esm.inv[item.id] += 1;
          await saveUser(body.user, u);
          return json({ ok: true, coins: u.coins, inv: u.esm.inv });
        }
        const st = await esmGet(room);
        if (!st) return json({ ok: false, error: 'اتاق پیدا نشد' }, 404);
        if (act === 'start') {
          if (st.players.length !== 2) return json({ ok: false, error: 'منتظر حریف!' }, 400);
          st.letter = ESM_LETTERS[Math.floor(Math.random() * ESM_LETTERS.length)];
          st.golden = Math.floor(Math.random() * ESM_COLS.length);
          st.phase = 'play'; st.endsAt = Date.now() + 90000;
          await esmSet(room, st);
          return json({ ok: true });
        }
        if (act === 'answer') {
          const p = st.players.find(x => x.id === body.pid);
          if (!p || p.submitted) return json({ ok: false }, 400);
          p.answers = body.answers || {}; p.submitted = true;
          p.timeBonus = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000)) * 2;
          if (st.players.every(x => x.submitted)) await esmJudge(st);
          await esmSet(room, st);
          return json({ ok: true, timeBonus: p.timeBonus });
        }
        if (act === 'power') {
          const me = st.players.find(x => x.id === body.pid);
          const opp = st.players.find(x => x.id !== body.pid);
          if (!me || !opp || st.phase !== 'play') return json({ ok: false }, 400);
          if (body.type === 'mirror') {
            if (!me.powers.mirror) return json({ ok: false, error: 'قدرت نداری!' }, 400);
            if (opp.powers.fog) { opp.powers.fog--; await esmSet(room, st); return json({ ok: true, blocked: true }); }
            me.powers.mirror--; st.peek = { by: me.id, until: Date.now() + 5000 };
            await esmSet(room, st);
            return json({ ok: true, blocked: false });
          }
          return json({ ok: false }, 400);
        }
        if (act === 'again') {
          st.phase = 'ready'; st.result = null;
          st.players.forEach(p => { p.answers = {}; p.submitted = false; p.score = 0; p.timeBonus = 0; p.coinsWon = 0; p.powers = { mirror: 1, fog: 1 }; });
          await esmSet(room, st);
          return json({ ok: true });
        }
        return json({ ok: false, error: 'unknown action' }, 400);
      } catch (e) {
        console.error('[v36] ESM error:', act, e && e.message);
        return json({ ok: false, error: e && e.message || 'unknown' }, 500);
      }
    }

    // ============ WEBHOOK ============
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        const chPost = update.channel_post || (update.message && update.message.chat && update.message.chat.type === 'channel' ? update.message : null);
        if (chPost) {
          try {
            const chText = (chPost.text || '').trim();
            if (chText === '/ایدی' || chText === '/id') { await bale('sendMessage', { chat_id: chPost.chat.id, text: '🆔 شناسهٔ کانال: ' + faP(String(chPost.chat.id)) }); return new Response('ok'); }
            if (chPost.message_id && !(chPost.reply_markup && chPost.reply_markup.inline_keyboard)) {
              const adminId = await KV.get('admin_id');
              if (adminId) await mzBale(env, 'sendMessage', { chat_id: adminId, text: '📌 پست دستی دکمه نمی‌گیره.\nبرای لایک/پیشنهاد: /پست متن پست' });
            }
          } catch (e) {}
          return new Response('ok');
        }
        try {
          const keys = Object.keys(update || {});
          const isReact = keys.some(k => k.indexOf('reaction') !== -1);
          if (isReact) {
            const log = (await KV.get('react_log', 'json')) || [];
            log.unshift({ t: Date.now(), keys, data: JSON.stringify(update).slice(0, 700) });
            while (log.length > 30) log.pop();
            await KV.put('react_log', JSON.stringify(log));
            return new Response('ok');
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
            const pm = update.message;
            if (pm.forward_from_chat && (await KV.get('group_main')) && String(pm.forward_from_chat.id) === String(await KV.get('group_main'))) {
              const mid = pm.forward_from_message_id;
              const target = pm.forward_from && pm.forward_from.id;
              if (mid) {
                const rkey = 'rep:' + mid;
                const arr = (await KV.get(rkey, 'json')) || [];
                if (arr.indexOf(uid) === -1) arr.push(uid);
                await KV.put(rkey, JSON.stringify(arr), { expirationTtl: 86400 });
                await modCount(KV, 'rep');
                if (arr.length >= 3) {
                  try { await mzBale(env, 'deleteMessage', { chat_id: pm.forward_from_chat.id, message_id: mid }); } catch (e) {}
                  await modCount(KV, 'del');
                  if (target) { try { await mzBale(env, 'restrictChatMember', { chat_id: pm.forward_from_chat.id, user_id: Number(target), permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + 3600 }); } catch (e) {} await modCount(KV, 'mute'); }
                  await bale('sendMessage', { chat_id: uid, text: '🚨 پیام با ' + faP(3) + ' گزارش حذف و فرستنده ساکت شد. ممنون!' });
                } else await bale('sendMessage', { chat_id: uid, text: '📬 گزارشت ثبت شد (' + faP(arr.length) + ' از ' + faP(3) + ').' });
              } else await bale('sendMessage', { chat_id: uid, text: '📬 گزارش دریافت شد.' });
              return new Response('ok');
            }
            if (text === '/start' || text === '/menu') {
              if (!(await KV.get('cmds_v1'))) {
                await bale('setMyCommands', { commands: [ { command: 'start', description: '🎮 منوی مرکز بازی' }, { command: 'menu', description: '🧭 منوی دائمی' }, { command: 'nabard', description: '🏟️ ساخت میزگرد' }, { command: 'laghv', description: '🗑️ بستن میز' }, { command: 'rahnama', description: '📖 راهنما' }, { command: 'rules', description: '📜 قوانین' } ] });
                await KV.put('cmds_v1', '1');
              }
              if ((await KV.get('menubtn_at')) !== today) {
                let mbLog = '';
                try { const rmb = await bale('setChatMenuButton', { menu_button: { type: 'web_app', text: 'شروع کن', web_app: { url: url.origin + '/app' } } }); mbLog = JSON.stringify(rmb).slice(0, 300); } catch (e) { mbLog = 'exc:' + (e && e.message); }
                await KV.put('menubtn_log', mbLog); await KV.put('menubtn_at', today);
              }
              const isMem = await mzCheckMember(env, uid);
              if (!isMem) {
                await bale('sendMessage', { chat_id: chat.id, text: 'سلام 🌹\n\n⚠️ اول در کانال عضو شو:\n\nبعد «✅ عضو شدم» رو بزن.', reply_markup: { inline_keyboard: [ [{ text: '📢 عضویت در کانال گیم‌سنتر', url: 'https://ble.ir/bale_game_center' }], [{ text: '✅ عضو شدم', callback_data: 'join_check' }] ] } });
                return new Response('ok');
              }
              let extra = '';
              if (u.daily.login !== today) { u.daily.login = today; u.coins += 30; await saveUser(uid, u); extra = '\n\n🎁 جایزه ورود امروز: +' + fa(30) + ' سکه'; }
              const fname = (update.message.from && update.message.from.first_name) || 'دوست';
              await bale('sendMessage', { chat_id: chat.id, text: '🎮 خوش اومدی، ' + fname + ' 🌹\n\n🪙 سکه تو: ' + fa(u.coins) + extra + '\n\n🔻 یکی رو انتخاب کن 🔻', reply_markup: mainInlineMenu(uid) });
              await bale('sendMessage', { chat_id: chat.id, text: '🧭 منوی دائمی فعال شد:', reply_markup: mkReplyMenu() });
            }
            else if (text === '/coins') await bale('sendMessage', { chat_id: chat.id, text: '🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ رکورد: ' + fa(u.best) });
            else if (text === '/tasks') await sendTasks(chat.id);
            else if (text === '/shop') await sendShop(chat.id, u);
            else if (text === '/rank') await bale('sendMessage', { chat_id: chat.id, text: await rankText() });
            else if (REPLY_MENU.indexOf(text) !== -1) {
              await menuStat(KV, text);
              if (text === '🎮 شروع') await bale('sendMessage', { chat_id: chat.id, text: '🎮 منوی مرکز بازی:', reply_markup: mainInlineMenu(uid) });
              else if (text === '🌼 حساب کاربری') await bale('sendMessage', { chat_id: chat.id, text: '🌼 حساب تو\n\n🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ رکورد: ' + fa(u.best) + '\n🏅 برد نبرد: ' + fa((u.esm && u.esm.wins) || 0) + ' از ' + fa((u.esm && u.esm.games) || 0) });
              else if (text === '🛒 فروشگاه') await sendShop(chat.id, u);
              else if (text === '📋 کارها') await sendTasks(chat.id);
              else if (text === '🏆 برترین‌ها | رتبه من') await bale('sendMessage', { chat_id: chat.id, text: await rankText() });
              else if (text === '🚦 راهنما') await bale('sendMessage', { chat_id: chat.id, text: '🚦 راهنما\n\n🎮 تک‌نفره: پرنده‌پرش\n🎮 دونفره: نبرد واژه‌ها\n🏟️ چندنفره: میزگرد — هر شب ۲۱:۳۰\n🪙 سکه: بازی + لایک + پیشنهاد + کارها\n🏆 قهرمان هفته: بیشترین امتیاز\n\n' + MZ_GUIDE });
              else if (text === '📜 قوانین') await bale('sendMessage', { chat_id: chat.id, text: MZ_RULES });
              else if (text === '❌ بستن منو') await bale('sendMessage', { chat_id: chat.id, text: '👋 منو بسته شد؛ /start برای بازگشت.', reply_markup: { remove_keyboard: true } });
            }
          }
        }
        if (update.callback_query) {
          const cb = update.callback_query;
          const uid = String(cb.from.id);
          const chatId = cb.message.chat.id;
          const data = cb.data || '';
          const u = await getUser(uid);
          let msg = null;
          if (data === 'profile') msg = '🌼 حساب تو\n\n🪙 سکه: ' + fa(u.coins) + '\n🎮 بازی‌ها: ' + fa(u.games) + '\n⭐ رکورد: ' + fa(u.best) + '\n🏅 برد نبرد: ' + fa((u.esm && u.esm.wins) || 0) + ' از ' + fa((u.esm && u.esm.games) || 0);
          else if (data === 'myid') msg = '🆔 شناسهٔ تو: ' + faP(uid);
          else if (data === 'guide_menu') { await bale('answerCallbackQuery', { callback_query_id: cb.id }); await bale('sendMessage', { chat_id: chatId, text: '🚦 راهنما\n\n🎮 تک‌نفره: پرنده‌پرش\n🎮 دونفره: نبرد واژه‌ها\n🏟️ چندنفره: میزگرد\n\n' + MZ_GUIDE }); return new Response('ok'); }
          else if (data === 'join_check') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            if (await mzCheckMember(env, uid)) await bale('sendMessage', { chat_id: uid, text: '🎉 عضویت تأیید شد!\nمنو: /start' });
            else await bale('sendMessage', { chat_id: uid, text: '❌ هنوز عضو نشدی!' });
            return new Response('ok');
          }
          if (data.indexOf('cb_like:') === 0) {
            const pidU = 'post:' + cb.message.chat.id + ':' + cb.message.message_id;
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            const tester = await isTester(KV, uid);
            const lk = 'lk:' + uid + ':' + pidU;
            if (!tester && (await KV.get(lk))) { await bale('sendMessage', { chat_id: uid, text: '❤️ قبلاً پسندیدی!' }); return new Response('ok'); }
            await KV.put(lk, '1', { expirationTtl: 86400 });
            const stp = await cbPostState(pidU, 'like');
            const lKey = 'likecnt:' + uid + ':' + today;
            const lcnt = parseInt(await KV.get(lKey) || '0');
            let gotCoin = false;
            if (tester || lcnt < 3) { gotCoin = true; if (!tester) await KV.put(lKey, String(lcnt + 1), { expirationTtl: 86400 }); u.coins += 3; await saveUser(uid, u); }
            const elog = (await KV.get('edit_log', 'json')) || [];
            try { const rM = await bale('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: cbMarkedButtons(stp, pidU) }); elog.unshift({ m: 'like', ok: !!(rM && rM.ok), err: (rM && rM.description) || '' }); } catch (e) { elog.unshift({ m: 'like', err: String(e && e.message) }); }
            while (elog.length > 8) elog.pop();
            await KV.put('edit_log', JSON.stringify(elog));
            await bale('sendMessage', { chat_id: uid, text: gotCoin ? ('❤️ +' + fa(3) + ' سکه\n👍 لایک پست: ' + fa(stp.likes) + '\n🪙 موجودی: ' + fa(u.coins)) : ('❤️ لایکت ثبت شد؛ سهمیه امروز تمومه.\n👍 لایک پست: ' + fa(stp.likes)) });
            return new Response('ok');
          }
          if (data === 'cb_sug') {
            await bale('answerCallbackQuery', { callback_query_id: cb.id });
            const pidU = 'post:' + cb.message.chat.id + ':' + cb.message.message_id;
            const adminId = await KV.get('admin_id');
            let fwdOk = false;
            if (adminId) { try { const rf = await bale('forwardMessage', { chat_id: adminId, from_chat_id: cb.message.chat.id, message_id: cb.message.message_id }); fwdOk = !!(rf && rf.ok); } catch (e) {} if (fwdOk) await bale('sendMessage', { chat_id: adminId, text: '📬 پیشنهاد از ' + (cb.from.first_name || 'کاربر') }); }
            const stp2 = await cbPostState(pidU, 'sug');
            const elog2 = (await KV.get('edit_log', 'json')) || [];
            try { const rM2 = await bale('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: cbMarkedButtons(stp2, pidU) }); elog2.unshift({ m: 'sug', ok: !!(rM2 && rM2.ok), err: (rM2 && rM2.description) || '' }); } catch (e) { elog2.unshift({ m: 'sug', err: String(e && e.message) }); }
            while (elog2.length > 8) elog2.pop();
            await KV.put('edit_log', JSON.stringify(elog2));
            const tester = await isTester(KV, uid);
            const cntKey = 'sugcnt:' + uid + ':' + today;
            const cnt = parseInt(await KV.get(cntKey) || '0');
            if (!tester) await KV.put(cntKey, String(cnt + 1), { expirationTtl: 86400 });
            if (tester || cnt < 3) { u.coins += 5; await saveUser(uid, u); await bale('sendMessage', { chat_id: uid, text: '📬 پیشنهاد ' + (fwdOk ? 'رسید ✅' : 'ثبت شد') + ' +' + fa(5) + ' سکه\n🪙 موجودی: ' + fa(u.coins) }); }
            else await bale('sendMessage', { chat_id: uid, text: '📬 پیشنهاد ثبت شد؛ سهمیه امروز تمومه.' });
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
            const isMember = st.ok && ['member','administrator','creator'].includes(st.result.status);
            if (!isMember) msg = '❌ هنوز عضو نشدی!';
            else if (u.claimed[key]) msg = 'قبلاً گرفتی!';
            else { u.claimed[key] = 1; u.coins += 100; await saveUser(uid, u); msg = '✅ +' + fa(100) + ' سکه\n🪙 موجودی: ' + fa(u.coins); }
          }
          else if (data.startsWith('buy_')) {
            const item = SHOP.find(i => i.id === data.slice(4));
            if (!item) msg = 'پیدا نشد!';
            else if (u.items.includes(item.id)) msg = 'قبلاً خریدی!';
            else if (u.coins < item.price) msg = '❌ سکه کافی نیست! ' + fa(item.price - u.coins) + ' دیگه لازمه.';
            else { u.coins -= item.price; u.items.push(item.id); await saveUser(uid, u); msg = '🛍️ خرید موفق: ' + item.name + '\n🪙 موجودی: ' + fa(u.coins); }
          }
          await bale('answerCallbackQuery', { callback_query_id: cb.id });
          if (msg) await bale('sendMessage', { chat_id: chatId, text: msg });
        }
      } catch (e) { console.log('webhook error:', e.message); }
      return new Response('ok');
    }
    return new Response('🎮 Bale Game Server v36 is running!');
  },

  // ============ فاز ۲: Cron مقاوم + ریتم مجله ============
  async scheduled(event, env) {
    const KV = env.GAME_KV;
    const nowIran = new Date(Date.now() + 3.5 * 3600 * 1000);
    const hm = nowIran.getUTCHours() * 60 + nowIran.getUTCMinutes();
    const dow = nowIran.getUTCDay();
    for (const [name, t] of Object.entries(CRON_TASKS)) {
      if (t.dow && !t.dow.includes(dow)) continue;
      if (t.not && t.not.includes(dow)) continue;
      const key = 'cron_next:' + name;
      const last = parseInt(await KV.get(key) || '0');
      const target = t.h * 60 + t.m;
      if (hm >= target && hm < target + 10 && last !== nowIran.getUTCDate() * 10000 + target) {
        await KV.put(key, String(nowIran.getUTCDate() * 10000 + target), { expirationTtl: 172800 });
        try {
          if (t.fn === 'inject') await engineInject(env);
          else if (t.fn === 'ensureLock') await engineEnsureLock(env);
          else if (t.fn === 'morning') await engineMorning(env);
          else if (t.fn === 'evening') await engineEvening(env);
          else if (t.fn === 'nabard') await engineAutoNabard(env);
          else if (t.fn === 'recess') await engineRecess(env, t.open);
          else if (t.fn === 'digest') await engineDigest(env);
          else if (t.fn === 'answer') await cbAnswer(env);
          else if (t.fn === 'bazi_legacy') { const d = new Date(); await cbPost(env, (d.getDate() % 2 === 0) ? 'bazi' : 'ai'); }
          else if (t.fn === 'rotate19') { const sec = (dow === 0 || dow === 4) ? 'crypto' : (dow === 2 ? 'nostalgia' : 'tarfand'); await cbPost(env, sec); }
          else if (t.fn === 'section') await cbPost(env, t.s, { riddle: t.riddle });
        } catch (e) { console.log('engine error', name, e && e.message); }
      }
    }
    const active = (await KV.get('mz_active', 'json')) || [];
    const remaining = [];
    for (const chatId of active) {
      const st = await KV.get('mz:' + chatId, 'json');
      if (!st) continue;
      if (st.phase === 'countdown' && Date.now() > st.startsAt) { await mzStartPlay(env, KV, st, 'mz:' + chatId); remaining.push(chatId); }
      else if (st.phase === 'play' && Date.now() > st.endsAt) {
        st.players.forEach(p => { if (!p.submitted) { p.submitted = true; p.timeBonus = 0; } });
        await mzJudge(env, KV, st); await mzPostResult(env, KV, st);
      }
      else if (st.phase === 'join' && Date.now() - st.createdAt > 300000) { await mzBale(env, 'sendMessage', { chat_id: chatId, text: '😴 میزگرد برگزار نشد؛ کسی شروع نکرد.' }); }
      else if (st.phase === 'result') {
        if (st.court && st.court.length && Date.now() > (st.courtUntil || 0)) { st.court = []; st.courtUntil = 0; await KV.put('mz:' + chatId, JSON.stringify(st)); }
        else remaining.push(chatId);
      }
      else remaining.push(chatId);
    }
    await KV.put('mz_active', JSON.stringify(remaining));
  }
};