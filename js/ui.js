'use strict';
/* =========================================================
   CHIYA — HUD, panels, shop, crew management, codex, quests
   ========================================================= */
const $ = id => document.getElementById(id);
let panel = null, panelTab = null, uiT = 0, crewSel = null;

function uiInit() {
  $('bar').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'home') { player.auto = { x: BREW.x, y: BREW.y }; closePanel(); toast('🏠 Walking home to brew…'); }
    else openPanel(a);
  });
  $('quest').addEventListener('click', () => openPanel('quests'));
  uiTick(1);
}

function uiTick(dt) {
  uiT += dt; if (uiT < .12) return; uiT = 0;
  $('rp').textContent = '₨ ' + fmt(S.rp);
  const cap = capMax(), f = S.doko / cap;
  $('dfill').style.width = Math.min(100, f * 100) + '%';
  $('dfill').className = f >= 1 ? 'full' : '';
  $('dtxt').textContent = `${fmt(S.doko)} / ${fmt(cap)}`;
  const fi = fieldAt(player.x, player.y);
  $('loc').textContent = brewing ? '🍵 Brewing at the teahouse' : fi >= 0 ? `${FIELDS[fi].n} · ×${FIELDS[fi].y}` : dist(player.x, player.y, BREW.x, BREW.y) < 160 ? '🏠 Teahouse' : 'On the trail';
  const bf = [];
  const BI = { haste: '👟', spiceRush: '🌶️', focus: '🎯', roar: '🦁', caravan: '🐂', blessing: '✨', shot_spice: '🧉', shot_ice: '💎', shot_cloud: '🧀', incense: '🪔' };
  for (const k in B) bf.push(`<span class="chip">${BI[k] || '•'}${B[k].st > 1 ? '×' + B[k].st : ''} <b>${Math.ceil(B[k].t)}s</b></span>`);
  $('buffs').innerHTML = bf.join('');
  const q = qProg();
  $('quest').innerHTML = q ? `<span>📜 ${QUESTS[S.quest].t}</span><div class="qbar"><i style="width:${Math.min(100, q.cur / q.goal * 100)}%"></i></div>${q.cur >= q.goal ? '<b class="ready">Claim!</b>' : ''}` : '<span>📜 All quests done. Legend.</span>';
  if (panel === 'shop' || panel === 'crew') refreshCosts();
}

/* ---------------- toast & modal ---------------- */
let toastT = null;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}
function showModal(html) { $('modal').innerHTML = `<div class="mcard">${html}</div>`; $('modal').classList.add('on'); }
function closeModal() { $('modal').classList.remove('on'); }
function showIntro() {
  showModal(`<div class="big-ico">🍵</div><h2>Welcome to Chiya</h2>
  <p>Didi left you her little teahouse at the foot of the mountain. Make it legendary.</p>
  <div class="steps">
  <div>🕹️ <b>Drag anywhere</b> to walk. Your tool gathers automatically in fields.</div>
  <div>👥 Your <b>crew</b> follows you and gathers on their own.</div>
  <div>🫧 Grab the <b>ability bubbles</b> they drop for boosts.</div>
  <div>🧺 Doko full? Tap <b>🏠</b> and stand on the brew mat to turn ingredients into rupees.</div>
  <div>📜 Follow Didi's quests. Recruit crew, unlock higher fields, find synergies.</div></div>
  <button class="btn primary" onclick="closeModal()">Let's brew</button>`);
}

/* ---------------- panels ---------------- */
function openPanel(name, tab) {
  if (panel === name && !tab) { closePanel(); return; }
  panel = name; panelTab = tab || panelTab;
  $('sheet').classList.add('on');
  renderPanel();
}
function closePanel() { panel = null; crewSel = null; $('sheet').classList.remove('on'); }
function renderPanel() {
  const fn = { crew: pCrew, shop: pShop, items: pItems, quests: pQuests, codex: pCodex, map: pMap }[panel];
  if (!fn) return;
  $('sheet').innerHTML = `<div class="grab" onclick="closePanel()"></div><button class="x" onclick="closePanel()">✕</button>` + fn();
}
const tabs = (list, cur, panelName) => `<div class="tabs">${list.map(([id, n]) => `<button class="${cur === id ? 'on' : ''}" onclick="panelTab='${id}';renderPanel()">${n}</button>`).join('')}</div>`;
const rarBadge = r => `<span class="rb" style="--rc:${RAR[r].c}">${RAR[r].n}</span>`;
const colBadge = c => `<span class="cb cb-${c}">${COL[c].i} ${COL[c].n}</span>`;
function afford(cost) { return S.rp >= cost; }
function refreshCosts() {
  document.querySelectorAll('[data-cost]').forEach(b => { b.disabled = !afford(+b.dataset.cost) && !b.dataset.free; });
  const r = document.getElementById('sheetRp'); if (r) r.textContent = '₨ ' + fmt(S.rp);
}

/* --- costs --- */
const permitCost = () => Math.round(150 * Math.pow(1.4, S.recruits));
const bedCost = () => Math.round(400 * Math.pow(1.45, S.beds - 5));
const wheelCost = () => Math.round(3000 * Math.pow(1.3, S.wheels));
const xpNeed = l => Math.round(30 * Math.pow(1.75, l - 1));

/* ---------------- CREW ---------------- */
function pCrew() {
  if (crewSel != null && S.crew[crewSel]) return pCrewDetail(crewSel);
  const free = S.beds - S.crew.length;
  const hasPermit = (S.items.permit || 0) > 0;
  let h = `<h2>👥 Crew <small>${S.crew.length}/${S.beds} beds</small></h2>`;
  h += `<div class="row2">
    <button class="btn primary" ${free ? '' : 'disabled'} ${hasPermit ? 'data-free="1"' : `data-cost="${permitCost()}"`} onclick="doRecruit()">📜 Recruit<small>${hasPermit ? `use permit (${S.items.permit})` : '₨ ' + fmt(permitCost())}</small></button>
    <button class="btn" ${S.beds >= 50 ? 'disabled' : `data-cost="${bedCost()}"`} onclick="buyBed()">🛏️ New bed<small>${S.beds >= 50 ? 'max' : '₨ ' + fmt(bedCost())}</small></button></div>`;
  h += hiveBox();
  const act = SYN.filter(s => D.syn.has(s.id));
  h += `<div class="synrow">${act.length ? act.map(s => `<span class="chip on">${s.i} ${s.n}</span>`).join('') : '<span class="mut">No synergies yet. Check the 📖 Codex for combos.</span>'}</div>`;
  h += `<div class="beds">`;
  for (let i = 0; i < S.beds; i++) {
    const m = S.crew[i];
    if (!m) { h += `<div class="bed empty" onclick="doRecruit()">+</div>`; continue; }
    const d = CREW[m.id];
    h += `<div class="bed ${m.bl ? 'bl' : ''}" style="--rc:${RAR[d.r].c}" onclick="crewSel=${i};renderPanel()"><img src="${portrait(m.id, m.bl)}"><span class="lv">${m.lvl}</span><span class="cdot cb-${d.c}"></span></div>`;
  }
  return h + `</div><p class="mut small">Teahouse grows at 10, 20, 30 and 40 beds. Fields unlock by crew count.</p>`;
}
function hiveBox() {
  const n = S.crew.length, c = D.cnt;
  const bar = ['spice', 'ice', 'cloud'].map(k => `<i class="cb-${k}" style="width:${n ? c[k] / n * 100 : 0}%"></i>`).join('');
  return `<div class="hive"><div class="hbar">${bar}</div>${D.hive ? `<b>${HIVE[D.hive].i} ${HIVE[D.hive].n}</b><span class="mut small">${HIVE[D.hive].d}</span>` : `<span class="mut small">Teahouse color: none yet. Make 50%+ of your crew one color (8+ crew) to unlock Spice, Ice or Cloud bonuses.</span>`}</div>`;
}
function pCrewDetail(i) {
  const m = S.crew[i], d = CREW[m.id], need = xpNeed(m.lvl), ab = d.ab ? ABIL[d.ab] : null;
  let h = `<button class="back" onclick="crewSel=null;renderPanel()">‹ Crew</button>`;
  h += `<div class="cdet ${m.bl ? 'bl' : ''}" style="--rc:${RAR[d.r].c}"><img src="${portrait(m.id, m.bl)}"><div>
    <h2>${m.bl ? '😇 ' : ''}${d.n}</h2><div>${rarBadge(d.r)} ${colBadge(d.c)}</div><p class="mut small">${d.d}</p></div></div>`;
  h += `<div class="lvl"><b>Level ${m.lvl}</b>${m.lvl < 20 ? `<div class="qbar"><i style="width:${m.xp / need * 100}%"></i></div><span class="mut small">${fmt(m.xp)} / ${fmt(need)} bond</span>` : '<span class="mut small">Max level</span>'}</div>`;
  h += `<div class="stats">
    <div><span>Gather</span><b>${(d.amt * lvlMult(m)).toFixed(1)}</b></div><div><span>Speed</span><b>${d.spd}</b></div>
    <div><span>Every</span><b>${d.gt}s</b></div><div><span>Brewing</span><b>${(d.brew * lvlMult(m)).toFixed(1)}/s</b></div></div>`;
  if (ab) h += `<div class="abil"><b>${ab.i} ${ab.n}</b> <span class="mut small">every ${d.cd}s</span><p class="small">${ab.d}</p></div>`;
  if (d.pas) h += `<div class="abil"><b>Passive</b><p class="small">${d.pas}</p></div>`;
  h += `<div class="abil ${m.bl ? 'gold' : ''}"><b>😇 Blessed passive</b> <span class="mut small">${m.bl ? 'active' : 'locked'}</span><p class="small">+${d.bp[1]}% ${STATN[d.bp[0]]} for the whole teahouse</p></div>`;
  h += `<h3>Feed <small class="mut">favorite: ${FOOD[d.fav].i} ${FOOD[d.fav].n} (×3)</small></h3><div class="row3">`;
  for (const f in FOOD) h += `<button class="btn ${f === d.fav ? 'fav' : ''}" ${(S.items[f] || 0) && m.lvl < 20 ? '' : 'disabled'} onclick="feed(${i},'${f}')">${FOOD[f].i} ${S.items[f] || 0}<small>+${FOOD[f].xp * (f === d.fav ? 3 : 1)}</small></button>`;
  h += `</div><div class="row2">
    <button class="btn" ${(S.items.mysticWheel || 0) ? '' : 'disabled'} onclick="reroll(${i})">🎡 Mystic Wheel<small>reroll (${S.items.mysticWheel || 0})${m.bl ? ' · loses Blessed' : ''}</small></button>
    <button class="btn gold" ${(S.items.goldenMomo || 0) && !m.bl ? '' : 'disabled'} onclick="bless(${i})">🌟 Golden Momo<small>${m.bl ? 'already Blessed' : `make Blessed (${S.items.goldenMomo || 0})`}</small></button></div>`;
  return h;
}
const STATN = { cap: 'doko capacity', gather: 'all gathering', spice: 'Spice gathering', ice: 'Ice gathering', cloud: 'Cloud gathering', brew: 'brewing value', speed: 'move speed', crit: 'crit chance', offline: 'offline earnings', tool: 'tool gathering' };

function rollOdds(odds) { let r = Math.random(), acc = 0; for (const k in odds) { acc += odds[k]; if (r < acc) return k; } return Object.keys(odds)[1]; }
function rollCrew(odds) { const r = rollOdds(odds); return pick(CREW_IDS.filter(id => CREW[id].r === r)); }
const blessChance = () => Math.min(.15, .01 + .03 * (D.k.lama || 0));
function doRecruit() {
  if (S.crew.length >= S.beds) { toast('🛏️ No free bed. Buy a new one first.'); return; }
  if ((S.items.permit || 0) > 0) S.items.permit--;
  else { const c = permitCost(); if (S.rp < c) { toast('Not enough rupees'); return; } S.rp -= c; S.recruits++; }
  const id = rollCrew(PERMIT_ODDS), bl = Math.random() < blessChance();
  addCrew(id, bl);
}
function addCrew(id, bl) {
  const isNew = !S.found[id]; S.found[id] = true;
  S.crew.push(mk(id, bl)); rebuildCrew();
  const e = E.crew[E.crew.length - 1]; e.x = player.x; e.y = player.y - 10;
  burst(player.x, player.y - 20, 30, { type: 'star', col: RAR[CREW[id].r].c, spd: 160, life: 1, size: 2.6 });
  reveal(id, bl, isNew); save(); if (panel) renderPanel();
}
function reveal(id, bl, isNew, title) {
  const d = CREW[id];
  showModal(`<div class="reveal" style="--rc:${RAR[d.r].c}"><div class="burst"></div><img src="${portrait(id, bl)}"></div>
    ${isNew ? '<div class="new">NEW!</div>' : ''}<h2>${bl ? '😇 Blessed ' : ''}${d.n}</h2><div>${rarBadge(d.r)} ${colBadge(d.c)}</div>
    <p class="mut small">${d.ab ? ABIL[d.ab].i + ' ' + ABIL[d.ab].n + ': ' + ABIL[d.ab].d : d.pas || d.d}</p>
    <button class="btn primary" onclick="closeModal()">${title || 'Welcome aboard'}</button>`);
}
function buyBed() { const c = bedCost(); if (S.rp < c || S.beds >= 50) return; S.rp -= c; S.beds++; recompute(); toast(`🛏️ Bed ${S.beds} added`); if ([10, 20, 30, 40].includes(S.beds)) { toast('🏡 Your teahouse grew!'); shake(6); burst(HOUSE.x, HOUSE.y - 60, 60, { type: 'star', col: '#ffd24a', spd: 220, life: 1.4, size: 3 }); } save(); renderPanel(); }
function feed(i, f) {
  const m = S.crew[i], d = CREW[m.id];
  if (!(S.items[f] > 0) || m.lvl >= 20) return;
  S.items[f]--; S.stats.feed++;
  m.xp += FOOD[f].xp * (f === d.fav ? 3 : 1);
  let up = false;
  while (m.lvl < 20 && m.xp >= xpNeed(m.lvl)) { m.xp -= xpNeed(m.lvl); m.lvl++; up = true; }
  if (m.lvl >= 20) m.xp = 0;
  const e = E.crew.find(x => x.m === m);
  if (e) { burst(e.x, e.y - 20, up ? 20 : 6, { type: up ? 'star' : 'heart', col: '#ffd24a', spd: 70, life: 1, size: up ? 2.6 : 4, g: -40 }); if (up) pop(e.x, e.y - 50, 'LEVEL ' + m.lvl + '!', '#ffd24a', true); }
  if (up) toast(`⬆️ ${d.n} reached level ${m.lvl}!`);
  renderPanel();
}
function reroll(i) {
  if (!(S.items.mysticWheel > 0)) return;
  S.items.mysticWheel--;
  const m = S.crew[i], id = rollCrew(WHEEL_ODDS), bl = Math.random() < blessChance();
  const isNew = !S.found[id]; S.found[id] = true;
  m.id = id; m.bl = bl; rebuildCrew(); save();
  reveal(id, bl, isNew, 'Nice'); renderPanel();
}
function bless(i) {
  const m = S.crew[i]; if (!(S.items.goldenMomo > 0) || m.bl) return;
  S.items.goldenMomo--; m.bl = true; rebuildCrew(); save();
  const e = E.crew.find(x => x.m === m); if (e) { burst(e.x, e.y - 20, 50, { type: 'star', col: '#ffd24a', spd: 200, life: 1.4, size: 3 }); E.decals.push({ kind: 'ring', x: e.x, y: e.y, r: 90, col: '#ffd24a', age: 0, dur: .7, w: 6 }); }
  reveal(m.id, true, false, 'Blessed!'); renderPanel();
}

/* ---------------- SHOP ---------------- */
function pShop() {
  const t = panelTab && ['tools', 'dokos', 'boots', 'supplies', 'lodge'].includes(panelTab) ? panelTab : 'tools';
  let h = `<h2>🛒 Bazaar <small id="sheetRp">₨ ${fmt(S.rp)}</small></h2>` + tabs([['tools', 'Tools'], ['dokos', 'Dokos'], ['boots', 'Boots'], ['supplies', 'Supplies'], ['lodge', 'Lodge']], t);
  const gear = (list, owned, cur, key, stat) => list.map(it => {
    const own = owned.includes(it.id), eq = cur === it.id;
    return `<div class="item ${eq ? 'eq' : ''}"><div class="ii">${it.i}</div><div class="it"><b>${it.n}</b><span class="mut small">${stat(it)}</span></div>
      ${eq ? '<span class="tag">Equipped</span>' : own ? `<button class="btn sm" onclick="equip('${key}','${it.id}')">Equip</button>` : `<button class="btn sm primary" data-cost="${it.cost}" ${afford(it.cost) ? '' : 'disabled'} onclick="buyGear('${key}','${it.id}')">₨ ${fmt(it.cost)}</button>`}</div>`;
  }).join('');
  if (t === 'tools') h += gear(TOOLS, S.tools, S.tool, 'tool', it => `Reach ${it.r} · ${it.amt} per tile · every ${it.sw}s${it.col ? ' · ' + COL[it.col].i + ' +60%' : ''}${it.crit ? ' · +10% crit' : ''}`);
  if (t === 'dokos') h += gear(DOKOS, S.dokos, S.dokoId, 'doko', it => `Holds ${fmt(it.cap)}`);
  if (t === 'boots') h += gear(BOOTS, S.bootsOwned, S.boots, 'boots', it => `Speed ${it.spd}`);
  if (t === 'supplies') {
    h += `<div class="item"><div class="ii">📜</div><div class="it"><b>Trekking Permit</b><span class="mut small">Recruit a crew member (price rises)</span></div><button class="btn sm primary" data-cost="${permitCost()}" onclick="buyItem('permit',${permitCost()})">₨ ${fmt(permitCost())}</button></div>`;
    h += `<div class="item"><div class="ii">🎡</div><div class="it"><b>Mystic Wheel</b><span class="mut small">Reroll a crew member, no Commons</span></div><button class="btn sm primary" data-cost="${wheelCost()}" onclick="buyItem('mysticWheel',${wheelCost()})">₨ ${fmt(wheelCost())}</button></div>`;
    for (const k of ['momo', 'selroti', 'dalbhat', 'butterTea', 'spiceShot', 'glacierShard', 'yakCheese', 'incense', 'goldenMomo']) {
      const it = ITEMS[k];
      h += `<div class="item"><div class="ii">${it.i}</div><div class="it"><b>${it.n} <small class="mut">×${S.items[k] || 0}</small></b><span class="mut small">${it.d}</span></div><div class="buyrow"><button class="btn sm primary" data-cost="${it.price}" onclick="buyItem('${k}',${it.price})">₨ ${fmt(it.price)}</button>${it.price * 10 < 1e9 ? `<button class="btn sm" data-cost="${it.price * 10}" onclick="buyItem('${k}',${it.price * 10},10)">×10</button>` : ''}</div></div>`;
    }
  }
  if (t === 'lodge') {
    h += `<p class="mut small">Your lodge manager keeps the teahouse running while the app is closed. Offline earnings are based on your recent income, up to 12 hours.</p>`;
    LODGE.forEach((l, i) => {
      h += `<div class="item ${S.lodge === i ? 'eq' : ''}"><div class="ii">🧑‍🍳</div><div class="it"><b>${l.n}</b><span class="mut small">${Math.round(l.eff * 100)}% offline efficiency</span></div>${S.lodge >= i ? '<span class="tag">' + (S.lodge === i ? 'Current' : 'Done') + '</span>' : S.lodge === i - 1 ? `<button class="btn sm primary" data-cost="${l.cost}" onclick="buyLodge(${i})">₨ ${fmt(l.cost)}</button>` : '<span class="tag dim">Locked</span>'}</div>`;
    });
    h += `<p class="mut small">Recent income: ₨ ${fmt(S.rate)}/s</p>`;
  }
  return h;
}
function buyGear(key, id) {
  const list = { tool: TOOLS, doko: DOKOS, boots: BOOTS }[key], it = list.find(x => x.id === id);
  if (S.rp < it.cost) return;
  S.rp -= it.cost;
  ({ tool: S.tools, doko: S.dokos, boots: S.bootsOwned })[key].push(id);
  equip(key, id); toast(`${it.i} ${it.n} bought!`); save();
}
function equip(key, id) { if (key === 'tool') S.tool = id; if (key === 'doko') S.dokoId = id; if (key === 'boots') S.boots = id; renderPanel(); }
function buyItem(k, cost, n = 1) {
  if (S.rp < cost) return; S.rp -= cost; S.items[k] = (S.items[k] || 0) + n;
  if (k === 'permit') S.recruits++; if (k === 'mysticWheel') S.wheels++;
  toast(`${ITEMS[k].i} +${n} ${ITEMS[k].n}`); renderPanel();
}
function buyLodge(i) { const l = LODGE[i]; if (S.rp < l.cost) return; S.rp -= l.cost; S.lodge = i; toast(`🧑‍🍳 Hired: ${l.n}`); save(); renderPanel(); }

/* ---------------- ITEMS ---------------- */
function pItems() {
  let h = `<h2>🎒 Items</h2>`;
  const keys = Object.keys(ITEMS).filter(k => S.items[k] > 0);
  if (!keys.length) return h + '<p class="mut">Empty. Buy supplies at the 🛒 Bazaar.</p>';
  h += keys.map(k => {
    const it = ITEMS[k];
    const action = it.use ? `<button class="btn sm primary" onclick="useItem('${k}')">Use</button>` : FOOD[k] ? `<button class="btn sm" onclick="openPanel('crew')">Feed</button>` : k === 'permit' ? `<button class="btn sm" onclick="doRecruit()">Recruit</button>` : `<button class="btn sm" onclick="openPanel('crew')">Crew</button>`;
    return `<div class="item"><div class="ii">${it.i}</div><div class="it"><b>${it.n} <small class="mut">×${S.items[k]}</small></b><span class="mut small">${it.d}</span></div>${action}</div>`;
  }).join('');
  return h;
}
function useItem(k) {
  if (!(S.items[k] > 0)) return; S.items[k]--;
  if (k === 'butterTea') { addBuff('haste', 30, 3); B.haste.st = Math.max(B.haste.st, 3); }
  if (k === 'spiceShot') addBuff('shot_spice', 60);
  if (k === 'glacierShard') addBuff('shot_ice', 60);
  if (k === 'yakCheese') addBuff('shot_cloud', 60);
  if (k === 'incense') addBuff('incense', 60);
  ring(player.x, player.y, 80, '#ffd24a', .5, 5);
  burst(player.x, player.y - 20, 24, { type: 'star', col: '#fff1a8', spd: 120, life: .9, size: 2.4 });
  toast(`${ITEMS[k].i} ${ITEMS[k].n} active!`); renderPanel();
}

/* ---------------- QUESTS ---------------- */
function qProg() {
  const q = QUESTS[S.quest]; if (!q) return null;
  const [type, a, b] = q.g;
  switch (type) {
    case 'gather': return { cur: S.stats.gather - S.qBase, goal: a };
    case 'earn': return { cur: S.stats.earn - S.qBase, goal: a };
    case 'feed': return { cur: S.stats.feed - S.qBase, goal: a };
    case 'field': return { cur: (S.stats.field[a] || 0) - S.qBase, goal: b };
    case 'crew': return { cur: S.crew.length, goal: a };
    case 'tool': return { cur: S.tools.includes(a) ? 1 : 0, goal: 1 };
    case 'level': return { cur: Math.max(...S.crew.map(m => m.lvl)), goal: a };
    case 'syn': return { cur: D.syn.size, goal: a };
    case 'blessed': return { cur: S.crew.filter(m => m.bl).length, goal: a };
  }
}
function qBaseFor(i) {
  const q = QUESTS[i]; if (!q) return 0;
  const [type, a] = q.g;
  return type === 'gather' ? S.stats.gather : type === 'earn' ? S.stats.earn : type === 'feed' ? S.stats.feed : type === 'field' ? (S.stats.field[a] || 0) : 0;
}
const rwText = rw => [rw.rp ? '₨ ' + fmt(rw.rp) : '', ...Object.entries(rw.items || {}).map(([k, n]) => `${ITEMS[k].i} ×${n}`), rw.crew ? `${RAR[CREW[rw.crew].r].n} crew: ${CREW[rw.crew].n}` : ''].filter(Boolean).join(' · ');
function pQuests() {
  let h = `<h2>📜 Didi's requests</h2>`;
  const q = QUESTS[S.quest];
  if (!q) return h + '<p>You did everything Didi ever asked. The mountain knows your name. 🙏</p>';
  const p = qProg(), done = p.cur >= p.goal, needBed = q.rw.crew && S.crew.length >= S.beds;
  h += `<div class="quest"><div class="qn">Quest ${S.quest + 1} / ${QUESTS.length}</div><h3>${q.t}</h3>
    <div class="qbar big"><i style="width:${Math.min(100, p.cur / p.goal * 100)}%"></i></div><div class="mut small">${fmt(Math.min(p.cur, p.goal))} / ${fmt(p.goal)}</div>
    <div class="rw">🎁 ${rwText(q.rw)}</div>
    <button class="btn primary" ${done && !needBed ? '' : 'disabled'} onclick="claimQuest()">${needBed ? 'Needs a free bed' : done ? 'Claim reward' : 'In progress'}</button></div>`;
  const nx = QUESTS.slice(S.quest + 1, S.quest + 4);
  if (nx.length) h += `<h3 class="mut">Coming up</h3>` + nx.map(x => `<div class="item dim"><div class="ii">🔒</div><div class="it"><b>${x.t}</b><span class="mut small">🎁 ${rwText(x.rw)}</span></div></div>`).join('');
  return h;
}
function claimQuest() {
  const q = QUESTS[S.quest], p = qProg(); if (!q || p.cur < p.goal) return;
  if (q.rw.crew && S.crew.length >= S.beds) return;
  if (q.rw.rp) { S.rp += q.rw.rp; }
  for (const k in q.rw.items || {}) S.items[k] = (S.items[k] || 0) + q.rw.items[k];
  S.quest++; S.qBase = qBaseFor(S.quest);
  burst(player.x, player.y - 30, 40, { type: 'star', col: '#ffd24a', spd: 200, life: 1.2, size: 3 });
  if (q.rw.crew) { addCrew(q.rw.crew, false); return; }
  toast(`🎁 ${rwText(q.rw)}`); save(); renderPanel();
}

/* ---------------- CODEX ---------------- */
function pCodex() {
  const t = panelTab && ['crewdex', 'syn', 'colors'].includes(panelTab) ? panelTab : 'crewdex';
  let h = `<h2>📖 Codex</h2>` + tabs([['crewdex', 'Crew'], ['syn', 'Synergies'], ['colors', 'Teahouse colors']], t);
  if (t === 'crewdex') {
    const found = CREW_IDS.filter(id => S.found[id]).length;
    h += `<p class="mut small">Found ${found} / ${CREW_IDS.length}. Recruit with permits, reroll with Mystic Wheels. Event crew come from quests.</p>`;
    ['common', 'rare', 'epic', 'legendary', 'mythic', 'event'].forEach(r => {
      h += `<h3 style="color:${RAR[r].c}">${RAR[r].n}${PERMIT_ODDS[r] ? ` <small class="mut">${(PERMIT_ODDS[r] * 100).toFixed(1)}% per permit</small>` : ''}</h3>`;
      CREW_IDS.filter(id => CREW[id].r === r).forEach(id => {
        const d = CREW[id], f = S.found[id];
        h += `<div class="dex ${f ? '' : 'unfound'}" style="--rc:${RAR[r].c}"><img src="${portrait(id)}"><div><b>${d.n}</b> ${colBadge(d.c)}
          <div class="small">${d.ab ? `${ABIL[d.ab].i} <b>${ABIL[d.ab].n}</b>: ${ABIL[d.ab].d}` : d.pas || 'No ability. Pure hard work.'}</div>
          <div class="mut small">Favorite: ${FOOD[d.fav].i} · Blessed: +${d.bp[1]}% ${STATN[d.bp[0]]}</div></div></div>`;
      });
    });
  }
  if (t === 'syn') {
    h += `<p class="mut small">Synergies activate automatically when the right crew live in your teahouse. ${D.syn.size} / ${SYN.length} active.</p>`;
    h += SYN.map(s => `<div class="syn ${D.syn.has(s.id) ? 'on' : ''}"><div class="si">${s.i}</div><div><b>${s.n}</b> ${D.syn.has(s.id) ? '<span class="tag">Active</span>' : ''}<div class="small"><span class="mut">Needs:</span> ${s.req}</div><div class="small">${s.d}</div></div></div>`).join('');
  }
  if (t === 'colors') {
    h += `<p class="mut small">When at least half of your crew (8+ crew) share a color, your teahouse takes on that color. Each one plays differently.</p>` + hiveBox();
    h += Object.entries(HIVE).map(([k, v]) => `<div class="syn ${D.hive === k ? 'on' : ''}"><div class="si">${v.i}</div><div><b>${v.n}</b><div class="small">${v.d}</div></div></div>`).join('');
    h += `<p class="mut small">Crew gather ×1.5 on tiles of their own color. Neutral crew get ×1.15 everywhere.</p>`;
  }
  return h;
}

/* ---------------- MAP ---------------- */
function pMap() {
  let h = `<h2>🗺️ Mountain map</h2><p class="mut small">Tap Go to walk there. Higher fields give more per tile.</p>`;
  h += `<div class="item"><div class="ii">🏠</div><div class="it"><b>Teahouse</b><span class="mut small">Brew your doko here</span></div><button class="btn sm" onclick="goTo(${BREW.x},${BREW.y})">Go</button></div>`;
  FIELDS.forEach((f, i) => {
    const open = fieldOpen(i);
    h += `<div class="item ${open ? '' : 'dim'}"><div class="ii"><span class="cdot big cb-${f.c === 'mix' ? 'mix' : f.c}"></span></div><div class="it"><b>${f.n} <small class="mut">×${f.y}</small></b><span class="mut small">${f.c === 'mix' ? '🌈 Mixed colors' : COL[f.c].i + ' ' + COL[f.c].n} · ${open ? 'Open' : '🔒 ' + f.gate + ' crew'}</span></div>${open ? `<button class="btn sm" onclick="goTo(${f.x + f.w / 2},${f.yy + f.h / 2})">Go</button>` : ''}</div>`;
  });
  return h;
}
function goTo(x, y) { player.auto = { x, y }; closePanel(); }
